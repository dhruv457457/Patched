import { RESERVED_HANDLES } from "./handles";

/** A listing page (/<creator>/<id>) is the creator's own page: it has no app chrome, just its own bid bar. */
export function isListingPage(path: string) {
  return /^\/[^/]+\/\d+\/?$/.test(path) && !/^\/(studio|share)\//.test(path);
}

/**
 * Pages anyone can open without signing in or onboarding: a creator's profile (/<handle>), their listings, and
 * event pages. These are what people share, so they never send a visitor off to sign in first.
 */
export function isPublicPage(path: string) {
  if (isListingPage(path) || path.startsWith("/e/")) return true;
  const m = path.match(/^\/([^/]+)\/?$/);
  return !!m && !RESERVED_HANDLES.has(m[1].toLowerCase());
}
