import * as fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HeartbeatParams } from "../types.js";

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/tmp/example-home"),
}));

vi.mock("node:fs");

const { anonymizeHeartbeat } = await import("../privacy.js");

const baseHeartbeat: HeartbeatParams = {
  entity: "/tmp/example-codex-root/thread/src/private.ts",
  entityType: "file",
  category: "ai coding",
  projectFolder: "/tmp/example-codex-root/thread",
  isWrite: true,
};

function mockConfig(content: string | undefined): void {
  vi.mocked(fs.existsSync).mockReturnValue(content !== undefined);
  if (content === undefined) {
    vi.mocked(fs.readFileSync).mockReset();
    return;
  }
  vi.mocked(fs.readFileSync).mockReturnValue(content);
}

describe("privacy", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CODEX_WAKATIME_PRIVACY_ROOT;
    delete process.env.CODEX_WAKATIME_PRIVACY_PROJECT;
    delete process.env.CODEX_WAKATIME_PRIVACY_ENTITY_ROOT;
    mockConfig(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("leaves heartbeats unchanged when privacy config is incomplete", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result).toBe(baseHeartbeat);
  });

  it("anonymizes file heartbeats under the configured env root", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "vague_project";
    process.env.CODEX_WAKATIME_PRIVACY_ENTITY_ROOT = "/tmp/example-codex-root";

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result).toEqual({
      ...baseHeartbeat,
      entity: "/tmp/example-codex-root/vague_file.ts",
      projectFolder: "/tmp/example-codex-root",
      project: "vague_project",
    });
  });

  it("reads privacy config from wakatime cfg when env is absent", () => {
    mockConfig(`
      [settings]
      codex_wakatime_privacy_root = /tmp/example-codex-root
      codex_wakatime_privacy_project = vague_project
    `);

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result.project).toBe("vague_project");
    expect(result.entity).toBe("/tmp/example-codex-root/vague_file.ts");
  });

  it("lets env config override wakatime cfg values", () => {
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "env_project";
    mockConfig(`
      codex_wakatime_privacy_root = /tmp/example-codex-root
      codex_wakatime_privacy_project = cfg_project
    `);

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result.project).toBe("env_project");
  });

  it("falls back to env-only config when wakatime cfg cannot be read", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "env_project";
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error("permission denied");
    });

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result.project).toBe("env_project");
    expect(result.entity).toBe("/tmp/example-codex-root/vague_file.ts");
  });

  it("leaves paths outside the configured root unchanged", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "vague_project";

    const heartbeat = {
      ...baseHeartbeat,
      entity: "/tmp/example-src/app.ts",
      projectFolder: "/tmp/example-src",
    };

    const result = anonymizeHeartbeat(heartbeat);

    expect(result).toBe(heartbeat);
  });

  it("anonymizes app heartbeats as synthetic file heartbeats", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "vague_project";

    const heartbeat: HeartbeatParams = {
      entity: "/tmp/example-codex-root/thread",
      entityType: "app",
      category: "ai coding",
      project: "thread",
    };

    const result = anonymizeHeartbeat(heartbeat);

    expect(result).toEqual({
      ...heartbeat,
      entity: "/tmp/example-codex-root/vague_file.txt",
      entityType: "file",
      projectFolder: "/tmp/example-codex-root",
      project: "vague_project",
    });
  });

  it("supports Windows-style paths", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "C:\\Example\\Codex";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "vague_project";
    process.env.CODEX_WAKATIME_PRIVACY_ENTITY_ROOT = "C:\\Example\\Codex";

    const result = anonymizeHeartbeat({
      entity: "C:\\Example\\Codex\\thread\\secret.tsx",
      entityType: "file",
      category: "ai coding",
      projectFolder: "C:\\Example\\Codex\\thread",
    });

    expect(result).toMatchObject({
      entity: "C:\\Example\\Codex\\vague_file.tsx",
      projectFolder: "C:\\Example\\Codex",
      project: "vague_project",
    });
  });

  it("resolves relative entity root before rewriting", () => {
    process.env.CODEX_WAKATIME_PRIVACY_ROOT = "/tmp/example-codex-root";
    process.env.CODEX_WAKATIME_PRIVACY_PROJECT = "vague_project";
    process.env.CODEX_WAKATIME_PRIVACY_ENTITY_ROOT = "private";

    const result = anonymizeHeartbeat(baseHeartbeat);

    expect(result.entity).toMatch(/\/private\/vague_file\.ts$/);
  });
});
