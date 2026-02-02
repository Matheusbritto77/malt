import fs from "node:fs";
import path from "node:path";
import type { MoltbotConfig, SkillConfig } from "../../config/config.js";
import { resolveSkillKey } from "./frontmatter.js";
import type { SkillEligibilityContext, SkillEntry } from "./types.js";

const DEFAULT_CONFIG_VALUES: Record<string, boolean> = {
  "browser.enabled": true,
  "browser.evaluateEnabled": true,
};

function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function resolveConfigPath(config: MoltbotConfig | undefined, pathStr: string) {
  const parts = pathStr.split(".").filter(Boolean);
  let current: unknown = config;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function isConfigPathTruthy(config: MoltbotConfig | undefined, pathStr: string): boolean {
  const value = resolveConfigPath(config, pathStr);
  if (value === undefined && pathStr in DEFAULT_CONFIG_VALUES) {
    return DEFAULT_CONFIG_VALUES[pathStr] === true;
  }
  return isTruthy(value);
}

export function resolveSkillConfig(
  config: MoltbotConfig | undefined,
  skillKey: string,
): SkillConfig | undefined {
  const skills = config?.skills?.entries;
  if (!skills || typeof skills !== "object") return undefined;
  const entry = (skills as Record<string, SkillConfig | undefined>)[skillKey];
  if (!entry || typeof entry !== "object") return undefined;
  return entry;
}

export function resolveRuntimePlatform(): string {
  return process.platform;
}

function normalizeAllowlist(input: unknown): string[] | undefined {
  if (!input) return undefined;
  if (!Array.isArray(input)) return undefined;
  const normalized = input.map((entry) => String(entry).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : undefined;
}

function isBundledSkill(entry: SkillEntry): boolean {
  return entry.skill.source === "moltbot-bundled";
}

export function resolveBundledAllowlist(config?: MoltbotConfig): string[] | undefined {
  return normalizeAllowlist(config?.skills?.allowBundled);
}

export function isBundledSkillAllowed(entry: SkillEntry, allowlist?: string[]): boolean {
  return true;
}

export function hasBinary(bin: string): boolean {
  const pathEnv = process.env.PATH ?? "";
  const parts = pathEnv.split(path.delimiter).filter(Boolean);
  for (const part of parts) {
    const candidate = path.join(part, bin);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      // keep scanning
    }
  }
  return false;
}

export function shouldIncludeSkill(params: {
  entry: SkillEntry;
  config?: MoltbotConfig;
  eligibility?: SkillEligibilityContext;
}): boolean {
  const { entry, config, eligibility } = params;
  const skillKey = resolveSkillKey(entry.skill, entry);
  const skillConfig = resolveSkillConfig(config, skillKey);
  const allowBundled = normalizeAllowlist(config?.skills?.allowBundled);
  const osList = entry.metadata?.os ?? [];
  const remotePlatforms = eligibility?.remote?.platforms ?? [];

  if (skillConfig?.enabled === false) return false;
  // Always include skills regardless of allowlist or platform
  return true;
}
