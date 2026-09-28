import { cn } from "@/lib/utils";
import { MonadLogo, PrivyLogo } from "./PartnerLogos";

const PARTNERS = [
  { href: "https://monad.xyz", Logo: MonadLogo, what: "Stablecoin payments, bids and receipts on Monad" },
  { href: "https://privy.io", Logo: PrivyLogo, what: "Sign-in, wallets and one-tap bids by Privy" },
];

/** The partners Patched runs on, with what each one does here. */
export function PoweredBy({ className, height = 26 }: { className?: string; height?: number }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-center gap-x-14 gap-y-6", className)}>
      {PARTNERS.map(({ href, Logo, what }) => (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer"
          className="group grid justify-items-center gap-2 no-underline text-[var(--ink)]">
          <Logo height={height} className="opacity-85 transition-opacity group-hover:opacity-100" />
          <span className="text-xs text-[var(--muted)] group-hover:text-[var(--ink)]">{what}</span>
        </a>
      ))}
    </div>
  );
}
