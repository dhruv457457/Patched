"use client";

import { useCallback } from "react";
import { usePatchedAuth } from "@/components/providers/PrivyAuthProvider";

/**
 * fetch() that sends the Privy access token so server routes can verify who is calling. The function is stable
 * across renders, so it is safe to use in effect and callback dependencies.
 */
export function useAuthedFetch() {
  const { getAccessToken } = usePatchedAuth();
  return useCallback(
    async (input: string, init: RequestInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("authorization", `Bearer ${token}`);
      return fetch(input, { ...init, headers });
    },
    [getAccessToken],
  );
}
