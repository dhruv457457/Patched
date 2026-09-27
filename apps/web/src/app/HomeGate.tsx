"use client";

import { useSignedIn } from "@/lib/signedIn";

/** "/" is the landing page for visitors and the Home feed for signed-in people. */
export function HomeGate({ landing, feed }: { landing: React.ReactNode; feed: React.ReactNode }) {
  return useSignedIn() ? <>{feed}</> : <>{landing}</>;
}
