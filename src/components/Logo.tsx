/** Insignia monocroma con un pequeño grafo usuario–película. */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#fff" />
      <g stroke="#000" strokeWidth="1.6" strokeLinecap="round">
        <line x1="10" y1="11" x2="21" y2="9" />
        <line x1="10" y1="11" x2="22" y2="21" />
        <line x1="11" y1="22" x2="22" y2="21" />
        <line x1="21" y1="9" x2="22" y2="21" />
      </g>
      <circle cx="10" cy="11" r="3.2" fill="#000" />
      <circle cx="21" cy="9" r="2.4" fill="#000" />
      <circle cx="22" cy="21" r="3.2" fill="#000" />
      <circle cx="11" cy="22" r="2.4" fill="#000" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg tracking-tight">
        <span className="font-semibold">netflix</span>
        <span className="font-light text-muted">graph</span>
      </span>
    </span>
  );
}
