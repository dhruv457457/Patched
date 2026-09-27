"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useAuthedFetch } from "@/lib/authedFetch";
import type { AdminEvent } from "./AdminConsole";

const INPUT = "border-2 border-[var(--line)] rounded-xl px-3 py-2 bg-[var(--paper)] w-full";

/** The event page's details: cover, slug, city, venue, about and links. Saved off-chain (admins only). */
export function EventDetailsForm({ event, onSaved }: { event: AdminEvent; onSaved: () => void }) {
  const authedFetch = useAuthedFetch();
  const [form, setForm] = useState({
    slug: event.slug ?? "",
    city: event.city ?? "",
    venue: event.venue ?? "",
    description: event.description ?? "",
    bannerUrl: event.bannerUrl ?? "",
    website: event.website ?? "",
    x: event.x ?? "",
  });
  const [busy, setBusy] = useState<null | "cover" | "save">(null);
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function upload(f: File) {
    setBusy("cover");
    try {
      const body = new FormData();
      body.set("file", f);
      body.set("bucket", "canvases");
      const res = await authedFetch("/api/uploads", { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
      setForm((cur) => ({ ...cur, bannerUrl: json.url! }));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    try {
      const res = await authedFetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Couldn't save.");
      toast(`${event.name} page saved.`);
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-3 p-4 bg-[var(--soft)]/50 rounded-xl">
      <button type="button" onClick={() => file.current?.click()} disabled={!!busy}
        className="relative h-[120px] rounded-xl border-2 border-dashed border-[var(--line)] overflow-hidden grid place-items-center bg-[var(--paper)] hover:border-[var(--accent)]"
        style={form.bannerUrl ? { background: `center/cover url(${form.bannerUrl})` } : undefined}>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--card)] px-3 py-1.5 text-sm font-semibold border-[1.5px] border-[var(--line)]">
          {busy === "cover" ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          {form.bannerUrl ? "Change cover" : "Upload a cover image"}
        </span>
      </button>
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} />
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="grid gap-1"><span className="field-label">Page address</span>
          <span className="flex items-center gap-1 text-sm"><span className="text-[var(--muted)] font-mono">/e/</span><input className={INPUT} value={form.slug} maxLength={48} placeholder="token2049" onChange={set("slug")} /></span></label>
        <label className="grid gap-1"><span className="field-label">City</span><input className={INPUT} value={form.city} maxLength={60} placeholder="Singapore" onChange={set("city")} /></label>
        <label className="grid gap-1"><span className="field-label">Venue</span><input className={INPUT} value={form.venue} maxLength={80} placeholder="Marina Bay Sands" onChange={set("venue")} /></label>
      </div>
      <label className="grid gap-1"><span className="field-label">About</span>
        <textarea className={INPUT + " resize-y"} rows={3} maxLength={600} value={form.description} onChange={set("description")} placeholder="What the event is and who goes." /></label>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1"><span className="field-label">Website</span><input className={INPUT} value={form.website} placeholder="https://" onChange={set("website")} /></label>
        <label className="grid gap-1"><span className="field-label">X</span><input className={INPUT} value={form.x} placeholder="https://x.com/…" onChange={set("x")} /></label>
      </div>
      <Button variant="primary" className="justify-self-start" onClick={save} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save event page"}</Button>
    </div>
  );
}
