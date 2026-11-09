"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/movies", label: "Catálogo" },
  { href: "/users", label: "Usuarios" },
  { href: "/graph", label: "Grafo" },
  { href: "/graph/communities", label: "Comunidades" },
];

// El enlace activo es el de prefijo más largo, así /graph/communities no marca también /graph.
function activeHref(pathname: string): string | undefined {
  return links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

/** Lista de enlaces sin estado activo; sirve de fallback mientras se conoce la ruta. */
export function NavLinkList({ active }: { active?: string }) {
  return (
    <ul className="flex gap-1 overflow-x-auto text-sm">
      {links.map((link) => {
        const isActive = link.href === active;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`block whitespace-nowrap rounded-full px-3 py-1.5 transition-colors ${
                isActive
                  ? "bg-white/10 font-medium text-foreground ring-1 ring-white/15"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function NavLinks() {
  return <NavLinkList active={activeHref(usePathname())} />;
}
