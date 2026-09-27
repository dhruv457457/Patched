/** A listing page (/<creator>/<id>) is the creator's own page: it has no app chrome, just its own bid bar. */
export function isListingPage(path: string) {
  return /^\/[^/]+\/\d+\/?$/.test(path) && !/^\/(studio|share)\//.test(path);
}
