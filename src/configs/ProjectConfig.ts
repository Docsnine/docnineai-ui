/**
 * Centralized constants and configs for project creation flow
 */
import {
  GithubIcon,
  GitlabIcon,
  Code2Icon,
  CloudCheckIcon,
} from "lucide-react";
import type {
  ProviderKey,
  ProviderConfig,
} from "@/types/ProjectTypes";

// ── Storage Keys ──────────────────────────────────────────────────────────
export const SELECTED_ORG_KEY = "docnine:selected-org" as const;

export const PROVIDER_OAUTH_KEYS = {
  github: "__docnine_github_oauth_result",
  gitlab: "__docnine_gitlab_oauth_result",
  bitbucket: "__docnine_bitbucket_oauth_result",
  azure: "__docnine_azure_oauth_result",
} as const;

// ── Provider Configuration ────────────────────────────────────────────────
export const PROVIDER_CONFIG: Record<ProviderKey, ProviderConfig> = {
  github: {
    label: "GitHub",
    description: "Import Repositories",
    emoji: GithubIcon,
  },
  gitlab: {
    label: "GitLab",
    description: "Import Repositories",
    emoji: GitlabIcon,
  },
  bitbucket: {
    label: "Bitbucket",
    description: "Import Repositories",
    emoji: Code2Icon,
  },
  azure: {
    label: "Azure DevOps",
    description: "Import Repositories",
    emoji: CloudCheckIcon,
  },
} as const;

// ── Initial Provider State ────────────────────────────────────────────────
export const INITIAL_PROVIDER_STATUS = {
  github: false,
  gitlab: false,
  bitbucket: false,
  azure: false,
} as const;

export const INITIAL_PROVIDER_USERNAMES = {
  github: "",
  gitlab: "",
  bitbucket: "",
  azure: "",
} as const;

export const INITIAL_PROVIDER_CHECKING = {
  github: false,
  gitlab: false,
  bitbucket: false,
  azure: false,
} as const;

// ── API Configuration ────────────────────────────────────────────────────
export const REPOS_PER_PAGE = 30;
export const ZIP_MAX_SIZE_MB = 100;
export const ZIP_MAX_SIZE_BYTES = ZIP_MAX_SIZE_MB * 1024 * 1024;
export const OAUTH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
export const OAUTH_POLL_INTERVAL_MS = 300;

// ── UI Configuration ──────────────────────────────────────────────────────
export const MODAL_CLOSE_DELAY_MS = 200 as const;
export const SUCCESS_MESSAGE_DURATION_MS = 2500 as const;

// ── Utility Functions ─────────────────────────────────────────────────────

export function readSavedOrg(): string | null {
  try {
    return localStorage.getItem(SELECTED_ORG_KEY) || null;
  } catch {
    return null;
  }
}

export function saveOrg(org: string | null): void {
  try {
    localStorage.setItem(SELECTED_ORG_KEY, org ?? "");
  } catch {
    /* ignore */
  }
}

export function readOAuthResult(provider: ProviderKey): any | null {
  try {
    const key = PROVIDER_OAUTH_KEYS[provider];
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearOAuthResult(provider: ProviderKey): void {
  try {
    const key = PROVIDER_OAUTH_KEYS[provider];
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
