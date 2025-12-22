import { describe, expect, it } from "vitest";
import { extractFilePaths, isTrackableExtension } from "../extractor.js";

describe("extractor", () => {
  describe("extractFilePaths", () => {
    const cwd = "/project";

    describe("code block headers", () => {
      it("extracts file from code block header with language", () => {
        const message = "```typescript:src/index.ts\nconst x = 1;\n```";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/index.ts",
        ]);
      });

      it("extracts file from code block header without language", () => {
        const message = "```:src/config.json\n{}\n```";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/config.json",
        ]);
      });

      it("handles multiple code blocks", () => {
        const message = `
\`\`\`ts:src/a.ts
code
\`\`\`

\`\`\`js:src/b.js
code
\`\`\`
`;
        const files = extractFilePaths(message, cwd);
        expect(files).toContain("/project/src/a.ts");
        expect(files).toContain("/project/src/b.js");
      });
    });

    describe("backtick paths", () => {
      it("extracts file path in backticks", () => {
        const message = "I modified `src/utils.ts` to add the helper.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/utils.ts",
        ]);
      });

      it("extracts multiple backtick paths", () => {
        const message = "Updated `package.json` and `tsconfig.json`.";
        const files = extractFilePaths(message, cwd);
        expect(files).toContain("/project/package.json");
        expect(files).toContain("/project/tsconfig.json");
      });

      it("ignores backtick content without extension", () => {
        const message = "Run `npm install` to install dependencies.";
        expect(extractFilePaths(message, cwd)).toEqual([]);
      });
    });

    describe("action patterns", () => {
      it("extracts file from Created pattern", () => {
        const message = "Created src/new-file.ts with the implementation.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/new-file.ts",
        ]);
      });

      it("extracts file from Modified pattern", () => {
        const message = "Modified package.json to add the dependency.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/package.json",
        ]);
      });

      it("extracts file from Updated pattern", () => {
        const message = "Updated src/config.ts with new settings.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/config.ts",
        ]);
      });

      it("extracts file from Wrote pattern", () => {
        const message = "Wrote README.md with the documentation.";
        expect(extractFilePaths(message, cwd)).toEqual(["/project/README.md"]);
      });

      it("extracts file from Edited pattern", () => {
        const message = "Edited src/main.rs to fix the bug.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/main.rs",
        ]);
      });

      it("extracts file from Deleted pattern", () => {
        const message = "Deleted old-file.js as it was unused.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/old-file.js",
        ]);
      });

      it("handles backtick-wrapped paths in action patterns", () => {
        const message = "Created `src/helper.ts` with utility functions.";
        expect(extractFilePaths(message, cwd)).toContain(
          "/project/src/helper.ts",
        );
      });
    });

    describe("quoted paths", () => {
      it("extracts file from double-quoted path", () => {
        const message = 'The file "src/index.ts" contains the entry point.';
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/index.ts",
        ]);
      });

      it("extracts file from single-quoted path", () => {
        const message = "The file 'src/index.ts' contains the entry point.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/index.ts",
        ]);
      });
    });

    describe("path handling", () => {
      it("handles absolute paths", () => {
        const message = "Modified `/absolute/path/file.ts`";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/absolute/path/file.ts",
        ]);
      });

      it("normalizes paths with ../ segments", () => {
        const message = "Updated `../other/file.ts`";
        const files = extractFilePaths(message, cwd);
        expect(files.length).toBe(1);
        expect(files[0]).toMatch(/other\/file\.ts$/);
      });

      it("deduplicates same file mentioned multiple times", () => {
        const message = "Created `src/file.ts`. Then modified `src/file.ts`.";
        expect(extractFilePaths(message, cwd)).toEqual([
          "/project/src/file.ts",
        ]);
      });
    });

    describe("edge cases", () => {
      it("returns empty array for empty message", () => {
        expect(extractFilePaths("", cwd)).toEqual([]);
      });

      it("returns empty array for null-ish message", () => {
        expect(extractFilePaths(null as unknown as string, cwd)).toEqual([]);
      });

      it("ignores URLs", () => {
        const message = "Check https://example.com/file.ts for reference.";
        expect(extractFilePaths(message, cwd)).toEqual([]);
      });

      it("ignores http URLs", () => {
        const message = "See http://example.com/api.json for the spec.";
        expect(extractFilePaths(message, cwd)).toEqual([]);
      });

      it("ignores paths with invalid characters", () => {
        const message = "Invalid path `file<name>.ts`";
        expect(extractFilePaths(message, cwd)).toEqual([]);
      });

      it("handles message with no file paths", () => {
        const message = "I completed the task successfully.";
        expect(extractFilePaths(message, cwd)).toEqual([]);
      });
    });

    describe("complex messages", () => {
      it("extracts files from realistic assistant message", () => {
        const message = `
I've made the following changes:

1. Created \`src/components/Button.tsx\` with the button component
2. Modified \`src/App.tsx\` to import and use the new button
3. Updated \`package.json\` to add the new dependency

\`\`\`typescript:src/components/Button.tsx
export const Button = () => <button>Click me</button>;
\`\`\`

The changes have been applied successfully.
`;
        const files = extractFilePaths(message, cwd);
        expect(files).toContain("/project/src/components/Button.tsx");
        expect(files).toContain("/project/src/App.tsx");
        expect(files).toContain("/project/package.json");
      });
    });
  });

  describe("isTrackableExtension", () => {
    it("returns true for TypeScript files", () => {
      expect(isTrackableExtension("file.ts")).toBe(true);
      expect(isTrackableExtension("file.tsx")).toBe(true);
    });

    it("returns true for JavaScript files", () => {
      expect(isTrackableExtension("file.js")).toBe(true);
      expect(isTrackableExtension("file.jsx")).toBe(true);
    });

    it("returns true for common programming languages", () => {
      expect(isTrackableExtension("file.py")).toBe(true);
      expect(isTrackableExtension("file.go")).toBe(true);
      expect(isTrackableExtension("file.rs")).toBe(true);
      expect(isTrackableExtension("file.java")).toBe(true);
    });

    it("returns true for config files", () => {
      expect(isTrackableExtension("file.json")).toBe(true);
      expect(isTrackableExtension("file.yaml")).toBe(true);
      expect(isTrackableExtension("file.toml")).toBe(true);
    });

    it("returns true for documentation files", () => {
      expect(isTrackableExtension("file.md")).toBe(true);
      expect(isTrackableExtension("file.txt")).toBe(true);
    });

    it("returns false for unknown extensions", () => {
      expect(isTrackableExtension("file.xyz")).toBe(false);
      expect(isTrackableExtension("file.unknown")).toBe(false);
    });
  });
});
