import { afterAll, afterEach, describe, expect, inject, it } from "vitest";
import { Browser } from "./browser";

// Tests in this file share one fresh database and run in order.
const browser = new Browser(inject("baseUrl"));

afterEach(async () => {
  expect(await browser.collectErrors()).toEqual([]);
});

afterAll(async () => {
  await browser.close();
});

async function dashboardUserCount(): Promise<string> {
  await browser.open("/admin");
  await browser.waitForText("Manage users");
  const match = /Registered accounts\s*(\S+)\s*Manage users/.exec(await browser.text());
  return match?.[1] ?? "";
}

describe("admin dashboard", () => {
  it("shows a healthy database and no users", async () => {
    expect(await dashboardUserCount()).toBe("0");

    expect(await browser.title()).toBe("Dashboard · DevMentor Admin");
    expect(await browser.text()).toMatch(/database\s*\d+ ms\s*up/i);
  });

  it("links to the users screen", async () => {
    await browser.open("/admin");
    // The link streams in with the Suspense boundary.
    await browser.waitForText("Manage users");
    await browser.clickLink("Manage users");

    await browser.waitForUrl("**/admin/users");
    await browser.waitForText("No users yet");
  });
});

describe("admin users", () => {
  it("validates the form on the client", async () => {
    await browser.open("/admin/users");
    await browser.waitForText("No users yet");

    await browser.clickButton("Add user");

    await browser.waitForText("Name is required");
    await browser.waitForText("Enter a valid email address");
  });

  it("creates a user that is listed and persisted", async () => {
    await browser.open("/admin/users");
    await browser.waitForText("No users yet");

    await browser.fillLabel("Name", "Ada Lovelace");
    await browser.fillLabel("Email", "  Ada@Example.com ");
    await browser.clickButton("Add user");
    await browser.waitForText("ada@example.com");

    await browser.open("/admin/users");
    await browser.waitForText("ada@example.com");
    expect(await browser.text("table")).toContain("Ada Lovelace");
  });

  it("rejects a duplicate email with the server error", async () => {
    await browser.open("/admin/users");
    await browser.waitForText("ada@example.com");

    await browser.fillLabel("Name", "Another Ada");
    await browser.fillLabel("Email", "ada@example.com");
    await browser.clickButton("Add user");

    await browser.waitForText("A user with this email already exists");
    expect(await browser.text("table")).not.toContain("Another Ada");
  });

  it("submits with the keyboard shortcut and lists the newest user first", async () => {
    await browser.open("/admin/users");
    await browser.waitForText("ada@example.com");

    await browser.fillLabel("Name", "Grace Hopper");
    await browser.fillLabel("Email", "grace@example.com");
    await browser.press("Control+Enter");
    await browser.waitForText("grace@example.com");

    const rows = (await browser.text("tbody")).split("\n").filter(Boolean);
    expect(rows[0]).toContain("Grace Hopper");
  });

  it("shows the new user count on the dashboard", async () => {
    expect(await dashboardUserCount()).toBe("2");
  });
});
