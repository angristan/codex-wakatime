import * as path from "node:path";
import { extractFiles } from "./extractor.js";
import { installHook, uninstallHook } from "./install.js";
import { LogLevel, logger } from "./logger.js";
import { isDebugEnabled } from "./options.js";
import { shouldSendHeartbeat, updateLastHeartbeat } from "./state.js";
import type { CodexNotification } from "./types.js";
import { ensureCliInstalled, sendHeartbeat } from "./wakatime.js";

/**
 * Parse the notification JSON from CLI argument
 * Codex passes the notification as a JSON string argument
 */
function parseNotification(): CodexNotification | undefined {
  const jsonArg = process.argv[2];
  if (!jsonArg) {
    return undefined;
  }

  // Skip if it looks like a flag
  if (jsonArg.startsWith("-")) {
    return undefined;
  }

  try {
    const notification = JSON.parse(jsonArg) as CodexNotification;
    return notification;
  } catch (err) {
    logger.warnException(err);
    return undefined;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle install/uninstall flags
  if (args.includes("--install")) {
    installHook();
    return;
  }

  if (args.includes("--uninstall")) {
    uninstallHook();
    return;
  }

  // Set log level based on debug config
  if (isDebugEnabled()) {
    logger.setLevel(LogLevel.DEBUG);
  }

  logger.debug("codex-wakatime started");

  // Parse notification from CLI argument
  const notification = parseNotification();
  if (!notification) {
    logger.debug("No valid notification received");
    return;
  }

  logger.debug(`Received notification: ${notification.type}`);

  // Only handle agent-turn-complete events
  if (notification.type !== "agent-turn-complete") {
    logger.debug(`Ignoring notification type: ${notification.type}`);
    return;
  }

  // Check rate limiting
  if (!shouldSendHeartbeat()) {
    logger.debug("Skipping heartbeat due to rate limiting");
    return;
  }

  // Ensure CLI is installed
  const cliAvailable = await ensureCliInstalled();
  if (!cliAvailable) {
    logger.warn("wakatime-cli not available, skipping heartbeat");
    return;
  }

  // Extract file paths from assistant message
  const assistantMessage = notification["last-assistant-message"] ?? "";
  const cwd = notification.cwd;
  const files = extractFiles(assistantMessage, cwd);

  logger.debug(`Extracted ${files.length} files from message`);

  if (files.length > 0) {
    // Send per-file heartbeats
    for (const file of files) {
      logger.debug(
        `Sending heartbeat for file: ${file.path} (isWrite: ${file.isWrite})`,
      );
      sendHeartbeat({
        entity: file.path,
        entityType: "file",
        category: "ai coding",
        projectFolder: cwd,
        isWrite: file.isWrite,
      });
    }
  } else {
    // Fallback: project-level heartbeat
    logger.debug(`Sending project heartbeat for: ${cwd}`);
    sendHeartbeat({
      entity: cwd,
      entityType: "app",
      category: "ai coding",
      project: path.basename(cwd),
    });
  }

  // Update rate limiting state
  updateLastHeartbeat();

  logger.debug("codex-wakatime completed");
}

// Run main
main().catch((err) => {
  logger.errorException(err);
  process.exit(1);
});
