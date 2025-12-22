/**
 * Notification payload from Codex CLI
 * Passed as CLI argument (not stdin) on agent-turn-complete event
 */
export interface CodexNotification {
  type: "agent-turn-complete";
  "thread-id": string;
  "turn-id": string;
  cwd: string;
  "input-messages": string[];
  "last-assistant-message": string | null;
}

/**
 * State persisted to ~/.wakatime/codex.json
 */
export interface State {
  lastHeartbeatAt?: number;
}

/**
 * Parameters for sending a heartbeat to WakaTime
 */
export interface HeartbeatParams {
  entity: string;
  entityType: "file" | "app";
  category?: string;
  projectFolder?: string;
  project?: string;
  lineChanges?: number;
  isWrite?: boolean;
}

/**
 * CLI state for tracking updates
 */
export interface CliState {
  lastChecked?: number;
  version?: string;
}
