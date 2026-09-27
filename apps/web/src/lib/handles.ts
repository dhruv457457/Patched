/** Top-level routes: a handle with one of these names would be unreachable. */
export const RESERVED_HANDLES = new Set([
  "admin", "api", "bids", "campaigns", "create", "dashboard", "e", "events", "explore", "listing", "share", "studio",
  "settings", "about", "notifications", "welcome", "icon.svg",
]);

export const HANDLE_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;

/** Why a handle can't be used (format or reserved), or null when it's fine to check for availability. */
export function handleProblem(h: string): string | null {
  if (!HANDLE_RE.test(h)) return "2 to 31 characters: letters, numbers, dots, dashes or underscores.";
  if (/^0x[0-9a-f]{40}$/.test(h) || RESERVED_HANDLES.has(h)) return "That handle isn't allowed.";
  return null;
}
