/**
 * projects.ts — Project Zustand store backed by real backend APIs.
 *
 * The backend uses its own status terminology (queued/running/done/error/archived).
 * We map those to the UI status terms (analyzing/completed/failed/archived).
 */
import { create } from "zustand";
import { projectsApi, ApiProject, ApiProjectStatus } from "@/lib/api";

// ── Status mapping ────────────────────────────────────────────────────────────

export type ProjectStatus = "analyzing" | "completed" | "failed" | "archived";

export function mapApiStatus(apiStatus: ApiProjectStatus): ProjectStatus {
  switch (apiStatus) {
    case "queued":
    case "running":
      return "analyzing";
    case "done":
      return "completed";
    case "archived":
      return "archived";
    case "error":
    default:
      return "failed";
  }
}

// ── Project UI model ──────────────────────────────────────────────────────────

export interface Project {
  id: string; // = ApiProject._id
  name: string; // = repoName
  repoUrl: string;
  repoOwner: string;
  status: ProjectStatus;
  apiStatus: ApiProjectStatus; // raw status from API, needed for PATCH /archive
  createdAt: string;
  updatedAt: string;
  // Documentation fields (populated after a successful pipeline run)
  readme?: string;
  apiReference?: string;
  schemaDocs?: string;
  internalDocs?: string;
  securityReport?: string;
}

/** Convert an API project to the UI model. */
export function fromApiProject(p: ApiProject): Project {
  return {
    id: p._id,
    name: p.meta?.name || p.repoName || p.repoUrl.split("/").pop() || p.repoUrl,
    repoOwner: p.repoOwner || "",
    repoUrl: p.repoUrl,
    status: mapApiStatus(p.status),
    apiStatus: p.status,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    readme: p.output?.readme,
    apiReference: p.output?.apiReference,
    schemaDocs: p.output?.schemaDocs,
    internalDocs: p.output?.internalDocs,
    securityReport: p.output?.securityReport,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ProjectState {
  projects: Project[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;

  /** Fetch (or refresh) the project list. */
  fetchProjects: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sort?: string;
    search?: string;
  }) => Promise<void>;

  /** Create a new project and start the pipeline. Returns the created project. */
  createProject: (repoUrl: string) => Promise<Project & { streamUrl: string }>;

  /** Hard-delete a project. */
  deleteProject: (id: string) => Promise<void>;

  /** Archive a project. */
  archiveProject: (id: string) => Promise<void>;

  /** Re-run the pipeline for a done/error project. Returns the updated project. */
  retryProject: (id: string) => Promise<Project & { streamUrl: string }>;

  /** Fetch a single project by ID (used by detail pages). */
  getProject: (id: string) => Promise<Project>;

  /** Fetch a single project by ID without updating the cache (used by SSE handler). */
  getProjectData: (id: string) => Promise<{
    project: ApiProject;
    editedSections: any;
    effectiveOutput: any;
    lastSyncedCommit: string;
  }>;

  /** Update a project in the local cache (e.g. after SSE stream completes). */
  updateLocalProject: (id: string, changes: Partial<Project>) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  error: null,

  fetchProjects: async (params = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await projectsApi.list(params);
      set({
        projects: data.projects.map(fromApiProject),
        total: data.total,
        page: data.page,
        totalPages: data.totalPages,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message ?? "Failed to load projects.",
      });
    }
  },

  createProject: async (repoUrl) => {
    const data = await projectsApi.create(repoUrl);
    const project = fromApiProject(data.project);
    // Optimistically add to local list
    set((state) => ({
      projects: [project, ...state.projects],
      total: state.total + 1,
    }));
    return { ...project, streamUrl: data.streamUrl };
  },

  deleteProject: async (id) => {
    await projectsApi.delete(id);
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      total: Math.max(0, state.total - 1),
    }));
  },

  archiveProject: async (id) => {
    const data = await projectsApi.update(id, { status: "archived" });
    const updated = fromApiProject(data.project);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? updated : p)),
    }));
  },

  retryProject: async (id) => {
    const data = await projectsApi.retry(id);
    const project = fromApiProject(data.project);
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? project : p)),
    }));
    return { ...project, streamUrl: data.streamUrl };
  },

  getProject: async (id) => {
    const data = await projectsApi.get(id);
    const project = fromApiProject(data.project);

    // Update cache
    set((state) => {
      const exists = state.projects.some((p) => p.id === id);

      return {
        projects: exists
          ? state.projects.map((p) => (p.id === id ? project : p))
          : [project, ...state.projects],
      };
    });

    return project;
  },

  getProjectData: async (id) => {
    const data = await projectsApi.get(id);
    const project = data.project;

    return {
      project,
      editedSections: data.editedSections,
      effectiveOutput: data.effectiveOutput,
      lastSyncedCommit: data.lastSyncedCommit,
    } as {
      project: ApiProject;
      editedSections: any;
      effectiveOutput: any;
      lastSyncedCommit: string;
    };
  },

  updateLocalProject: (id, changes) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...changes } : p,
      ),
    }));
  },
}));
