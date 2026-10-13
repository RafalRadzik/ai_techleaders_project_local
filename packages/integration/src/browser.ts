import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cli = createRequire(import.meta.url).resolve("agent-browser/bin/agent-browser.js");

interface CliResult {
  success: boolean;
  data: Record<string, unknown> | null;
  error: string | null;
}

interface ConsoleMessage {
  type?: string;
  text?: string;
}

/**
 * Thin test driver over the `agent-browser` CLI. Each instance owns an isolated browser
 * session; call `close()` in `afterAll`. Commands throw when agent-browser reports a failure.
 */
export class Browser {
  private readonly session = `devmentor-it-${randomUUID()}`;

  constructor(private readonly baseUrl: string) {}

  /** Runs any agent-browser command (`run("find", "role", "button", "click", "--name", "Save")`). */
  async run(...args: string[]): Promise<Record<string, unknown>> {
    const fullArgs = ["--session", this.session, "--json", ...args];
    let stdout: string;
    try {
      ({ stdout } = await exec(process.execPath, [cli, ...fullArgs], { maxBuffer: 16 * 1024 * 1024 }));
    } catch (error) {
      stdout = (error as { stdout?: string }).stdout ?? "";
      if (stdout === "") {
        throw error;
      }
    }
    const result = JSON.parse(stdout) as CliResult;
    if (!result.success) {
      throw new Error(`agent-browser ${args.join(" ")} failed: ${result.error ?? "unknown error"}`);
    }
    return result.data ?? {};
  }

  async open(path: string): Promise<void> {
    await this.run("open", new URL(path, this.baseUrl).href);
  }

  async title(): Promise<string> {
    return String((await this.run("get", "title")).title);
  }

  async url(): Promise<URL> {
    return new URL(String((await this.run("get", "url")).url));
  }

  async text(selector = "body"): Promise<string> {
    return String((await this.run("get", "text", selector)).text);
  }

  async waitForText(text: string): Promise<void> {
    await this.run("wait", "--text", text);
  }

  async waitForUrl(pattern: string): Promise<void> {
    await this.run("wait", "--url", pattern);
  }

  async clickButton(name: string): Promise<void> {
    await this.run("find", "role", "button", "click", "--name", name, "--exact");
  }

  async clickLink(name: string): Promise<void> {
    await this.run("find", "role", "link", "click", "--name", name, "--exact");
  }

  async fillLabel(label: string, value: string): Promise<void> {
    await this.run("find", "label", label, "fill", value);
  }

  async press(key: string): Promise<void> {
    await this.run("press", key);
  }

  /** Uncaught exceptions and `console.error` calls (e.g. hydration errors) since the last check. */
  async collectErrors(): Promise<string[]> {
    const { errors = [] } = (await this.run("errors")) as { errors?: unknown[] };
    const { messages = [] } = (await this.run("console")) as { messages?: ConsoleMessage[] };
    await this.run("errors", "--clear");
    await this.run("console", "--clear");
    return [
      ...errors.map((error) => JSON.stringify(error)),
      ...messages.filter((message) => message.type === "error").map((message) => String(message.text)),
    ];
  }

  async close(): Promise<void> {
    await this.run("close");
  }
}
