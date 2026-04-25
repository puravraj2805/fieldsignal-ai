import Anthropic from '@anthropic-ai/sdk';

export interface AnalystContext {
  yearRange: { min: number; max: number };
  topOilState: string;
  totalOilLatest: number;
  yoyOilGrowth: number | null;
  projected2028Oil: number | null;
  statesTracked: number;
  focusedState?: string | null;
}

interface RequestBody {
  question: string;
  context: AnalystContext;
}

const SYSTEM_PROMPT = `You are FieldSignal AI, a concise energy analyst assistant for U.S. oil and gas production.
You have been given a structured summary of live EIA (Energy Information Administration) data visible on the user's dashboard.

Rules:
- Ground every answer in the provided dashboard context. Never invent precise numbers not in the context.
- If focusedState is set, treat it as the primary state the analyst is drilling into — mention it explicitly when relevant.
- Separate "Data-backed facts" (derived directly from the metrics) from "Model inference" (your interpretation).
- Be concise — this is a dashboard panel, not a research report. Aim for 3-6 bullet points total.
- Always end with a short "Recommendation" of 1-2 sentences.
- Use plain language; avoid jargon unless the user uses it first.

Response format (always use these exact headings):
**Data-backed facts:**
- ...

**Model inference:**
- ...

**Recommendation:**
...`;

function buildUserMessage(question: string, ctx: AnalystContext): string {
  const yoy =
    ctx.yoyOilGrowth !== null ? `${ctx.yoyOilGrowth >= 0 ? '+' : ''}${ctx.yoyOilGrowth}%` : 'N/A';
  const proj =
    ctx.projected2028Oil !== null
      ? `${Math.round(ctx.projected2028Oil).toLocaleString()} Kbbl`
      : 'N/A';

  const focusLine = ctx.focusedState
    ? `\n- Currently drilled-into state (focusedState): ${ctx.focusedState}`
    : '';

  return `Dashboard context:
- Year range filter: ${ctx.yearRange.min}–${ctx.yearRange.max}
- States tracked in EIA dataset: ${ctx.statesTracked}
- Top oil-producing state: ${ctx.topOilState}
- Total U.S. oil production (latest year): ${Math.round(ctx.totalOilLatest).toLocaleString()} Kbbl
- Year-over-year oil growth: ${yoy}
- CAGR-model projected 2028 oil output: ${proj}${focusLine}

User question: ${question}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY is not configured on the server.' },
      { status: 503 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { question, context } = body;
  if (!question || typeof question !== 'string' || question.trim() === '') {
    return Response.json({ error: 'question must be a non-empty string.' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(question.trim(), context) }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
    cancel() {
      stream.controller.abort();
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
