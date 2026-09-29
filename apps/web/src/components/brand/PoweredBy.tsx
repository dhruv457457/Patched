import { cn } from "@/lib/utils";
import { ArcLogo, CircleLogo } from "./PartnerLogos";

const PARTNERS = [
  { href: "https://www.arc.io", Logo: ArcLogo, what: "Bids, escrow and receipts on Arc, with gas paid in USDC" },
  { href: "https://www.circle.com", Logo: CircleLogo, what: "Wallets and USDC by Circle" },
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
