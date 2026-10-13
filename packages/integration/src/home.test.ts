import { afterAll, afterEach, describe, expect, inject, it } from "vitest";
import { Browser } from "./browser";

const browser = new Browser(inject("baseUrl"));

afterEach(async () => {
  expect(await browser.collectErrors()).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

describe("home page", () => {
  it("renders the public landing page", async () => {
    await browser.open("/");

    expect(await browser.title()).toBe("DevMentor");
    expect(await browser.text("h1")).toBe("Grow as a developer, one mentoring session at a time.");
  });

  it("links to the admin dashboard", async () => {
    await browser.open("/");
    await browser.clickLink("Open admin");

    await browser.waitForUrl("**/admin");
    await browser.waitForText("DevMentor Admin");
    expect((await browser.url()).pathname).toBe("/admin");
  });
});
