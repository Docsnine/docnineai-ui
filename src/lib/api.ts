/**
 * api.ts — Typed API client for the Docnine backend.
 *
 * All requests go through `apiFetch()` which:
 *   1. Attaches the Authorization header when an access token is stored.
 *   2. On a 401 response, automatically attempts a silent token refresh via
 *      POST /auth/refresh (relies on the httpOnly refreshToken cookie).
 *   3. Retries the original request once with the new token.
 *   4. Throws a structured ApiError on failure.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiError {
  code: string
  message: string
  fields?: Array<{ field: string; message: string }>
}

export class ApiException extends Error {
  status: number
  code: string
  fields?: ApiError['fields']

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.name = 'ApiException'
    this.status = status
    this.code = error.code
    this.fields = error.fields
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// In dev the Vite proxy forwards these paths to http://localhost:3000.
// In production this will be the deployed backend origin.
export const API_BASE = import.meta.env.VITE_API_URL || ''

// In-memory access token store (not localStorage — too easy to steal).
// The refresh token lives in an httpOnly cookie managed by the browser.
let _accessToken: string | null = null

export function getAccessToken() {
  return _accessToken
}

export function setAccessToken(token: string | null) {
  _accessToken = token
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------
let _isRefreshing = false
let _refreshPromise: Promise<string | null> | null = null

/** Attempt a silent token refresh via the httpOnly refresh-token cookie. */
async function refreshToken(): Promise<string | null> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise

  _isRefreshing = true
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // send the httpOnly cookie
      })
      if (!res.ok) return null
      const json = await res.json()
      const token: string = json.data?.accessToken ?? json.accessToken ?? null
      if (token) setAccessToken(token)
      return token
    } catch {
      return null
    } finally {
      _isRefreshing = false
      _refreshPromise = null
    }
  })()
  return _refreshPromise
}

/**
 * apiFetch — the main HTTP client.
 *
 * Automatically handles JSON serialization, auth headers, and token refresh.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const { skipAuth, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers)
  
  if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = _accessToken
  if (token && !skipAuth) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const doFetch = (t: string | null) =>
    fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      credentials: 'include',
      headers: t
        ? (() => {
            headers.set('Authorization', `Bearer ${t}`)
            return headers
          })()
        : headers,
    })

  let res = await doFetch(token)

  // Silently attempt token refresh on 401 and retry once.
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshToken()
    if (newToken) {
      res = await doFetch(newToken)
    }
  }

  // Parse JSON response body.
  let body: any
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    body = await res.json()
  } else if (!res.ok) {
    // Non-JSON error (e.g. 502 from proxy)
    throw new ApiException(res.status, {
      code: 'NETWORK_ERROR',
      message: `Server returned ${res.status} ${res.statusText}`,
    })
  } else {
    // Successful non-JSON (e.g. blob downloads handled elsewhere)
    return res as unknown as T
  }

  if (!res.ok) {
    const err: ApiError = body?.error ?? { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' }
    throw new ApiException(res.status, err)
  }

  // Return `data` from the standard { success, data } envelope if present.
  return (body?.data ?? body) as T
}

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

// ── Auth ──────────────────────────────────────────────────────────────────
export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  provider?: 'email' | 'github' | 'google'
  githubConnected?: boolean
  githubUsername?: string
  googleId?: string
  googleUsername?: string
  createdAt: string
}

export interface AuthResponse {
  user: User
  accessToken: string
}

export const authApi = {
  signup: (body: { name: string; email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify(body), skipAuth: true }),

  login: (body: { email: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body), skipAuth: true }),

  refresh: () =>
    apiFetch<AuthResponse>('/auth/refresh', { method: 'POST', skipAuth: true }),

  logout: () =>
    apiFetch<void>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<{ user: User }>('/auth/me'),

  verifyEmail: (token: string) =>
    apiFetch<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuth: true,
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    }),

  resetPassword: (body: { token: string; password: string; confirmPassword: string }) =>
    apiFetch<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    }),

  updateProfile: (body: { name?: string; email?: string }) =>
    apiFetch<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    apiFetch<void>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Google Docs export — settings-level (no project ID needed) */
  getGoogleDocsStatus: () =>
    apiFetch<{ connected: boolean; email?: string; name?: string; connectedAt?: string }>(
      '/auth/google-docs/status',
    ),

  getGoogleDocsStartUrl: () =>
    apiFetch<{ url: string }>('/auth/google-docs/start'),

  disconnectGoogleDocs: () =>
    apiFetch<void>('/auth/google-docs', { method: 'DELETE' }),
}

// ── GitHub ────────────────────────────────────────────────────────────────

export interface GitHubStatus {
  connected: boolean
  githubUsername?: string
  scopes?: string[]
  connectedAt?: string
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  description?: string
  private: boolean
  updated_at: string
  language?: string
}

export interface GitHubReposResponse {
  repos: GitHubRepo[]
  page: number
  perPage: number
  hasNextPage: boolean
}

export interface GitHubOrg {
  id: number
  login: string
  description: string | null
  avatarUrl: string
}

export const githubApi = {
  getStatus: () =>
    apiFetch<GitHubStatus>('/github/status'),

  getOAuthStartUrl: () =>
    apiFetch<{ url: string }>('/github/oauth/start'),

  getOrgs: () =>
    apiFetch<{ orgs: GitHubOrg[] }>('/github/orgs'),

  getRepos: (params: { page?: number; perPage?: number; type?: string; sort?: string; org?: string } = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.perPage) qs.set('perPage', String(params.perPage))
    if (params.type) qs.set('type', params.type)
    if (params.sort) qs.set('sort', params.sort)
    if (params.org) qs.set('org', params.org)
    return apiFetch<GitHubReposResponse>(`/github/repos?${qs}`)
  },

  disconnect: () =>
    apiFetch<void>('/github/disconnect', { method: 'DELETE' }),
}

// ── Projects ──────────────────────────────────────────────────────────────

export type ApiProjectStatus = 'queued' | 'running' | 'done' | 'error' | 'archived'

export interface ApiProjectMeta {
  name: string;
  description: string | null;
  language: string;
  stars: number;
  defaultBranch: string;
  topics: string[];
}

export interface ApiProjectStats {
  filesAnalysed: number;
  endpoints: number;
  models: number;
  relationships: number;
  components: number;
}

export interface ApiProjectSecurity {
  counts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  score: number;
  grade: string;
  findings: any[];
}

export interface ApiProjectOutput {
  readme?: string;
  internalDocs?: string;
  apiReference?: string;
  schemaDocs?: string;
  securityReport?: string;
}

export interface ApiProject {
  meta: ApiProjectMeta;
  _id: string;
  userId: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  jobId: string;
  status: ApiProjectStatus;
  techStack: string[];
  lastDocumentedCommit: string;
  stats: ApiProjectStats;
  security: ApiProjectSecurity;
  output: ApiProjectOutput;
  editedOutput: ApiProjectOutput;
  editedSections: string[];
  createdAt: string;
  updatedAt: string;
  chatSessionId?: string;
}

export interface ProjectGetResponse {
  project: ApiProject;
  effectiveOutput: ApiProjectOutput;
  editedSections: string[];
  lastSyncedCommit: string;
}

export interface PipelineEvent {
  step: string
  status?: string
  msg?: string
  detail?: string
  ts: string
  result?: Record<string, unknown>
}

export interface ProjectsListResponse {
  projects: ApiProject[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export const projectsApi = {
  list: (params: {
    page?: number
    limit?: number
    status?: string
    sort?: string
    search?: string
  } = {}) => {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    if (params.status && params.status !== 'all') qs.set('status', params.status)
    if (params.sort) qs.set('sort', params.sort)
    if (params.search) qs.set('search', params.search)
    return apiFetch<ProjectsListResponse>(`/projects?${qs}`)
  },

  get: (id: string) =>
    apiFetch<ProjectGetResponse>(`/projects/${id}`),

  create: (repoUrl: string) =>
    apiFetch<{ project: ApiProject; streamUrl: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ repoUrl }),
    }),

  update: (id: string, body: { status: 'archived' }) =>
    apiFetch<{ project: ApiProject }>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch<void>(`/projects/${id}`, { method: 'DELETE' }),

  retry: (id: string) =>
    apiFetch<{ project: ApiProject; streamUrl: string }>(`/projects/${id}/retry`, {
      method: 'POST',
    }),

  /** Download an export as a Blob. Caller triggers the browser download. */
  exportBlob: async (id: string, type: 'pdf' | 'yaml') => {
    const token = _accessToken
    const res = await fetch(`${API_BASE}/projects/${id}/export/${type}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new ApiException(res.status, { code: 'EXPORT_FAILED', message: 'Export failed.' })
    return res.blob()
  },

  exportNotion: (id: string) =>
    apiFetch<{ mainPageUrl: string; mainPageId: string; childPages: string[] }>(
      `/projects/${id}/export/notion`,
      { method: 'POST' },
    ),

  /** Get Google Docs OAuth connect URL for the project owner. */
  getGoogleDocsConnectUrl: (id: string) =>
    apiFetch<{ url: string }>(`/projects/${id}/export/google-docs/connect`),

  /** Check whether the user has connected their Google Drive. */
  getGoogleDocsStatus: (id: string) =>
    apiFetch<{ connected: boolean; email?: string; name?: string; connectedAt?: string }>(
      `/projects/${id}/export/google-docs/status`,
    ),

  /** Disconnect Google Drive tokens for the current user. */
  disconnectGoogleDocs: (id: string) =>
    apiFetch<void>(`/projects/${id}/export/google-docs`, { method: 'DELETE' }),

  /** Export project docs to a new Google Doc. */
  exportGoogleDocs: (id: string) =>
    apiFetch<{ documentId: string; documentUrl: string; title: string }>(
      `/projects/${id}/export/google-docs`,
      { method: 'POST' },
    ),

  /** Fetch the persisted pipeline event log for a project (last 200 events). */
  getEvents: (id: string) =>
    apiFetch<{ events: PipelineEvent[]; status: string; jobId: string }>(`/projects/${id}/events`),
}
