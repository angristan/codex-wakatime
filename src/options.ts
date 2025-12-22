import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const WAKATIME_CONFIG = path.join(os.homedir(), ".wakatime.cfg");

interface WakaTimeConfig {
  debug?: boolean;
  api_key?: string;
  [key: string]: string | boolean | undefined;
}

/**
 * Parse INI-style config file
 */
function parseIni(content: string): WakaTimeConfig {
  const config: WakaTimeConfig = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, comments, and section headers
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("[")) {
      continue;
    }

    const equalIndex = trimmed.indexOf("=");
    if (equalIndex > 0) {
      const key = trimmed.slice(0, equalIndex).trim();
      const value = trimmed.slice(equalIndex + 1).trim();

      // Convert boolean strings
      if (value.toLowerCase() === "true") {
        config[key] = true;
      } else if (value.toLowerCase() === "false") {
        config[key] = false;
      } else {
        config[key] = value;
      }
    }
  }

  return config;
}

/**
 * Read WakaTime configuration
 */
export function getWakaTimeConfig(): WakaTimeConfig {
  try {
    if (fs.existsSync(WAKATIME_CONFIG)) {
      const content = fs.readFileSync(WAKATIME_CONFIG, "utf-8");
      return parseIni(content);
    }
  } catch {
    // Ignore errors
  }
  return {};
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
  const config = getWakaTimeConfig();
  return config.debug === true;
}

/**
 * Check if WakaTime API key is configured
 */
export function hasApiKey(): boolean {
  const config = getWakaTimeConfig();
  return typeof config.api_key === "string" && config.api_key.length > 0;
}
