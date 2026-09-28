import { NextResponse, type NextRequest } from "next/server";

/**
 * Handle subdomains are short links: `dhruv.monad.patched.world` opens `monad.patched.world/dhruv`, and
 * `dhruv.monad.patched.world/6` opens his listing 6. They redirect rather than serve the page themselves because a
 * sign-in only counts on the exact site it happened on: one address for the app means one sign-in everywhere.
 * The base domain comes from HANDLE_DOMAIN (e.g. "monad.patched.world"); without it this does nothing.
 */
export function middleware(req: NextRequest) {
  const base = process.env.HANDLE_DOMAIN?.toLowerCase();
  if (!base) return NextResponse.next();

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  if (!host.endsWith(`.${base}`)) return NextResponse.next();
  const handle = host.slice(0, -(base.length + 1));
  const { pathname, search } = req.nextUrl;
  // One label deep and not www; anything else just goes to the main site.
  if (!handle || handle.includes(".") || handle === "www") return redirect(base, pathname + search);
  // /6 is listing 6; the bare subdomain is the profile; any other path keeps its own meaning on the main site.
  if (pathname === "/") return redirect(base, `/${handle}${search}`);
  if (/^\/\d+\/?$/.test(pathname)) return redirect(base, `/${handle}${pathname}${search}`);
  return redirect(base, pathname + search);
}

function redirect(base: string, path: string) {
  return NextResponse.redirect(new URL(path, `https://${base}`), 308);
}

export const config = {
  // Pages only: assets, API routes and Next's own files are served on any host as-is.
  matcher: ["/((?!_next/|api/|favicon\\.ico|icon\\.svg|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml)$).*)"],
};
