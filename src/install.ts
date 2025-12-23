import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const CODEX_CONFIG_PATH = path.join(os.homedir(), ".codex", "config.toml");

/**
 * Simple TOML parser for Codex config
 * Only handles the basic structure we need
 */
function parseToml(content: string): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Section header
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      currentSection = trimmed.slice(1, -1);
      if (!config[currentSection]) {
        config[currentSection] = {};
      }
      continue;
    }

    // Key-value pair
    const equalIndex = trimmed.indexOf("=");
    if (equalIndex > 0) {
      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();

      // Parse the value
      let parsedValue: unknown;

      // Array
      if (value.startsWith("[") && value.endsWith("]")) {
        // Simple array parsing - handle strings in array
        const arrayContent = value.slice(1, -1).trim();
        if (arrayContent) {
          parsedValue = arrayContent.split(",").map((item) => {
            const trimmedItem = item.trim();
            if (
              (trimmedItem.startsWith('"') && trimmedItem.endsWith('"')) ||
              (trimmedItem.startsWith("'") && trimmedItem.endsWith("'"))
            ) {
              return trimmedItem.slice(1, -1);
            }
            return trimmedItem;
          });
        } else {
          parsedValue = [];
        }
      }
      // String
      else if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        parsedValue = value.slice(1, -1);
      }
      // Boolean
      else if (value === "true") {
        parsedValue = true;
      } else if (value === "false") {
        parsedValue = false;
      }
      // Number
      else if (!Number.isNaN(Number(value))) {
        parsedValue = Number(value);
      }
      // Default to string
      else {
        parsedValue = value;
      }

      if (currentSection) {
        (config[currentSection] as Record<string, unknown>)[key] = parsedValue;
      } else {
        config[key] = parsedValue;
      }
    }
  }

  return config;
}

/**
 * Simple TOML stringifier for Codex config
 */
function stringifyToml(config: Record<string, unknown>): string {
  const lines: string[] = [];

  // First, write top-level non-object values
  for (const [key, value] of Object.entries(config)) {
    if (typeof value !== "object" || Array.isArray(value)) {
      lines.push(`${key} = ${formatTomlValue(value)}`);
    }
  }

  // Then, write sections
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(`[${key}]`);
      for (const [subKey, subValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        lines.push(`${subKey} = ${formatTomlValue(subValue)}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
}

function formatTomlValue(value: unknown): string {
  if (Array.isArray(value)) {
    const items = value.map((item) =>
      typeof item === "string" ? `"${item}"` : String(item),
    );
    return `[${items.join(", ")}]`;
  }
  if (typeof value === "string") {
    return `"${value}"`;
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function normalizeNotifyValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.slice();
  if (typeof value === "string") return [value];
  return [];
}

function hasNotifyEntry(entries: unknown[], command: string): boolean {
  return entries.some(
    (entry) => typeof entry === "string" && entry === command,
  );
}

function removeNotifyEntry(entries: unknown[], command: string): unknown[] {
  return entries.filter(
    (entry) => !(typeof entry === "string" && entry === command),
  );
}

/**
 * Get the path to the installed codex-wakatime binary
 */
function getPluginCommand(): string[] {
  // Use the globally installed command if available
  return ["codex-wakatime"];
}

/**
 * Install the notification hook into Codex config
 */
export function installHook(): void {
  console.log("Installing codex-wakatime notification hook...");

  // Ensure .codex directory exists
  const codexDir = path.dirname(CODEX_CONFIG_PATH);
  if (!fs.existsSync(codexDir)) {
    fs.mkdirSync(codexDir, { recursive: true });
    console.log(`Created ${codexDir}`);
  }

  // Read existing config or create new one
  let config: Record<string, unknown> = {};
  if (fs.existsSync(CODEX_CONFIG_PATH)) {
    try {
      const content = fs.readFileSync(CODEX_CONFIG_PATH, "utf-8");
      config = parseToml(content);
      console.log("Found existing Codex config");
    } catch {
      console.warn("Could not parse existing config, creating new one");
    }
  }

  // Get the plugin command
  const pluginCommand = getPluginCommand()[0];

  // Check if already installed
  const existingNotify = normalizeNotifyValue(config.notify);
  if (hasNotifyEntry(existingNotify, pluginCommand)) {
    console.log("codex-wakatime is already configured");
    return;
  }

  // Set the notify command
  config.notify = [...existingNotify, pluginCommand];

  // Write the config
  const newContent = stringifyToml(config);
  fs.writeFileSync(CODEX_CONFIG_PATH, newContent);

  console.log(`Updated ${CODEX_CONFIG_PATH}`);
  console.log("codex-wakatime notification hook installed successfully!");
  console.log("");
  console.log(
    "Make sure you have your WakaTime API key configured in ~/.wakatime.cfg",
  );
}

/**
 * Uninstall the notification hook from Codex config
 */
export function uninstallHook(): void {
  console.log("Uninstalling codex-wakatime notification hook...");

  if (!fs.existsSync(CODEX_CONFIG_PATH)) {
    console.log("No Codex config found, nothing to uninstall");
    return;
  }

  try {
    const content = fs.readFileSync(CODEX_CONFIG_PATH, "utf-8");
    const config = parseToml(content);

    const pluginCommand = getPluginCommand()[0];
    const existingNotify = normalizeNotifyValue(config.notify);
    if (!hasNotifyEntry(existingNotify, pluginCommand)) {
      console.log("codex-wakatime was not configured");
      return;
    }

    const updatedNotify = removeNotifyEntry(existingNotify, pluginCommand);
    if (updatedNotify.length === 0) {
      delete config.notify;
    } else {
      config.notify = updatedNotify;
    }

    const newContent = stringifyToml(config);
    fs.writeFileSync(CODEX_CONFIG_PATH, newContent);
    console.log("codex-wakatime notification hook removed");
  } catch (err) {
    console.error("Error uninstalling hook:", err);
  }
}
