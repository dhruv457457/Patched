import { expect, type Page, type TestInfo } from "@playwright/test";

/** Console errors that aren't ours to fix (browser extensions, third-party noise). Keep this list short. */
const IGNORED = [
  /Download the React DevTools/i,
  /favicon/i,
  /chrome-extension:\/\//i,
  // Privy's SDK logs this in dev when the origin isn't in its allow-list for a feature we don't use here.
  /Failed to load resource: the server responded with a status of 4\d\d .*privy/i,
];

export interface PageReport {
  overflow: number;
  wide: string[];
  brokenImages: string[];
  unnamed: string[];
  links: string[];
}

/** Start collecting page crashes and console errors; returns the list that fills as the page runs. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`page error: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (!IGNORED.some((r) => r.test(text))) errors.push(`console error: ${text.slice(0, 300)}`);
  });
  return errors;
}

/** Load a page, let it settle (lazy images, Privy, live data), and measure what a person would notice is broken. */
export async function openAndMeasure(page: Page, path: string, expectStatus = 200): Promise<PageReport> {
  const res = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(res?.status(), `${path} returned ${res?.status()}`).toBe(expectStatus);
  await page.waitForLoadState("load");
  await page.waitForTimeout(1500);
  // Scroll the whole page so lazy images load and scroll-triggered animations run.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  return page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (["hidden", "clip", "auto", "scroll"].includes(s.overflowX)) return true;
      }
      return false;
    };
    const describe = (el: Element) => {
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const cls = (el.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".");
      return `<${el.tagName.toLowerCase()}${cls ? "." + cls : ""}> ${text}`;
    };
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        if (!r.width || r.right <= W + 1) return false;
        if (getComputedStyle(el).position === "fixed") return false;
        return !clipped(el);
      })
      .slice(0, 6)
      .map(describe);

    const brokenImages = [...document.images]
      .filter((i) => i.src && i.complete && i.naturalWidth === 0 && i.loading !== "lazy")
      .map((i) => i.src.slice(0, 120));

    // checkVisibility also hides what's inside a closed <details> or a content-visibility: hidden block.
    const visible = (el: HTMLElement) => el.checkVisibility({ visibilityProperty: true, opacityProperty: false, contentVisibilityAuto: true });
    const named = (el: HTMLElement) =>
      !!(el.innerText?.trim() || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title")
        || el.querySelector("img[alt]:not([alt=''])") || el.querySelector("svg[aria-label], svg title"));
    const unnamed = ([...document.querySelectorAll("button, a[href], [role=button], [role=tab], [role=switch], [role=radio]")] as HTMLElement[])
      .filter((el) => visible(el) && !el.closest("[aria-hidden=true]") && !named(el))
      .slice(0, 8)
      .map((el) => el.outerHTML.slice(0, 160));

    const links = [...new Set(([...document.querySelectorAll("a[href]")] as HTMLAnchorElement[])
      .map((a) => a.getAttribute("href") ?? "")
      .filter((h) => h.startsWith("/") && !h.startsWith("//")))];

    return { overflow: document.documentElement.scrollWidth - W, wide, brokenImages, unnamed, links };
  });
}

/** Screenshot for the visual review (e2e/screens/<project>/<name>.png, not committed). */
export async function snap(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: `e2e/screens/${info.project.name}/${name}.png`, fullPage: true });
}

/** Assert everything the report measured, with messages that say where to look. */
export function expectClean(report: PageReport, errors: string[], path: string) {
  expect.soft(report.overflow, `${path} scrolls sideways by ${report.overflow}px. Too wide: ${report.wide.join(" | ")}`).toBeLessThanOrEqual(1);
  expect.soft(report.brokenImages, `${path} has broken images`).toEqual([]);
  expect.soft(report.unnamed, `${path} has buttons or links with no name (screen readers can't say what they do)`).toEqual([]);
  expect.soft(errors, `${path} logged errors`).toEqual([]);
}
