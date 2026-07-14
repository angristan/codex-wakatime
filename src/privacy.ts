import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { HeartbeatParams } from "./types.js";

const WAKATIME_CONFIG = path.join(os.homedir(), ".wakatime.cfg");

interface PrivacyConfig {
  root?: string;
  project?: string;
  entityRoot?: string;
}

function parseConfig(): PrivacyConfig {
  const config: PrivacyConfig = {
    root: process.env.CODEX_WAKATIME_PRIVACY_ROOT,
    project: process.env.CODEX_WAKATIME_PRIVACY_PROJECT,
    entityRoot: process.env.CODEX_WAKATIME_PRIVACY_ENTITY_ROOT,
  };

  if (!fs.existsSync(WAKATIME_CONFIG)) {
    return config;
  }

  let content: string;
  try {
    content = fs.readFileSync(WAKATIME_CONFIG, "utf-8");
  } catch {
    return config;
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (!value) continue;

    if (!config.root && key === "codex_wakatime_privacy_root") {
      config.root = value;
    }
    if (!config.project && key === "codex_wakatime_privacy_project") {
      config.project = value;
    }
    if (!config.entityRoot && key === "codex_wakatime_privacy_entity_root") {
      config.entityRoot = value;
    }
  }

  return config;
}

function pathModuleFor(value: string): typeof path.posix | typeof path.win32 {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\")
    ? path.win32
    : path.posix;
}

function resolvePath(value: string): string {
  return pathModuleFor(value).resolve(value);
}

function isUnderRoot(value: string | undefined, root: string): boolean {
  if (!value) return false;
  const platformPath = pathModuleFor(root);
  const normalized = platformPath.resolve(value);
  const relative = platformPath.relative(root, normalized);
  return (
    relative === "" ||
    (!!relative &&
      !relative.startsWith("..") &&
      !platformPath.isAbsolute(relative))
  );
}

function vagueFilePath(entity: string, entityRoot: string): string {
  const platformPath = pathModuleFor(entityRoot);
  const ext = pathModuleFor(entity).extname(entity);
  return platformPath.join(entityRoot, `vague_file${ext}`);
}

export function anonymizeHeartbeat(params: HeartbeatParams): HeartbeatParams {
  const config = parseConfig();
  if (!config.root || !config.project) {
    return params;
  }

  const root = resolvePath(config.root);
  const entityRoot = resolvePath(config.entityRoot ?? root);
  const isCodexHeartbeat =
    isUnderRoot(params.entity, root) || isUnderRoot(params.projectFolder, root);

  if (!isCodexHeartbeat) {
    return params;
  }

  if (params.entityType === "file") {
    return {
      ...params,
      entity: vagueFilePath(params.entity, entityRoot),
      projectFolder: root,
      project: config.project,
    };
  }

  return {
    ...params,
    entity: vagueFilePath("vague_file.txt", entityRoot),
    entityType: "file",
    projectFolder: root,
    project: config.project,
  };
}
