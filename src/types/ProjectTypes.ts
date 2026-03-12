/**
 * Type definitions for New Project Modal
 * Centralized type exports for consistency across all sub-components
 */

import * as z from "zod";

// ── Step Types ────────────────────────────────────────────────────────────
export type NativeStep = "source" | "manual" | "zip" | "from-scratch";
export type ProviderStep = "github" | "gitlab" | "bitbucket" | "azure";
export type Step = NativeStep | ProviderStep;
export type ProviderKey = "github" | "gitlab" | "bitbucket" | "azure";

// ── Form Schema Types ─────────────────────────────────────────────────────
export const manualProjectSchema = z.object({
  repoUrl: z
    .string()
    .min(1, "Repository URL is required")
    .refine(
      (v) =>
        v.includes("github.com") ||
        v.includes("gitlab.com") ||
        v.includes("bitbucket.org") ||
        v.includes("dev.azure.com") ||
        /^[\w.-]+\/[\w.-]+$/.test(v),
      "Must be a valid repository URL or owner/repo shorthand",
    ),
});

export const fromScratchSchema = z.object({
  projectName: z
    .string()
    .min(1, "Project name is required")
    .min(3, "Project name must be at least 3 characters"),
});

export type ManualProjectFormValues = z.infer<typeof manualProjectSchema>;
export type FromScratchFormValues = z.infer<typeof fromScratchSchema>;

// ── Provider Types ────────────────────────────────────────────────────────
export interface ProviderConfig {
  label: string;
  description: string;
  emoji: React.ComponentType<{ className?: string }>;
}

export type ProviderStatusRecord = Record<ProviderKey, boolean>;
export type ProviderUsernamesRecord = Record<ProviderKey, string>;
export type ProviderCheckingRecord = Record<ProviderKey, boolean>;

// ── Repository Types ─────────────────────────────────────────────────────
export interface NormalizedRepo {
  id?: string;
  uuid?: string;
  path_with_namespace?: string;
  full_name: string;
  description?: string;
  html_url: string;
  web_url?: string;
}

// ── Props Types ───────────────────────────────────────────────────────────
export interface NewProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface RepoListProps {
  repos: NormalizedRepo[];
  loading: boolean;
  hasNextPage: boolean;
  selectedRepo: NormalizedRepo | null;
  onSelect: (repo: NormalizedRepo) => void;
  onLoadMore: () => void;
}

export interface SourceSelectorProps {
  providerStatus: ProviderStatusRecord;
  checkingStatus: ProviderCheckingRecord;
  isConnecting: boolean;
  onSelectProvider: (provider: ProviderKey) => void;
  onSelectZip: () => void;
  onSelectFromScratch: () => void;
  onSelectManual: () => void;
}

export interface ManualUrlFormProps {
  onBack: () => void;
  onSubmit: (values: ManualProjectFormValues) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface ZipUploadStepProps {
  onBack: () => void;
  error: string | null;
  isLoading: boolean;
  isValidating: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onUpload: () => Promise<void>;
  zipFile: File | null;
}

export interface FromScratchFormProps {
  onBack: () => void;
  onSubmit: (values: FromScratchFormValues) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface ProviderRepoSelectorProps {
  provider: ProviderKey;
  repos: NormalizedRepo[];
  filteredRepos: NormalizedRepo[];
  selectedRepo: NormalizedRepo | null;
  searchQuery: string;
  loading: boolean;
  hasNextPage: boolean;
  isConnecting: boolean;
  username: string;
  githubOrgs?: any[];
  githubOrgsLoading?: boolean;
  githubSelectedOrg?: string | null;
  onSearchChange: (query: string) => void;
  onSelectRepo: (repo: NormalizedRepo) => void;
  onLoadMore: () => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  onGithubOrgChange?: (org: string | null) => void;
}

// ── State Types ───────────────────────────────────────────────────────────
export interface ModalState {
  step: Step;
  isConnecting: boolean;
  apiError: string | null;
}

export interface ProviderState {
  status: ProviderStatusRecord;
  usernames: ProviderUsernamesRecord;
  checking: ProviderCheckingRecord;
}

export interface RepositoryState {
  repos: NormalizedRepo[];
  loading: boolean;
  page: number;
  hasNext: boolean;
  selectedRepo: NormalizedRepo | null;
  searchQuery: string;
}

export interface ZipState {
  file: File | null;
  validating: boolean;
  error: string | null;
}
