"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { Logo } from "@/components/brand/Logo";

/**
 * The landing page's top bar, for signed-out visitors: the logo, how it works, and the way in. Everything in the app
 * goes through sign-in; signed-in people get the app sidebar instead.
 */
export function Navbar() {
  const { ready } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/90 backdrop-blur-md border-b-[1.5px] border-[var(--soft)] px-4 sm:px-8 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center gap-3 justify-between">
        <Link href="/" className="inline-flex items-center no-underline" aria-label="Patched home">
          <Logo size={34} />
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2.5" aria-label="Main navigation">
          <Link href="/#how-it-works" className="hidden sm:inline-block px-3 py-1.5 rounded-lg text-sm font-semibold no-underline text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--soft)]">
            How it works
          </Link>
          {!ready ? (
            // Privy loads just after the page; hold its space so the bar doesn't jump.
            <span className="w-40 h-9 rounded-xl bg-[var(--soft)] motion-safe:animate-pulse" aria-hidden="true" />
          ) : (
            <>
              <Link href="/welcome" className="btn-base btn-small btn-ghost">Sign in</Link>
              <Link href="/welcome?next=/studio" className="btn-base btn-small btn-primary">Get patched</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
