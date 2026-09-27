import { cn } from "@/lib/utils";

const PASTELS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)", "var(--p5)"];

/** Two pastels picked from the wallet address, so every wallet gets its own avatar without a picture. */
export function walletGradient(wallet: string) {
  const a = parseInt(wallet.slice(2, 4), 16) % PASTELS.length || 0;
  const b = (a + 1 + ((parseInt(wallet.slice(4, 6), 16) || 0) % (PASTELS.length - 1))) % PASTELS.length;
  return `linear-gradient(135deg, ${PASTELS[a]}, ${PASTELS[b]})`;
}

/** A round avatar: the picture if there is one, otherwise the first letter on the wallet's own gradient. */
export function Avatar({ src, name, wallet, size = 40, className }: { src?: string | null; name?: string | null; wallet?: string | null; size?: number; className?: string }) {
  const letter = (name?.replace(/^@/, "")[0] ?? "?").toUpperCase();
  return (
    <span
      className={cn("inline-grid place-items-center flex-none rounded-full overflow-hidden font-display font-extrabold text-[#0B0B0C] border-[1.5px] border-[var(--line)]", className)}
      style={{ width: size, height: size, fontSize: size * 0.42, background: src ? "var(--soft)" : walletGradient(wallet ?? "0x0000") }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : letter}
    </span>
  );
}
