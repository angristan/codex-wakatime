import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import which from "which";

// Mock modules before imports
vi.mock("node:fs");
vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/home/user"),
  platform: vi.fn(() => "darwin"),
  arch: vi.fn(() => "x64"),
}));
vi.mock("which", () => ({
  default: { sync: vi.fn(() => null) },
  sync: vi.fn(() => null),
}));

// Import after mocks
const { Dependencies } = await import("../dependencies.js");

describe("Dependencies", () => {
  let deps: InstanceType<typeof Dependencies>;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(os.homedir).mockReturnValue("/home/user");
    vi.mocked(os.platform).mockReturnValue("darwin");
    vi.mocked(os.arch).mockReturnValue("x64");
    deps = new Dependencies();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getCliLocationGlobal", () => {
    it("returns global path when wakatime-cli is found", () => {
      vi.mocked(which.sync).mockReturnValue("/usr/local/bin/wakatime-cli");

      const result = deps.getCliLocationGlobal();

      expect(result).toBe("/usr/local/bin/wakatime-cli");
      expect(which.sync).toHaveBeenCalledWith("wakatime-cli", {
        nothrow: true,
      });
    });

    it("returns undefined when wakatime-cli is not found", () => {
      vi.mocked(which.sync).mockReturnValue(null);

      const result = deps.getCliLocationGlobal();

      expect(result).toBeUndefined();
    });

    it("returns undefined on error", () => {
      vi.mocked(which.sync).mockImplementation(() => {
        throw new Error("which error");
      });

      const result = deps.getCliLocationGlobal();

      expect(result).toBeUndefined();
    });

    it("uses .exe extension on Windows", () => {
      vi.mocked(os.platform).mockReturnValue("win32");
      vi.mocked(which.sync).mockReturnValue(null);
      deps = new Dependencies();

      deps.getCliLocationGlobal();

      expect(which.sync).toHaveBeenCalledWith("wakatime-cli.exe", {
        nothrow: true,
      });
    });
  });

  describe("getCliLocation", () => {
    it("prefers global installation", () => {
      vi.mocked(which.sync).mockReturnValue("/usr/local/bin/wakatime-cli");

      const result = deps.getCliLocation();

      expect(result).toBe("/usr/local/bin/wakatime-cli");
    });

    it("falls back to local installation path", () => {
      vi.mocked(which.sync).mockReturnValue(null);

      const result = deps.getCliLocation();

      expect(result).toBe(
        path.join("/home/user", ".wakatime", "wakatime-cli-darwin-amd64"),
      );
    });

    it("caches the location", () => {
      vi.mocked(which.sync).mockReturnValue(null);

      const result1 = deps.getCliLocation();
      const result2 = deps.getCliLocation();

      expect(result1).toBe(result2);
      // which.sync should only be called once due to caching
      expect(which.sync).toHaveBeenCalledTimes(1);
    });

    describe("platform-specific binary names", () => {
      it.each([
        ["darwin", "x64", "wakatime-cli-darwin-amd64"],
        ["darwin", "arm64", "wakatime-cli-darwin-arm64"],
        ["linux", "x64", "wakatime-cli-linux-amd64"],
        ["linux", "arm64", "wakatime-cli-linux-arm64"],
        ["linux", "arm", "wakatime-cli-linux-arm"],
        ["win32", "x64", "wakatime-cli-windows-amd64.exe"],
        ["win32", "ia32", "wakatime-cli-windows-386.exe"],
      ])("uses correct binary name for %s/%s", (platform, arch, expectedBinary) => {
        vi.mocked(os.platform).mockReturnValue(platform as NodeJS.Platform);
        vi.mocked(os.arch).mockReturnValue(arch);
        vi.mocked(which.sync).mockReturnValue(null);
        deps = new Dependencies();

        const result = deps.getCliLocation();

        expect(result).toBe(
          path.join("/home/user", ".wakatime", expectedBinary),
        );
      });
    });
  });

  describe("isCliInstalled", () => {
    it("returns true when CLI file exists", () => {
      vi.mocked(which.sync).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = deps.isCliInstalled();

      expect(result).toBe(true);
    });

    it("returns false when CLI file does not exist", () => {
      vi.mocked(which.sync).mockReturnValue(null);
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = deps.isCliInstalled();

      expect(result).toBe(false);
    });

    it("returns true when global CLI is available", () => {
      vi.mocked(which.sync).mockReturnValue("/usr/local/bin/wakatime-cli");
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = deps.isCliInstalled();

      expect(result).toBe(true);
    });
  });
});
