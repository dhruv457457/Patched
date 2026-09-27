"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Fingerprint, Loader2, Lock, Mail, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { StoryPanel } from "@/components/brand/StoryPanel";
import { usePatchedAuth } from "@/components/providers/PrivyAuthProvider";
import { useProfile } from "@/lib/profile";
import { useAuthedFetch } from "@/lib/authedFetch";
import { handleProblem } from "@/lib/handles";
import { STEP_UP_USD } from "@/lib/market/stepUp";
import { GAS_SPONSORED } from "@/lib/config";
import { cn } from "@/lib/utils";

type Role = "creator" | "brand" | "both";
const X_PATH = "M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zM16.7 19.2h1.7L7.3 4.7H5.5z";

export const roleKey = (wallet: string) => `patched.role.${wallet.toLowerCase()}`;

/** Only same-site paths are allowed as the place to go after onboarding. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/welcome") ? next : null;
}

/**
 * First visit: sign in (X, email code or a wallet, all through Privy but in our own design), then one profile
 * screen, then how bidding works. The story on the left sells the idea while this happens.
 */
export function WelcomeView() {
  const { ready, authenticated, walletAddress } = usePatchedAuth();
  const router = useRouter();
  const [next, setNext] = useState<string | null>(null);
  const [step, setStep] = useState<"profile" | "bidding">("profile");
  const [role, setRole] = useState<Role>("both");

  useEffect(() => setNext(safeNext(new URLSearchParams(window.location.search).get("next"))), []);

  // Someone who already finished onboarding doesn't need to see it again.
  const checked = useRef(false);
  useEffect(() => {
    if (!authenticated || !walletAddress || checked.current) return;
    checked.current = true;
    try {
      if (localStorage.getItem(roleKey(walletAddress))) router.replace(safeNext(new URLSearchParams(window.location.search).get("next")) ?? "/");
    } catch {
      /* storage blocked: show onboarding */
    }
  }, [authenticated, walletAddress, router]);

  function finish() {
    try {
      if (walletAddress) localStorage.setItem(roleKey(walletAddress), role);
    } catch {
      /* storage blocked */
    }
    router.push(next ?? (role === "creator" ? "/studio" : "/"));
  }

  return (
    <main className="min-h-dvh grid lg:grid-cols-2">
      <section className="relative bg-[#FF5A1F] text-[#0B0B0C] px-5 sm:px-10 lg:px-14 py-8 lg:py-10 flex flex-col gap-6 lg:justify-between overflow-hidden">
        <Link href="/" aria-label="Patched home" className="no-underline self-start [--ink:#0B0B0C]">
          <Logo size={32} />
        </Link>
        <h1 className="font-display font-extrabold text-[clamp(44px,6vw,76px)] leading-[0.92] tracking-[-0.05em]">Get patched.<br />Get paid.</h1>
        <StoryPanel className="max-w-[600px] w-full" />
        <p className="flex items-center gap-2 text-sm">
          <Lock size={15} /> Sign-in, wallets and one-tap bids powered by <b>Privy</b>
        </p>
      </section>

      <section className="grid place-items-center px-5 py-10 bg-[var(--paper)]">
        {!ready ? (
          <Loader2 className="animate-spin text-[var(--muted)]" aria-label="Loading" />
        ) : !authenticated ? (
          <SignInCard />
        ) : step === "profile" ? (
          <ProfileStep role={role} setRole={setRole} onDone={() => setStep("bidding")} />
        ) : (
          <BiddingStep onDone={finish} />
        )}
      </section>
    </main>
  );
}

/** Privy sign-in in Patched's design: X first, then an email code, then "I have a wallet" (Privy's own window). */
function SignInCard() {
  const { loginWithX, sendEmailCode, loginWithEmailCode, login } = usePatchedAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState<null | "x" | "send" | "code">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "x" | "send" | "code", fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      if (kind === "send") setSent(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(kind === "code" ? "That code didn't work. Check it, or send a new one." : /email/i.test(msg) ? "Check the email address." : "That didn't go through. Try again.");
    } finally {
      if (kind !== "x") setBusy(null);
    }
  }

  return (
    <div className="w-full max-w-[400px] rounded-3xl bg-[var(--card)] border-[1.5px] border-[var(--soft)] shadow-[0_16px_48px_rgba(11,11,12,0.10)] p-7 grid gap-4">
      <span className="justify-self-center inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-[var(--soft)] text-xs font-semibold">
        <ShieldCheck size={13} /> Secured by <b>Privy</b>
      </span>
      <div className="text-center grid gap-1">
        <h2 className="text-2xl font-extrabold">Welcome to Patched</h2>
        <p className="text-sm text-[var(--muted)]">Sign in and your wallet is ready. No app, no seed phrase.</p>
      </div>

      <button onClick={() => run("x", loginWithX)} disabled={!!busy}
        className="h-12 rounded-full bg-[var(--ink)] text-[var(--paper)] font-bold flex items-center justify-center gap-2.5 hover:opacity-90 disabled:opacity-60">
        {busy === "x" ? <Loader2 size={16} className="animate-spin" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={X_PATH} /></svg>}
        Continue with X
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--muted)]"><span className="h-px flex-1 bg-[var(--soft)]" />or<span className="h-px flex-1 bg-[var(--soft)]" /></div>

      {!sent ? (
        <form className="grid gap-1.5" onSubmit={(e) => { e.preventDefault(); if (email.trim()) void run("send", () => sendEmailCode(email.trim())); }}>
          <label htmlFor="welcome-email" className="text-sm font-semibold">Email</label>
          <div className="flex gap-2">
            <input id="welcome-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com"
              className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--paper)]" />
            <button type="submit" disabled={!!busy || !email.trim()} className="btn-base btn-primary h-11 !rounded-xl">
              {busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Send code
            </button>
          </div>
        </form>
      ) : (
        <form className="grid gap-1.5" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 6) void run("code", () => loginWithEmailCode(code.trim())); }}>
          <label htmlFor="welcome-code" className="text-sm font-semibold">Code sent to {email}</label>
          <div className="flex gap-2">
            <input id="welcome-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" autoFocus
              className="flex-1 min-w-0 h-11 px-3.5 rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--paper)] font-mono tracking-[0.3em]" />
            <button type="submit" disabled={!!busy || code.length < 6} className="btn-base btn-primary h-11 !rounded-xl">
              {busy === "code" ? <Loader2 size={15} className="animate-spin" /> : null} Sign in
            </button>
          </div>
          <button type="button" className="text-xs font-semibold text-[var(--muted)] justify-self-start hover:text-[var(--ink)]" onClick={() => { setSent(false); setCode(""); }}>
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="text-sm text-[var(--red)] font-semibold" role="alert">{error}</p>}

      <button onClick={login} className="h-10 rounded-full font-semibold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--soft)] inline-flex items-center justify-center gap-2">
        <Wallet size={15} /> I have a wallet
      </button>
      <p className="text-xs text-center text-[var(--muted)] leading-relaxed">
        Even with your own wallet you get a Privy wallet for one-tap bids. Add money to it from any wallet.
      </p>
    </div>
  );
}

/** Name, @handle (checked live) and what you're here for. Prefilled from X. */
function ProfileStep({ role, setRole, onDone }: { role: Role; setRole: (r: Role) => void; onDone: () => void }) {
  const { xHandle } = usePatchedAuth();
  const { profile, save } = useProfile();
  const authedFetch = useAuthedFetch();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [check, setCheck] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filled = useRef(false);

  useEffect(() => {
    if (!profile || filled.current) return;
    filled.current = true;
    setName(profile.display_name ?? xHandle ?? "");
    setHandle(profile.handle ?? xHandle?.toLowerCase() ?? "");
  }, [profile, xHandle]);

  // Live check, a moment after typing stops.
  useEffect(() => {
    const h = handle.trim().toLowerCase();
    if (!h) return setCheck(null);
    const problem = handleProblem(h);
    if (problem) return setCheck({ ok: false, text: problem });
    if (h === profile?.handle) return setCheck({ ok: true, text: `patched/${h} is yours` });
    let alive = true;
    const t = setTimeout(() => {
      authedFetch(`/api/profile/handle?h=${encodeURIComponent(h)}`)
        .then((r) => r.json())
        .then((j: { available: boolean; reason: string | null }) => alive && setCheck(j.available ? { ok: true, text: `patched/${h} is yours` } : { ok: false, text: j.reason ?? "That handle is taken." }))
        .catch(() => {});
    }, 350);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [handle, profile?.handle, authedFetch]);

  async function submit() {
    setSaving(true);
    setError(null);
    const h = handle.trim().toLowerCase();
    const err = await save({ displayName: name.trim(), ...(h && h !== profile?.handle ? { handle: h } : {}) });
    setSaving(false);
    if (err) return setError(err);
    onDone();
  }

  const roles: { id: Role; label: string }[] = [{ id: "creator", label: "Sell spots" }, { id: "brand", label: "Sponsor" }, { id: "both", label: "Both" }];
  return (
    <form className="w-full max-w-[420px] grid gap-5" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
      <div className="grid gap-1.5">
        <span className="font-mono text-xs text-[var(--muted)]">Step 1 of 2</span>
        <h2 className="text-4xl font-extrabold tracking-tight">Set up your profile</h2>
        <p className="text-[var(--muted)]">{xHandle ? "We filled this in from X. Change anything." : "This is what brands and creators see."}</p>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required
          className="h-12 px-4 rounded-2xl border-[1.5px] border-[var(--line)] bg-[var(--card)] text-base" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-semibold">Handle</span>
        <span className="flex items-center h-12 px-4 rounded-2xl border-[1.5px] border-[var(--line)] bg-[var(--card)] focus-within:outline-3 focus-within:outline-[var(--accent)]">
          <span className="text-[var(--muted)]">@</span>
          <input value={handle} maxLength={31} onChange={(e) => setHandle(e.target.value.toLowerCase())} aria-label="Handle" required
            className="flex-1 min-w-0 bg-transparent outline-none text-base" />
        </span>
        {check && <span className={cn("text-sm font-semibold", check.ok ? "text-[var(--green)]" : "text-[var(--red)]")} role="status">{check.text}</span>}
      </label>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold mb-2">I&apos;m here to</legend>
        <div className="flex p-1 rounded-full bg-[var(--soft)]" role="radiogroup">
          {roles.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={role === r.id} onClick={() => setRole(r.id)}
              className={cn("flex-1 h-10 rounded-full text-sm font-bold transition-colors", role === r.id ? "bg-[var(--card)] shadow-[0_1px_4px_rgba(11,11,12,0.15)]" : "text-[var(--muted)]")}>
              {r.label}
            </button>
          ))}
        </div>
      </fieldset>
      {error && <p className="text-sm text-[var(--red)] font-semibold" role="alert">{error}</p>}
      <button type="submit" disabled={saving || !profile || !name.trim() || (check !== null && !check.ok)} className="btn-base btn-primary h-12 justify-center text-base">
        {saving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

/** How bidding works, stated as promises the app actually keeps. */
function BiddingStep({ onDone }: { onDone: () => void }) {
  const { hasPasskey, enrollPasskey, isEmbeddedWallet } = usePatchedAuth();
  const points = [
    { icon: Zap, text: "No wallet pop-up on each bid: your Privy wallet signs it." },
    ...(GAS_SPONSORED ? [{ icon: Check, text: "Patched pays the network fee." }] : []),
    { icon: ShieldCheck, text: "Outbid? Your money comes straight back, in the same transaction." },
    { icon: Check, text: "Turn on auto-bid and Patched keeps you on top while you're away." },
  ];
  return (
    <div className="w-full max-w-[440px] grid gap-5">
      <div className="grid gap-1.5">
        <span className="font-mono text-xs text-[var(--muted)]">Step 2 of 2</span>
        <h2 className="text-4xl font-extrabold tracking-tight">Bid without pop-ups</h2>
        <p className="text-[var(--muted)]">{isEmbeddedWallet ? "Your wallet is ready, so a bid is one tap." : "Your wallet is loading. A bid will be one tap."}</p>
      </div>
      <ul className="grid gap-3 rounded-3xl border-2 border-[var(--line)] bg-[var(--card)] p-5 shadow-[4px_4px_0_var(--shadow)] list-none m-0">
        {points.map((p) => (
          <li key={p.text} className="flex gap-3 items-start text-[15px]">
            <span className="w-7 h-7 rounded-lg bg-[var(--green-soft)] text-[var(--green)] grid place-items-center flex-none"><p.icon size={15} strokeWidth={2.6} /></span>
            {p.text}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--soft)] p-4">
        <Fingerprint size={26} className="flex-none" />
        <span className="flex-1 text-sm leading-snug">
          Bids of ${STEP_UP_USD.toLocaleString("en-US")} or more ask for your passkey (Face ID or fingerprint), so nobody else can spend.
        </span>
        {hasPasskey ? (
          <span className="inline-flex items-center gap-1 text-sm font-bold text-[var(--green)] flex-none"><Check size={15} /> Passkey on</span>
        ) : (
          <button onClick={enrollPasskey} className="btn-base btn-small flex-none">Set up</button>
        )}
      </div>
      <button onClick={onDone} className="btn-base btn-primary h-12 justify-center text-base">Start</button>
      <p className="text-xs text-center text-[var(--muted)]">Wallet by Privy. You can export it any time in Settings.</p>
    </div>
  );
}
