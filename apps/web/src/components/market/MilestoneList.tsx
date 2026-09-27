"use client";

import { Camera, Check, Clock, Hourglass, TriangleAlert } from "lucide-react";
import { formatCountdown } from "@/lib/format";
import type { MilestoneView } from "@/lib/market/server";
import { cn } from "@/lib/utils";

const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const X_PATH = "M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zM16.7 19.2h1.7L7.3 4.7H5.5z";

type Stage = "paid" | "review" | "overdue" | "current" | "later";

/**
 * The deal, as a tracker: every payout step on one line, the step that's happening now highlighted, and each
 * step's proof (photos, the X post, the creator's note) right where the brand checks it.
 */
export function MilestoneList({
  milestones, nextMilestone, listingStatus, mounted, renderAction,
}: {
  milestones: MilestoneView[];
  nextMilestone: number;
  listingStatus: number;
  mounted: boolean;
  renderAction?: (m: MilestoneView) => React.ReactNode;
}) {
  return (
    <ol className="list-none p-0 m-0">
      {milestones.map((m, i) => {
        const isNext = listingStatus === 2 && m.idx === nextMilestone;
        const overdue = isNext && m.status === 0 && mounted && Date.now() > m.deadline;
        const stage: Stage = m.status === 2 ? "paid" : m.status === 1 ? "review" : overdue ? "overdue" : isNext ? "current" : "later";
        const review = m.reviewEndsAt ? formatCountdown(m.reviewEndsAt) : null;
        const last = i === milestones.length - 1;
        return (
          <li key={m.idx} className="flex gap-4">
            {/* The node and the line to the next step */}
            <span className="flex flex-col items-center flex-none w-9">
              <span className={cn(
                "w-9 h-9 rounded-full grid place-items-center border-2",
                stage === "paid" && "bg-[var(--green)] border-[var(--green)] text-white",
                (stage === "review" || stage === "current") && "bg-[var(--accent)] border-[var(--line)] text-[var(--on-accent)] motion-safe:animate-[ring_1.6s_ease-out_infinite]",
                stage === "overdue" && "bg-[var(--accent-soft)] border-[var(--red)] text-[var(--red)]",
                stage === "later" && "bg-[var(--card)] border-[var(--soft)] text-[var(--muted)]",
              )}>
                {stage === "paid" ? <Check size={17} strokeWidth={3} /> : stage === "review" ? <Hourglass size={15} /> : stage === "overdue" ? <TriangleAlert size={15} /> : <Camera size={15} />}
              </span>
              {!last && <span className={cn("w-[2px] flex-1 min-h-6", stage === "paid" ? "bg-[var(--green)]" : "bg-[var(--soft)]")} />}
            </span>

            <div className={cn("flex-1 min-w-0 pb-7", stage === "later" && "opacity-70")}>
              <div className="flex items-start justify-between gap-3 flex-wrap pt-1">
                <div className="grid gap-0.5 min-w-0">
                  <b className="text-[17px] leading-tight">{m.name}</b>
                  <span className="text-sm text-[var(--muted)] flex items-center gap-1.5">
                    <Clock size={13} /> {m.status === 2 ? "Paid" : `Proof due ${mounted ? fmtDate(m.deadline) : ""}`} · {m.bps / 100}% of each winning bid
                  </span>
                </div>
                <span className={cn(
                  "text-sm font-bold whitespace-nowrap",
                  stage === "paid" ? "text-[var(--green)]" : stage === "overdue" ? "text-[var(--red)]" : stage === "later" ? "text-[var(--muted)]" : "text-[var(--accent-text)]",
                )}>
                  {stage === "paid" ? "Paid"
                    : stage === "review" ? (review && mounted ? (review.hasEnded ? "Ready to release" : `In review · ${review.text.split(" ").slice(0, 2).join(" ")} left`) : "In review")
                    : stage === "overdue" ? "Deadline passed"
                    : stage === "current" ? "Waiting for proof"
                    : "Later"}
                </span>
              </div>

              {stage === "review" && review && mounted && (
                <p className="text-sm mt-2">
                  {review.hasEnded ? "The review window is over. The payment can be released." : "Patch holders can check the proof and dispute it before it pays out."}
                </p>
              )}

              {m.proof && (
                <div className="grid gap-3 mt-3">
                  {m.proof.files.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 max-w-[520px]">
                      {m.proof.files.map((f, j) => (
                        <a key={f} href={f} target="_blank" rel="noopener noreferrer" className="relative block aspect-square rounded-xl overflow-hidden border-2 border-[var(--line)] bg-[var(--soft)]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={f} alt={`Proof photo ${j + 1} for ${m.name}`} loading="lazy" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  {m.proof.xUrl && (
                    <a href={m.proof.xUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 max-w-[520px] rounded-2xl border-[1.5px] border-[var(--soft)] bg-[var(--card)] px-4 py-3 no-underline text-[var(--ink)] hover:border-[var(--line)]">
                      <span className="w-9 h-9 rounded-full bg-[var(--ink)] text-[var(--paper)] grid place-items-center flex-none">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={X_PATH} /></svg>
                      </span>
                      <span className="grid min-w-0">
                        <b className="text-sm">Posted on X by @{m.proof.xUrl.split("/")[3]}</b>
                        <span className="text-xs text-[var(--muted)] truncate">Open the post to see the views and who it tags</span>
                      </span>
                    </a>
                  )}
                  {m.proof.note && <p className="text-sm text-[var(--muted)]">&ldquo;{m.proof.note}&rdquo;</p>}
                </div>
              )}
              {renderAction?.(m)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
