import Link from "next/link";

const links = [{ href: "/movies", label: "Catálogo" }];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/5 bg-background/90 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-8">
        <Link href="/" className="text-2xl font-black tracking-tight text-brand">
          NETFLIX<span className="ml-1 text-sm font-semibold text-muted">graph</span>
        </Link>
        <ul className="flex gap-6 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-foreground/80 transition-colors hover:text-foreground">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
