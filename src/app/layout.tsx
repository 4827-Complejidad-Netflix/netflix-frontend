import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Netflix Graph Recommender",
    template: "%s · Netflix Graph Recommender",
  },
  description: "Sistema de recomendación de películas basado en grafos (MovieLens).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted sm:px-8">
          Pósters de{" "}
          <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
      </body>
    </html>
  );
}
