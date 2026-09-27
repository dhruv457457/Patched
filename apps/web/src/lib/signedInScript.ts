export const SIGNED_IN_KEY = "patched.signedIn";
export const SIGNED_IN_ATTR = "data-signed-in";

/** Inline script for <head>: copy the "signed in on this browser" flag to <html> before anything paints. */
export const SIGNED_IN_SCRIPT = `try{if(localStorage.getItem('${SIGNED_IN_KEY}'))document.documentElement.setAttribute('${SIGNED_IN_ATTR}','')}catch(_){}`;
