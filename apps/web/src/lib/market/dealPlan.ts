import type { ListingDeal } from "@patched/shared";
import type { SurfaceKind } from "./types";

/** What the creator is patching. "idea" is anything else people will see; on-chain it uses the outfit surface. */
export type Kind = SurfaceKind | "idea";
export type PayoutPreset = NonNullable<ListingDeal["payout"]>;

export interface DealDraft {
  payout: PayoutPreset;
  /** "Part before, for printing": the share paid after the print proof, in percent. */
  upfrontPct: number;
  /** Custom plan: up to 4 steps, percentages adding up to 100. */
  custom: { name: string; pct: number }[];
  /** Vehicles: event days (1 to 3), where the vehicle is, and which kind. */
  days: number;
  place: "parked" | "loop";
  vehicle: "car" | "van" | "bus";
  /** What every spot includes (lines from DELIVERABLES, in menu order). */
  deliverables: string[];
}

export interface PlannedMilestone {
  name: string;
  bps: number;
  /** Proof deadline, ms. */
  deadline: number;
}

export interface PlanEvent {
  startsAt: number;
  endsAt: number;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;
export const X_POST = "An X post tagging the brand with #patched";

/** The deliverables menu per kind. The first entries plus the X post are on by default. */
export const DELIVERABLES: Record<Kind, string[]> = {
  outfit: ["Worn every event day", "5 venue photos with the patch in view", X_POST, "The brand tagged in every event post"],
  car: ["Dated, located photos every event day", "Parked at the entrance, 4 hours a day", "Route check-ins while looping the venue", X_POST],
  hoodie: ["The whole team wears it on stage", "A team photo at check-in", "A demo photo with the logo in view", X_POST],
  idea: ["Visible at the event every day", "5 photos with the logo in view", X_POST],
};

export function defaultDraft(kind: Kind): DealDraft {
  const menu = DELIVERABLES[kind];
  const deliverables = kind === "car"
    ? [menu[0], menu[2], X_POST]
    : [menu[0], menu[1], X_POST];
  return {
    payout: kind === "car" ? "daily" : "upfront",
    upfrontPct: 30,
    custom: [{ name: "Print proof", pct: 20 }, { name: "Event days", pct: 50 }, { name: "X post", pct: 30 }],
    days: 2,
    place: "loop",
    vehicle: "van",
    deliverables: menu.filter((d) => deliverables.includes(d)),
  };
}

/** Whole event days between two times (at least 1). */
export function eventDays(e: PlanEvent | undefined): number {
  if (!e) return 1;
  return Math.max(1, Math.min(8, Math.round((e.endsAt - e.startsAt) / DAY) + 1));
}

/**
 * Turn the creator's payout choice into on-chain milestones: names, basis points that add up to exactly 10,000,
 * and proof deadlines that are after the auction and strictly increasing (the market requires both).
 */
export function planMilestones({ kind, draft, biddingEndsAt, event, demoStepMs }: { kind: Kind; draft: DealDraft; biddingEndsAt: number; event?: PlanEvent; demoStepMs?: number }): PlannedMilestone[] {
  const days = kind === "car" ? draft.days : eventDays(event);
  // The event (or, with no event picked, a window that starts 5 days after bidding closes).
  const start = event ? Math.max(event.startsAt, biddingEndsAt + DAY) : biddingEndsAt + 5 * DAY;
  const end = event && kind !== "car" ? Math.max(event.endsAt, start) : start + (days - 1) * DAY;
  const printDue = start;
  const finalDue = end + 3 * DAY;
  const finalName = hasXPost(draft) ? "Event photos and X post" : "Event photos";

  let steps: { name: string; pct: number; due: number }[];
  switch (draft.payout) {
    case "after":
      steps = [{ name: finalName, pct: 100, due: finalDue }];
      break;
    case "daily": {
      const each = Math.floor(100 / days);
      steps = Array.from({ length: days }, (_, i) => ({
        name: i === days - 1 && hasXPost(draft) ? `Day ${i + 1} photos and X post` : `Day ${i + 1} photos`,
        pct: i === days - 1 ? 100 - each * (days - 1) : each,
        due: start + i * DAY + 2 * DAY,
      }));
      break;
    }
    case "custom": {
      const rows = draft.custom.filter((r) => r.pct > 0).slice(0, 4);
      steps = rows.map((r, i) => ({
        name: r.name.trim() || `Step ${i + 1}`,
        pct: r.pct,
        // Spread from the print proof (before the event) to the final proof (after it).
        due: rows.length === 1 ? finalDue : printDue + Math.round(((finalDue - printDue) * i) / (rows.length - 1)),
      }));
      break;
    }
    default:
      steps = [
        { name: "Print proof", pct: draft.upfrontPct, due: printDue },
        { name: finalName, pct: 100 - draft.upfrontPct, due: finalDue },
      ];
  }

  // Exact basis points (the last step absorbs rounding) and strictly increasing deadlines.
  let prev = biddingEndsAt;
  let used = 0;
  return steps.map((s, i) => {
    const bps = i === steps.length - 1 ? 10_000 - used : Math.round(s.pct * 100);
    used += bps;
    // Demo timing: proofs are due a few minutes apart after bidding ends, whatever the event dates are.
    const deadline = demoStepMs ? biddingEndsAt + (i + 1) * demoStepMs : Math.max(s.due, prev + HOUR);
    prev = deadline;
    return { name: s.name.slice(0, 40), bps, deadline };
  });
}

function hasXPost(d: DealDraft) {
  return d.deliverables.includes(X_POST);
}

/** Is the plan valid for the market: every step above 0% and 100% in total? */
export function planProblem(plan: PlannedMilestone[]): string | null {
  if (!plan.length) return "Add at least one payout step.";
  if (plan.some((m) => m.bps <= 0)) return "Every payout step needs more than 0%.";
  if (plan.reduce((a, m) => a + m.bps, 0) !== 10_000) return "The payout steps have to add up to 100%.";
  return null;
}
