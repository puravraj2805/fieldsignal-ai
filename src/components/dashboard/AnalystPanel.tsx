'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import type { AnalystContext } from '@/app/api/analyst/route';

interface Props {
  context: AnalystContext;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  streaming?: boolean;
}

const GREETING: Message = {
  role: 'assistant',
  text: "Hello! I'm your FieldSignal energy analyst. Ask me about production trends, top states, year-over-year changes, or what the forecast suggests.",
};

const SUGGESTED_QUESTIONS = [
  'Is our dependence on Texas a risk through 2028?',
  'Which state looks best for growth-focused investment?',
  'How should we diversify across states over the next 5 years?',
];

export function AnalystPanel({ context }: Props) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendQuestion(question: string) {
    if (!question || loading) return;

    setInput('');
    setApiUnavailable(false);
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: 'assistant', text: '', streaming: true },
    ]);

    try {
      const res = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });

      if (res.status === 503) {
        setApiUnavailable(true);
        setMessages((prev) => prev.slice(0, -1));
        setLoading(false);
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.streaming) {
            next[next.length - 1] = { ...last, text: last.text + chunk };
          }
          return next;
        });
      }

      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.streaming) {
          next[next.length - 1] = { ...last, streaming: false };
        }
        return next;
      });
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendQuestion(input.trim());
  }

  const showChips = messages.length === 1 && !loading;

  return (
    <div
      className="rounded-xl flex flex-col overflow-hidden"
      style={{
        background: 'var(--fs-surface-hi)',
        border: '1px solid rgba(29,58,82,0.5)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid rgba(29,58,82,0.4)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-[10px] text-white font-bold leading-none shrink-0">
            A
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-200 leading-none">AI Analyst</h2>
            <p className="text-[10px] text-slate-600 mt-0.5 leading-none">FieldSignal · Claude</p>
          </div>
        </div>
        <span
          className="text-[10px] text-slate-500 px-2.5 py-1 rounded-full tabular-nums"
          style={{ background: 'rgba(6,15,26,0.5)', border: '1px solid rgba(29,58,82,0.4)' }}
        >
          {context.yearRange.min}–{context.yearRange.max}
          {context.focusedState && (
            <> · <span className="text-teal-400/70">{context.focusedState}</span></>
          )}
        </span>
      </div>

      {/* Message thread */}
      <div
        ref={scrollRef}
        className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto min-h-48"
      >
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="flex gap-2 justify-end items-start">
              <div
                className="rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs text-slate-200 max-w-[90%] leading-relaxed"
                style={{ background: '#162a3e' }}
              >
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex gap-2.5 items-start">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] text-teal-400 font-bold mt-0.5"
                style={{
                  background: 'rgba(20,184,166,0.1)',
                  border: '1px solid rgba(20,184,166,0.25)',
                }}
              >
                A
              </div>
              <div
                className="rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-xs text-slate-300 max-w-[90%] leading-relaxed whitespace-pre-wrap"
                style={{ background: 'rgba(14,31,49,0.7)' }}
              >
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-3 bg-teal-400 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          )
        )}

        {/* Suggested question chips — visible only on empty conversation */}
        {showChips && (
          <div className="flex flex-col gap-1.5 mt-2">
            <p className="text-[9px] text-slate-700 uppercase tracking-widest px-0.5">
              Suggested
            </p>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendQuestion(q)}
                className="text-left text-[11px] text-slate-400 hover:text-teal-300 rounded-full px-4 py-2 transition-colors leading-snug"
                style={{
                  border: '1px solid rgba(29,58,82,0.6)',
                  background: 'transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(20,184,166,0.35)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(29,58,82,0.6)';
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {apiUnavailable && (
          <div
            className="text-xs text-rose-400 rounded-lg px-3.5 py-2.5"
            style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)' }}
          >
            Analyst unavailable — ANTHROPIC_API_KEY not configured on the server.
          </div>
        )}
      </div>

      {/* Input area — hidden when API is unavailable */}
      {!apiUnavailable && (
        <form onSubmit={handleSubmit} className="px-5 pb-4 pt-3 shrink-0">
          <div
            className={`flex items-center gap-3 pb-1.5 border-b transition-colors ${
              loading ? 'border-teal-500/30' : 'border-[#1d3a52]/60'
            }`}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about trends, outliers, investment signals…"
              disabled={loading}
              className="flex-1 bg-transparent text-xs text-slate-300 placeholder-[#2d4a62] outline-none disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={loading || input.trim() === ''}
              className="text-teal-400 text-xs font-medium shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:text-teal-300 transition-colors"
            >
              {loading ? '…' : 'Send'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
