import { test, expect, type Page } from "@playwright/test";
import { watchErrors } from "./helpers";

/**
 * The things people click, signed out: sign-in, the app's navigation, the Studio deal, the campaign builder, a
 * listing, an event, Explore search and profile tabs. Each flow also fails on page crashes or console errors.
 */

const isPhone = () => test.info().project.name === "phone";

async function firstListing(page: Page) {
  await page.goto("/explore");
  const href = await page.locator("a[href]").evaluateAll((as) =>
    (as as HTMLAnchorElement[]).map((a) => a.getAttribute("href") ?? "").find((h) => /^\/[^/]+\/\d+$/.test(h)));
  expect(href, "needs at least one listing").toBeTruthy();
  return href!;
}

test.describe("signed-out flows", () => {
  test("the landing page sends Sign in to the welcome page", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Sign in" }).first().click();
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByRole("heading", { name: "Welcome to Patched" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("welcome: the story, the surface tabs, email and wallet sign-in", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/welcome");
    // Jump to chapter 3 and to the Cars tab.
    await page.getByRole("button", { name: "Step 3: Brands bid" }).click();
    await expect(page.getByText("Brands bid in one tap. No pop-ups, no gas. Privy signs.")).toBeVisible();
    await page.getByRole("tab", { name: "Cars" }).click();
    await expect(page.getByRole("tab", { name: "Cars" })).toHaveAttribute("aria-selected", "true");
    // Pause keeps the chapter.
    await page.getByRole("button", { name: "Pause the story" }).click();
    await expect(page.getByRole("button", { name: "Play the story" })).toBeVisible();

    // Send code needs an email first.
    const send = page.getByRole("button", { name: "Send code" });
    await expect(send).toBeDisabled();
    await page.getByLabel("Email").fill("someone@example.com");
    await expect(send).toBeEnabled();

    // "I have a wallet" opens a picker of this browser's wallets. The test browser has none, so it says so and
    // offers Privy's list for phone wallets instead of opening a window on its own.
    await page.getByRole("button", { name: "I have a wallet" }).click();
    await expect(page.getByText("No wallet extension in this browser")).toBeVisible();
    await expect(page.getByRole("button", { name: "Phone or other wallet" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("the app's navigation reaches every main place", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/explore");
    const nav = isPhone() ? page.getByRole("navigation", { name: "Main navigation" }) : page.getByRole("complementary", { name: "Main" });
    await nav.getByRole("link", { name: "Events" }).click();
    await expect(page).toHaveURL(/\/events$/);
    await nav.getByRole("link", { name: "Activity" }).click();
    await expect(page).toHaveURL(/\/notifications$/);
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    if (!isPhone()) {
      await page.goto("/events");
      await nav.getByRole("link", { name: "Explore" }).click();
      await expect(page).toHaveURL(/\/explore$/);
      await nav.getByRole("link", { name: "Create a listing" }).click();
      await expect(page).toHaveURL(/\/studio$/);
    } else {
      await page.goto("/events");
      await nav.getByRole("link", { name: "Create a listing" }).click();
      await expect(page).toHaveURL(/\/studio$/);
    }
    expect(errors).toEqual([]);
  });

  test("studio: steps, vehicle, own idea, payout presets and deliverables", async ({ page }) => {
    const errors = watchErrors(page);
    const steps = page.getByRole("list", { name: "Steps" });
    await page.goto("/studio");
    await expect(page.getByRole("heading", { name: "What are you selling?" })).toBeVisible();

    // Continue checks the step: no title yet, so it stays put.
    await page.getByRole("button", { name: /^Continue to spots/ }).click();
    await expect(page.getByRole("heading", { name: "What are you selling?" })).toBeVisible();
    await page.getByLabel("Title").fill("My van at Token2049");

    await page.getByRole("radio", { name: /^Vehicle/ }).click();
    await page.getByRole("button", { name: /^Continue to spots/ }).click();
    await expect(page.getByRole("heading", { name: /Draw your vehicle/ })).toBeVisible();

    await steps.getByRole("button", { name: /Deal/ }).click();
    await expect(page.getByRole("heading", { name: "Set your deal" })).toBeVisible();
    await expect(page.getByText("How long", { exact: true })).toBeVisible();
    await page.getByRole("radiogroup", { name: "Event days" }).getByRole("radio", { name: "3 days" }).click();
    await expect(page.getByRole("radio", { name: "Per day" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText(/^Day 3 photos/)).toBeVisible();

    await page.getByRole("radio", { name: "Custom" }).click();
    await page.getByRole("button", { name: "Add a step" }).click();
    await expect(page.getByLabel("Step 4 name")).toBeVisible();

    await page.getByRole("radio", { name: "Part before, for printing" }).click();
    await expect(page.getByLabel("Share paid before the event")).toBeVisible();

    const xPost = page.getByRole("switch", { name: /An X post tagging the brand/ });
    const before = await xPost.getAttribute("aria-checked");
    await xPost.click();
    await expect(xPost).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");

    await steps.getByRole("button", { name: /What/ }).click();
    await page.getByRole("radio", { name: /^Your own idea/ }).click();
    await expect(page.getByRole("radio", { name: /^Your own idea/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /^Outfit/ })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByText("What is it?")).toBeVisible();

    await steps.getByRole("button", { name: /Page/ }).click();
    await expect(page.getByRole("heading", { name: "Your sponsor page" })).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("campaign builder: the sentence, the cap and the real Privy policy", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/campaigns/new");
    await expect(page.getByRole("heading", { name: "Put your logo everywhere" })).toBeVisible();
    await page.getByRole("button", { name: "$40" }).click();
    await expect(page.getByText("Most it pays for one spot")).toBeVisible();
    await page.getByRole("button", { name: "Raise" }).click();
    await expect(page.getByRole("button", { name: "$45" }).first()).toBeVisible();
    await page.getByRole("button", { name: "See the policy" }).click();
    const policy = page.locator("pre");
    await expect(policy).toContainText("bidFor.bidder");
    await expect(policy).toContainText("bidFor.amount");
    await expect(policy).toContainText("current_unix_timestamp");
    await expect(policy).toContainText("45000000");
    await page.getByRole("button", { name: "Plain words" }).click();
    await expect(page.getByText("At most $45 a bid")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("a listing is the creator's own page and its sections are reachable", async ({ page }) => {
    const errors = watchErrors(page);
    const href = await firstListing(page);
    await page.goto(href);
    const mark = page.getByRole("link", { name: /Made with Patched/ });
    await expect(mark).toBeVisible();
    // No app chrome on the creator's page.
    await expect(page.getByRole("complementary", { name: "Main" })).toHaveCount(0);
    // The spot board: a row opens its bid panel with that spot's bid history.
    const row = page.locator("#spots [aria-expanded]").first();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Bids on this spot")).toBeVisible();
    await mark.click();
    await expect(page).toHaveURL(/\/$/);
    expect(errors).toEqual([]);
  });

  test("an event page links to who's going", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/events");
    await page.locator('a[href^="/e/"]').first().click();
    await expect(page).toHaveURL(/\/e\//);
    const going = page.locator("section", { has: page.getByRole("heading", { name: "Going" }) }).locator("a").first();
    if (await going.count()) {
      await going.click();
      await expect(page).toHaveURL(/^[^?]+\/[^/]+\/\d+$/);
    }
    expect(errors).toEqual([]);
  });

  test("explore search narrows the listings", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/explore?q=zzqqxx-nothing");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("profile tabs switch and keep the tab in the address", async ({ page }) => {
    const errors = watchErrors(page);
    const href = await firstListing(page);
    await page.goto(href.split("/").slice(0, 2).join("/"));
    await page.getByRole("tab", { name: /Sponsoring/ }).click();
    await expect(page).toHaveURL(/tab=sponsoring/);
    await page.getByRole("tab", { name: /Listings/ }).click();
    await expect(page).not.toHaveURL(/tab=/);
    expect(errors).toEqual([]);
  });
});
