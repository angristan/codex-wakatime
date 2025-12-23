import * as path from "node:path";

/**
 * Patterns to extract file paths from assistant messages
 */
const PATTERNS = [
  // Code block headers: ```typescript:src/index.ts or ```ts:src/index.ts
  /```\w*:([^\n`]+)/g,

  // Backtick paths with extension: `src/foo/bar.ts`
  /`([^`\s]+\.\w{1,6})`/g,

  // Action patterns: Read/List/Created/Modified/Updated/Wrote/Edited/Deleted file.ts
  /(?:Read|List|Create|Created|Modify|Modified|Update|Updated|Write|Wrote|Edit|Edited|Delete|Deleted)\s+`?([^\s`\n]+\.\w{1,6})`?/gi,

  // File path in quotes: "src/file.ts" or 'src/file.ts'
  /["']([^"'\s]+\.\w{1,6})["']/g,
];

/**
 * Common file extensions to recognize
 */
const VALID_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  "js",
  "ts",
  "jsx",
  "tsx",
  "mjs",
  "cjs",
  "mts",
  "cts",
  // Web
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  // Data/Config
  "json",
  "yaml",
  "yml",
  "toml",
  "xml",
  "csv",
  // Programming languages
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "scala",
  "c",
  "cpp",
  "cc",
  "cxx",
  "h",
  "hpp",
  "cs",
  "fs",
  "swift",
  "m",
  "mm",
  // Shell/Scripts
  "sh",
  "bash",
  "zsh",
  "fish",
  "ps1",
  "bat",
  "cmd",
  // Documentation
  "md",
  "mdx",
  "rst",
  "txt",
  // Other
  "sql",
  "graphql",
  "gql",
  "proto",
  "env",
  "lock",
  "dockerfile",
]);

/**
 * Check if a string looks like a valid file path
 */
function isValidFilePath(p: string): boolean {
  // Must not be empty
  if (!p || p.length === 0) return false;

  // Must not be a URL
  if (p.startsWith("http://") || p.startsWith("https://") || p.includes("://"))
    return false;

  // Must not contain invalid characters
  if (/[<>|?*]/.test(p)) return false;

  // Must have a file extension
  const ext = path.extname(p).slice(1).toLowerCase();
  if (!ext) return false;

  // Extension should be reasonable length
  if (ext.length > 6) return false;

  // Prefer known extensions, but allow others
  // (to support less common file types)
  return true;
}

/**
 * Normalize a file path (resolve relative paths, clean up)
 */
function normalizePath(filePath: string, cwd: string): string {
  // Remove leading/trailing whitespace
  const cleaned = filePath.trim();

  // If absolute, return as-is
  if (path.isAbsolute(cleaned)) {
    return path.normalize(cleaned);
  }

  // Resolve relative to cwd
  return path.normalize(path.join(cwd, cleaned));
}

/**
 * Extract file paths from an assistant message
 *
 * @param message - The assistant's response message
 * @param cwd - Current working directory for resolving relative paths
 * @returns Array of absolute file paths found in the message
 */
export function extractFilePaths(message: string, cwd: string): string[] {
  if (!message || message.length === 0) {
    return [];
  }

  const files = new Set<string>();

  for (const pattern of PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;

    for (const match of message.matchAll(pattern)) {
      // Get the captured group (file path)
      const filePath = match[1];

      if (filePath && isValidFilePath(filePath)) {
        const normalized = normalizePath(filePath, cwd);
        files.add(normalized);
      }
    }
  }

  return Array.from(files);
}

/**
 * Check if a file extension is commonly tracked
 */
export function isTrackableExtension(filePath: string): boolean {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return VALID_EXTENSIONS.has(ext);
}
