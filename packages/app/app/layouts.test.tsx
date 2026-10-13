import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: ({ variable }: { variable: string }) => ({ variable: `geist${variable}` }),
  Geist_Mono: ({ variable }: { variable: string }) => ({ variable: `mono${variable}` }),
}));

const frontend = await import("./(frontend)/layout");
const admin = await import("./(admin)/layout");

const children = <p>child</p>;
const params = Promise.resolve({});

describe("FrontendRootLayout", () => {
  it("renders the document with the Geist font variables", () => {
    const html = renderToStaticMarkup(frontend.default({ children, params }));

    expect(html).toBe(
      '<html lang="en" class="geist--font-geist-sans mono--font-geist-mono h-full antialiased"><head></head><body class="flex min-h-full flex-col"><p>child</p></body></html>',
    );
    expect(frontend.metadata.title).toEqual({ default: "DevMentor", template: "%s · DevMentor" });
  });
});

describe("AdminRootLayout", () => {
  it("renders the document with the shadcn font variables and is not indexed", () => {
    const html = renderToStaticMarkup(admin.default({ children, params }));

    expect(html).toBe(
      '<html lang="en" class="geist--font-sans mono--font-mono h-full font-sans antialiased"><head></head><body class="flex min-h-full flex-col"><p>child</p></body></html>',
    );
    expect(admin.metadata).toMatchObject({ title: { default: "Admin · DevMentor" }, robots: { index: false, follow: false } });
  });
});
