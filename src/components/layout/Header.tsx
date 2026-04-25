'use client';

import { useState } from 'react';

export function Header() {
  const [showBanner, setShowBanner] = useState(false);

  const navItems = [
    { label: 'Dashboard', active: true },
    { label: 'Basins',    active: false },
    { label: 'Wells',     active: false },
    { label: 'Reports',   active: false },
  ];

  function handleRoadmapClick() {
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 2500);
  }

  return (
    <header
      className="relative flex-none h-12 flex items-center px-6 gap-6 z-10"
      style={{
        background: '#060f1a',
        borderBottom: '1px solid #142030',
        boxShadow: '0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 select-none shrink-0">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-white font-black text-xs leading-none"
          style={{ background: '#14b8a6' }}
        >
          ⚡
        </div>
        <span className="font-semibold text-white text-sm tracking-tight">
          Field<span style={{ color: '#14b8a6' }}>Signal</span>
          <span className="text-slate-600 font-normal text-xs ml-1">AI</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-0">
        {navItems.map(({ label, active }) => (
          <a
            key={label}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (!active) handleRoadmapClick();
            }}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              active
                ? 'text-teal-300 font-medium'
                : 'text-slate-600 hover:text-slate-500 cursor-not-allowed select-none'
            }`}
          >
            {label}
          </a>
        ))}
      </nav>

      {/* Roadmap banner */}
      {showBanner && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 text-xs text-slate-400 px-4 py-2 rounded-lg shadow-xl whitespace-nowrap pointer-events-none"
          style={{
            background: '#0e1f31',
            border: '1px solid #1d3a52',
          }}
        >
          This prototype focuses on the Dashboard — other views are roadmap.
        </div>
      )}

      <div className="flex-1" />

      {/* Right side — minimal status */}
      <div className="flex items-center gap-4">
        <span className="hidden sm:block text-[10px] text-slate-600 select-none tracking-wide">
          EIA · 2024
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600 select-none">
          <span className="w-1.5 h-1.5 bg-teal-500/70 rounded-full" />
          Live
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold cursor-pointer select-none transition-colors hover:opacity-90"
          style={{ background: '#0d9488' }}
        >
          V
        </div>
      </div>
    </header>
  );
}
