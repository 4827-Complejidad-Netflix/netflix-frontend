import Link from "next/link";
import { Suspense } from "react";
import Logo from "./Logo";
import NavLinks, { NavLinkList } from "./NavLinks";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:gap-10 sm:px-8">
        <Link href="/" aria-label="Inicio" className="shrink-0">
          <Logo />
        </Link>
        {/* usePathname es dato de ejecución: el fallback permite prerenderizar la barra sin estado activo. */}
        <Suspense fallback={<NavLinkList />}>
          <NavLinks />
        </Suspense>
      </nav>
    </header>
  );
}
