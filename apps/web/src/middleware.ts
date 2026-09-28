import { NextResponse, type NextRequest } from "next/server";

/**
 * Handle subdomains: `dhruv.monad.patched.world` is Dhruv's page and `dhruv.monad.patched.world/6` his listing 6,
 * served by the same /[handle] routes as `monad.patched.world/dhruv`. The base domain comes from HANDLE_DOMAIN
 * (e.g. "monad.patched.world"); without it this does nothing. Anything else on a handle subdomain (sign-in, Studio,
 * Explore) goes to the main site, so the app itself lives on one address.
 */
export function middleware(req: NextRequest) {
  const base = process.env.HANDLE_DOMAIN?.toLowerCase();
  if (!base) return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!host.endsWith(`.${base}`)) return NextResponse.next();
  const handle = host.slice(0, -(base.length + 1));
  // Only one label deep, and not www (which just means the main site).
  if (!handle || handle.includes(".") || handle === "www") return redirectToMain(req, base);

  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();
  if (pathname === "/") {
    url.pathname = `/${handle}`;
    return NextResponse.rewrite(url);
  }
  // /6 is listing 6; /6/opengraph-image is its preview image.
  if (/^\/\d+(\/.*)?$/.test(pathname)) {
    url.pathname = `/${handle}${pathname}`;
    return NextResponse.rewrite(url);
  }
  // Links inside the page already carry the handle (/dhruv/6).
  if (pathname === `/${handle}` || pathname.startsWith(`/${handle}/`)) return NextResponse.next();
  return redirectToMain(req, base);
}

function redirectToMain(req: NextRequest, base: string) {
  const url = new URL(req.nextUrl.pathname + req.nextUrl.search, `https://${base}`);
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Pages only: assets, API routes and Next's own files are served on any host as-is.
  matcher: ["/((?!_next/|api/|favicon\\.ico|icon\\.svg|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml)$).*)"],
};
