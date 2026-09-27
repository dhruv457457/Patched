"use client";

import { useEffect, useRef } from "react";
import {
  PrivyProvider,
  useExportWallet,
  useLinkAccount,
  useLoginWithEmail,
  useLoginWithOAuth,
  useLoginWithSiwe,
  useMfa,
  useMfaEnrollment,
  usePrivy,
  useSendTransaction,
  useSignTypedData,
  useWallets,
} from "@privy-io/react-auth";
import { useUpdateEmail } from "@privy-io/react-auth/ui";
import { getAddress } from "viem";
import { monadMainnet, monadTestnet } from "@patched/shared";
import { CHAIN, CHAIN_ID } from "@/lib/config";
import { takePendingLogin, type AuthContextValue } from "./PrivyAuthProvider";

interface Eip1193 {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isMetaMask?: boolean;
}

/**
 * The Privy SDK and every Privy hook the app uses, in one lazily loaded module. Bridge reads the hooks and
 * hands the result up to PrivyAuthProvider's context on every change.
 */
function Bridge({ onChange }: { onChange: (v: AuthContextValue) => void }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const { signTypedData } = useSignTypedData();
  const { exportWallet } = useExportWallet();
  const { promptMfa } = useMfa();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  const { update: updateEmail } = useUpdateEmail();
  const { initOAuth } = useLoginWithOAuth();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe();

  // linkEmail() resolves when Privy reports the email linked.
  const linking = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(null);
  const { linkEmail } = useLinkAccount({
    onSuccess: () => {
      linking.current?.resolve();
      linking.current = null;
    },
    onError: (e) => {
      linking.current?.reject(new Error(String(e)));
      linking.current = null;
    },
  });

  // Prefer the Privy embedded wallet: it gets gas sponsorship and silent signing.
  const embedded = wallets.find((w) => w.walletClientType === "privy");
  const wallet = embedded ?? wallets[0];
  const walletAddress = wallet?.address as `0x${string}` | undefined;
  const xHandle = user?.twitter?.username ?? undefined;

  useEffect(() => {
    onChange({
      ready,
      authenticated,
      user: authenticated && user ? { id: user.id, walletAddress, xHandle, email: user.email?.address } : null,
      walletAddress,
      wallet,
      xHandle,
      isEmbeddedWallet: Boolean(embedded),
      hasGasSponsorship: Boolean(embedded),
      login,
      loginWithX: () => initOAuth({ provider: "twitter" }),
      sendEmailCode: (email: string) => sendCode({ email }),
      loginWithEmailCode: (code: string) => loginWithCode({ code }),
      loginWithWallet: async () => {
        // Sign-In With Ethereum, headless: the wallet shows one signature request and Privy never opens a window.
        const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
        if (!eth) throw new Error("no-wallet");
        const [account] = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        if (!account) throw new Error("no-account");
        const address = getAddress(account);
        const message = await generateSiweMessage({ address, chainId: `eip155:${CHAIN_ID}` });
        const signature = (await eth.request({ method: "personal_sign", params: [message, address] })) as string;
        await loginWithSiwe({ signature, message, walletClientType: eth.isMetaMask ? "metamask" : undefined, connectorType: "injected" });
      },
      logout,
      getAccessToken,
      sendTransaction,
      signTypedData,
      exportWallet,
      hasPasskey: (user?.mfaMethods ?? []).includes("passkey"),
      promptMfa,
      enrollPasskey: showMfaEnrollmentModal,
      linkEmail: () =>
        new Promise<void>((resolve, reject) => {
          linking.current = { resolve, reject };
          linkEmail();
        }),
      updateEmail,
    });
  });

  // Someone pressed "Sign in" before Privy finished loading: open the login window now.
  useEffect(() => {
    if (ready && takePendingLogin() && !authenticated) login();
  }, [ready, authenticated, login]);

  return null;
}

export default function PrivyRuntime({ onChange }: { onChange: (v: AuthContextValue) => void }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new Error("NEXT_PUBLIC_PRIVY_APP_ID is missing from .env.local");

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["twitter", "email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#FF5A1F",
          logo: "/icon.svg",
          landingHeader: "Welcome to Patched",
          loginMessage: "No wallet needed. We make one for you.",
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          // Everyone gets a Patched (embedded) wallet, including people who sign in with an external wallet
          // like MetaMask: useBid always prefers the embedded wallet, so bidding is gas-sponsored and
          // one-tap for them too. Their external wallet still works as a funding source (top up, export).
          ethereum: { createOnLogin: "all-users" },
          // Bids are confirmed in our own UI; don't show Privy's extra confirmation modals.
          showWalletUIs: false,
        },
        defaultChain: CHAIN,
        supportedChains: [monadTestnet, monadMainnet],
      }}
    >
      <Bridge onChange={onChange} />
    </PrivyProvider>
  );
}
