import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs");
vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/user"),
}));

const { installHook, uninstallHook } = await import("../install.js");

const CODEX_DIR = path.join("/home/user", ".codex");
const CONFIG_PATH = path.join(CODEX_DIR, "config.toml");

describe("install", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends codex-wakatime to existing notify entries", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      'notify = ["hook-a", "hook-b"]\n',
    );

    installHook();

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      CONFIG_PATH,
      expect.stringContaining(
        'notify = ["hook-a", "hook-b", "codex-wakatime"]',
      ),
    );
  });

  it("does not overwrite when codex-wakatime is already configured", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      'notify = ["hook-a", "codex-wakatime"]\n',
    );

    installHook();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it("removes codex-wakatime and preserves other notify entries", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      'notify = ["codex-wakatime", "hook-a"]\n',
    );

    uninstallHook();

    const written = vi.mocked(fs.writeFileSync).mock.calls[0]?.[1] as string;
    expect(written).toContain('notify = ["hook-a"]');
  });

  it("removes notify when codex-wakatime is the only entry", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('notify = ["codex-wakatime"]\n');

    uninstallHook();

    const written = vi.mocked(fs.writeFileSync).mock.calls[0]?.[1] as string;
    expect(written).not.toContain("notify");
  });

  it("does not write when codex-wakatime is not configured", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('notify = ["hook-a"]\n');

    uninstallHook();

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
});
