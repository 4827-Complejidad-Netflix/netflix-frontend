/** Marca propia: un pequeño grafo usuario–película dentro de una insignia con degradado. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#2fd4e8" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-bg)" />
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <line x1="10" y1="11" x2="21" y2="9" />
        <line x1="10" y1="11" x2="22" y2="21" />
        <line x1="11" y1="22" x2="22" y2="21" />
        <line x1="21" y1="9" x2="22" y2="21" />
      </g>
      <circle cx="10" cy="11" r="3.2" fill="#fff" />
      <circle cx="21" cy="9" r="2.4" fill="#fff" />
      <circle cx="22" cy="21" r="3.2" fill="#fff" />
      <circle cx="11" cy="22" r="2.4" fill="#fff" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-bold tracking-tight">
        Cine<span className="text-brand-gradient">Graph</span>
      </span>
    </span>
  );
}
