"use client";

import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = document.createElement("div");
    container.className = "w-full h-full flex flex-col items-center justify-center text-center p-8";
    container.innerHTML = `
      <div class="text-7xl mb-6 opacity-60">🐉</div>
      <div class="text-xl font-medium mb-2 text-[var(--color-text-primary)]">Dragon Island</div>
      <div class="text-sm text-[var(--color-text-muted)] mb-6">Game canvas</div>
      <div class="flex gap-3">
        <button class="px-5 py-2.5 bg-[#22c55e] text-white rounded-lg text-sm font-medium hover:bg-[#16a34a] transition-colors">
          ⚔️ Chiến đấu
        </button>
        <button class="px-5 py-2.5 bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-lg text-sm font-medium hover:border-[var(--color-border-hover)] transition-colors">
          🌱 Thu hoạch
        </button>
      </div>
    `;
    
    if (containerRef.current) {
      containerRef.current.appendChild(container);
    }

    return () => {
      if (containerRef.current && container.parentNode === containerRef.current) {
        containerRef.current.removeChild(container);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
