"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePatchedAuth } from "@/components/providers/PrivyAuthProvider";
import { SIGNED_IN_ATTR as ATTR, SIGNED_IN_KEY as KEY } from "./signedInScript";

/**
 * Privy loads after the page, so on a fresh load we don't know yet whether someone is signed in. A small flag in
 * this browser remembers it: the head script copies it to <html data-signed-in> before the first paint, so a
 * returning user gets the app (not a flash of the landing page), and it is corrected once Privy is ready.
 */

const subscribe = (cb: () => void) => {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: [ATTR] });
  return () => obs.disconnect();
};
const read = () => document.documentElement.hasAttribute(ATTR);

/** Whether to show the signed-in app: Privy's answer once it's ready, this browser's memory before that. */
export function useSignedIn(): boolean {
  const { ready, authenticated } = usePatchedAuth();
  const hint = useSyncExternalStore(subscribe, read, () => false);

  useEffect(() => {
    if (!ready) return;
    try {
      if (authenticated) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      /* storage blocked */
    }
    document.documentElement.toggleAttribute(ATTR, authenticated);
  }, [ready, authenticated]);

  return ready ? authenticated : hint;
}
