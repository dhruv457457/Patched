"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { usePatchedAuth } from "@/components/providers/PrivyAuthProvider";
import { roleKey } from "@/app/welcome/WelcomeView";

/**
 * After someone's first sign-in, send them through onboarding (/welcome: profile, then how bidding works) and back
 * to where they were. Listing pages are exempt (the app shell isn't there), so a brand who signed in to bid keeps
 * bidding. Finishing onboarding is remembered in this browser only.
 */
export function RoleWelcome() {
  const { authenticated, walletAddress } = usePatchedAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authenticated || !walletAddress) return;
    try {
      if (!localStorage.getItem(roleKey(walletAddress))) router.push(`/welcome?next=${encodeURIComponent(pathname)}`);
    } catch {
      /* storage blocked: skip onboarding */
    }
  }, [authenticated, walletAddress, router, pathname]);

  return null;
}
