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
import { fetchEventSource } from '@microsoft/fetch-event-source'

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

  /** Notion export — settings-level (per-user API key storage) */
  getNotionStatus: () =>
    apiFetch<{ connected: boolean; parentPageId?: string; workspaceName?: string | null; connectedAt?: string }>(
      '/auth/notion/status',
    ),

  connectNotion: (body: { apiKey: string; parentPageId: string; workspaceName?: string }) =>
    apiFetch<{ connected: boolean; parentPageId: string; workspaceName?: string | null; connectedAt: string }>(
      '/auth/notion/connect',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  disconnectNotion: () =>
    apiFetch<void>('/auth/notion', { method: 'DELETE' }),
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

export interface ApiProjectEditedSection {
  section: string
  editedAt: string
  stale: boolean
}

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
  editedSections: ApiProjectEditedSection[];
  createdAt: string;
  updatedAt: string;
  chatSessionId?: string;
}

export interface ProjectGetResponse {
  project: ApiProject;
  effectiveOutput: ApiProjectOutput;
  editedSections: ApiProjectEditedSection[];
  lastSyncedCommit: string;
  shareRole: 'owner' | 'editor' | 'viewer';
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

  /** Save a user edit for one documentation section. */
  saveEdit: (id: string, section: string, content: string) =>
    apiFetch<{ project: ApiProject; effectiveOutput: ApiProjectOutput; editedSections: ApiProjectEditedSection[] }>(
      `/projects/${id}/docs/${section}`,
      { method: 'PATCH', body: JSON.stringify({ content }) },
    ),

  /** Accept the latest AI-generated content for a stale section (clears the user edit). */
  acceptAI: (id: string, section: string) =>
    apiFetch<{ project: ApiProject; effectiveOutput: ApiProjectOutput; editedSections: ApiProjectEditedSection[] }>(
      `/projects/${id}/docs/${section}/accept-ai`,
      { method: 'POST' },
    ),
}

// ── Version history ───────────────────────────────────────────────────────

export interface DocVersion {
  _id: string
  projectId: string
  section: string
  source: 'ai_full' | 'ai_incremental' | 'user'
  meta: {
    commitSha?: string
    changedFiles?: string[]
    agentsRun?: string[]
    changeSummary?: string
  }
  createdAt: string
  updatedAt: string
  content?: string // only present when fetched individually
}

export const versionsApi = {
  list: (projectId: string, section: string) =>
    apiFetch<{ versions: DocVersion[]; total: number; page: number; limit: number }>(
      `/projects/${projectId}/docs/${section}/versions`,
    ),

  get: (projectId: string, section: string, versionId: string) =>
    apiFetch<{ version: DocVersion & { content: string } }>(
      `/projects/${projectId}/docs/${section}/versions/${versionId}`,
    ),

  restore: (projectId: string, section: string, versionId: string) =>
    apiFetch<{ project: ApiProject; effectiveOutput: ApiProjectOutput; editedSections: ApiProjectEditedSection[] }>(
      `/projects/${projectId}/docs/${section}/versions/${versionId}/restore`,
      { method: 'POST' },
    ),
}

// ── Attachments (Other Docs) ──────────────────────────────────────────────

export interface ApiAttachment {
  _id: string
  projectId: string
  userId: string
  uploaderName: string
  fileName: string
  mimeType: string
  size: number // bytes
  description: string
  createdAt: string
  updatedAt: string
}

export const attachmentsApi = {
  /** List all attachments for a project (no file data). */
  list: (projectId: string) =>
    apiFetch<{ attachments: ApiAttachment[] }>(`/projects/${projectId}/attachments`),

  /**
   * Upload a file. `description` is optional.
   * Uses FormData so Content-Type is set to multipart/form-data automatically.
   */
  upload: (projectId: string, file: File, description = '') => {
    const fd = new FormData()
    fd.append('file', file)
    if (description) fd.append('description', description)
    return apiFetch<{ attachment: ApiAttachment }>(
      `/projects/${projectId}/attachments`,
      { method: 'POST', body: fd },
    )
  },

  /** Returns the URL to stream / download the raw file. */
  downloadUrl: (projectId: string, attachmentId: string) =>
    `${API_BASE}/projects/${projectId}/attachments/${attachmentId}`,

  /** Update only the description of an attachment. */
  updateDescription: (projectId: string, attachmentId: string, description: string) =>
    apiFetch<{ attachment: ApiAttachment }>(
      `/projects/${projectId}/attachments/${attachmentId}`,
      { method: 'PATCH', body: JSON.stringify({ description }) },
    ),

  /** Permanently delete an attachment. */
  delete: (projectId: string, attachmentId: string) =>
    apiFetch<void>(`/projects/${projectId}/attachments/${attachmentId}`, {
      method: 'DELETE',
    }),
}

// ── Sharing ───────────────────────────────────────────────────────────────

export type ShareRole = 'owner' | 'editor' | 'viewer'
export type ShareStatus = 'pending' | 'accepted' | 'revoked'

export interface ApiShare {
  _id: string
  projectId: string
  inviteeEmail: string
  inviteeUser: { _id: string; name?: string; email?: string } | null
  role: 'viewer' | 'editor'
  status: ShareStatus
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface ApiSharedProject {
  _id: string
  repoUrl: string
  repoOwner: string
  repoName: string
  status: string
  meta?: { name?: string }
  createdAt: string
  updatedAt: string
  shareRole: 'viewer' | 'editor'
}

export const sharingApi = {
  /** Invite one or more users to a project. */
  invite: (projectId: string, invites: { email: string; role: 'viewer' | 'editor' }[]) =>
    apiFetch<{ results: Array<{ email: string; status: string; reason?: string; share?: ApiShare }> }>(
      `/projects/${projectId}/share`,
      { method: 'POST', body: JSON.stringify({ invites }) },
    ),

  /** List all current access entries for a project (owner only). */
  listAccess: (projectId: string) =>
    apiFetch<{ shares: ApiShare[] }>(`/projects/${projectId}/share`),

  /** Change the role of a share entry (owner only). */
  changeRole: (projectId: string, shareId: string, role: 'viewer' | 'editor') =>
    apiFetch<{ share: ApiShare }>(`/projects/${projectId}/share/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  /** Revoke access (owner only). */
  revokeAccess: (projectId: string, shareId: string) =>
    apiFetch<void>(`/projects/${projectId}/share/${shareId}`, { method: 'DELETE' }),

  /** Resend a pending invitation (owner only). */
  resendInvite: (projectId: string, shareId: string) =>
    apiFetch<{ share: ApiShare }>(`/projects/${projectId}/share/${shareId}/resend`, { method: 'POST' }),

  /** Cancel a pending invite (owner only). */
  cancelInvite: (projectId: string, shareId: string) =>
    apiFetch<void>(`/projects/${projectId}/share/${shareId}/cancel`, { method: 'DELETE' }),

  /** Accept an invite using the token from the email link (invitee must be logged in). */
  acceptInvite: (token: string) =>
    apiFetch<{ projectId: string; role: string }>(`/projects/share/accept/${token}`, { method: 'POST' }),

  /** Get all projects shared with the current user. */
  getSharedProjects: () =>
    apiFetch<{ projects: ApiSharedProject[] }>('/projects/shared'),
}

// ── Chat ──────────────────────────────────────────────────────────────────

/**
 * Stream tokens from POST /projects/:id/chat via SSE.
 * Returns an AbortController — call .abort() to stop the stream.
 */
export function chatStream(
  projectId: string,
  message: string,
  handlers: {
    onToken: (token: string) => void
    onDone: (result: { historyLength: number }) => void
    onError: (err: Error) => void
  },
): AbortController {
  const ctrl = new AbortController()
  const token = _accessToken

  fetchEventSource(`${API_BASE}/projects/${projectId}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
    signal: ctrl.signal,
    openWhenHidden: true,
    onmessage(ev) {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'token') handlers.onToken(data.token)
        else if (data.type === 'done') { handlers.onDone(data); ctrl.abort() }
        else if (data.type === 'error') handlers.onError(new Error(data.message))
      } catch { /* ignore parse errors */ }
    },
    onerror(err) {
      handlers.onError(err instanceof Error ? err : new Error(String(err)))
      throw err // prevents auto-reconnect
    },
  }).catch((err) => {
    if (err?.name !== 'AbortError') handlers.onError(err)
  })

  return ctrl
}

export const chatApi = {
  reset: (projectId: string) =>
    apiFetch<void>(`/projects/${projectId}/chat`, { method: 'DELETE' }),
}

// ── Public Documentation Portal ──────────────────────────────────────────

export type PortalSectionVisibility = 'public' | 'internal' | 'coming_soon'
export type PortalAccessMode = 'public' | 'password'

export type PortalSectionKey = 'readme' | 'internalDocs' | 'apiReference' | 'schemaDocs' | 'securityReport'

export interface PortalSectionConfig {
  sectionKey: PortalSectionKey
  visibility: PortalSectionVisibility
}

export interface PortalFooterLink {
  label: string
  href: string
}

export interface PortalBranding {
  logo?: string
  favicon?: string
  primaryColor?: string
  bgColor?: string
  accentColor?: string
  headerText?: string
  footerText?: string
  footerLinks?: PortalFooterLink[]
}

export interface ApiPortal {
  _id?: string
  projectId?: string
  slug: string
  isPublished: boolean
  accessMode: PortalAccessMode
  branding: PortalBranding
  sections: PortalSectionConfig[]
  seoTitle?: string
  seoDescription?: string
  customDomain?: string
  createdAt?: string
  updatedAt?: string
}

export interface PublicPortalData {
  portal: ApiPortal
  project: {
    repoOwner: string
    repoName: string
    meta: ApiProjectMeta
    techStack: string[]
  }
  protected: boolean
  /** null when password-protected and not yet verified */
  content: Record<PortalSectionKey, string | null> | null
  /** null when password-protected and not yet verified */
  sectionVisibility: Record<PortalSectionKey, PortalSectionVisibility> | null
}

export const PORTAL_SECTION_LABELS: Record<PortalSectionKey, string> = {
  readme: 'README',
  internalDocs: 'Internal Docs',
  apiReference: 'API Reference',
  schemaDocs: 'Schema Docs',
  securityReport: 'Security Report',
}

export const PORTAL_SECTION_KEYS: PortalSectionKey[] = [
  'readme',
  'internalDocs',
  'apiReference',
  'schemaDocs',
  'securityReport',
]

// ── Owner portal API ──────────────────────────────────────────

export const portalApi = {
  /** Get portal settings for a project (owner only). Returns null portal if not set up yet. */
  get: (projectId: string) =>
    apiFetch<{ portal: ApiPortal | null }>(`/projects/${projectId}/portal`),

  /** Create or update portal settings (owner only). */
  update: (projectId: string, data: {
    branding?: PortalBranding
    sections?: PortalSectionConfig[]
    seoTitle?: string
    seoDescription?: string
    customDomain?: string
    accessMode?: PortalAccessMode
    password?: string | null
  }) =>
    apiFetch<{ portal: ApiPortal }>(`/projects/${projectId}/portal`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Toggle the portal between published and unpublished. */
  togglePublish: (projectId: string) =>
    apiFetch<{ portal: ApiPortal }>(`/projects/${projectId}/portal/publish`, {
      method: 'POST',
    }),
}

// ── Public portal API (no auth required) ─────────────────────

export const publicPortalApi = {
  /**
   * Fetch a public portal by slug.
   * Pass `password` for password-protected portals.
   */
  get: (slug: string, password?: string) => {
    const headers: Record<string, string> = {}
    if (password) headers['x-portal-password'] = password
    return apiFetch<PublicPortalData>(`/portal/${slug}`, { skipAuth: true, headers })
  },

  /** Verify a portal password. Returns { valid: true } or throws ApiException. */
  auth: (slug: string, password: string) =>
    apiFetch<{ valid: boolean }>(`/portal/${slug}/auth`, {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ password }),
    }),
}

// ── API Spec (OpenAPI / Postman importer) ─────────────────────

export type ApiSpecSource = 'file' | 'url' | 'raw'
export type ApiSpecVersion = '2.0' | '3.0' | '3.1' | 'postman' | 'unknown'

export interface ApiSpecParameter {
  in: 'path' | 'query' | 'header' | 'cookie' | 'body'
  name: string
  required: boolean
  description: string
  schema: Record<string, unknown>
  example?: unknown
}

export interface ApiSpecRequestBodyContent {
  schema: Record<string, unknown>
  example?: unknown
}

export interface ApiSpecRequestBody {
  required: boolean
  description: string
  content: Record<string, ApiSpecRequestBodyContent>
}

export interface ApiSpecResponseContent {
  schema: Record<string, unknown>
  example?: unknown
}

export interface ApiSpecResponse {
  description: string
  content: Record<string, ApiSpecResponseContent>
}

export interface ApiSpecEndpoint {
  id: string           // "GET /users/{id}"
  method: string       // uppercase
  path: string
  summary: string
  description: string
  tags: string[]
  operationId: string
  parameters: ApiSpecParameter[]
  requestBody: ApiSpecRequestBody | null
  responses: Record<string, ApiSpecResponse>
  security: unknown
  deprecated: boolean
  customNote: string
}

export interface ApiSpecInfo {
  title: string
  version: string
  description: string
  contact?: unknown
  license?: unknown
  termsOfService?: string
}

export interface ApiSpecServer {
  url: string
  description: string
}

export interface ApiSpecTag {
  name: string
  description: string
}

export interface ApiSpec {
  _id: string
  projectId: string
  source: ApiSpecSource
  sourceUrl?: string
  specVersion: ApiSpecVersion
  info: ApiSpecInfo
  servers: ApiSpecServer[]
  tags: ApiSpecTag[]
  endpoints: ApiSpecEndpoint[]
  schemas: Record<string, unknown>
  securitySchemes: Record<string, unknown>
  autoSync: boolean
  lastSyncedAt?: string
  createdAt: string
  updatedAt: string
}

export interface TryItResult {
  status: number
  headers: Record<string, string>
  body: string
}

// ── apiSpecApi ────────────────────────────────────────────────

export const apiSpecApi = {
  /** Get the imported spec for a project (null if none). */
  get: (projectId: string) =>
    apiFetch<{ spec: ApiSpec | null }>(`/projects/${projectId}/apispec`),

  /** Import via file (pass FormData), URL, or raw text. */
  importFile: (projectId: string, formData: FormData) =>
    apiFetch<{ spec: ApiSpec }>(`/projects/${projectId}/apispec/import`, {
      method: 'POST',
      body: formData,
      // Let browser set Content-Type with boundary
      headers: {},
    }),

  importUrl: (projectId: string, url: string, autoSync = false) =>
    apiFetch<{ spec: ApiSpec }>(`/projects/${projectId}/apispec/import`, {
      method: 'POST',
      body: JSON.stringify({ method: 'url', url, autoSync }),
    }),

  importRaw: (projectId: string, raw: string) =>
    apiFetch<{ spec: ApiSpec }>(`/projects/${projectId}/apispec/import`, {
      method: 'POST',
      body: JSON.stringify({ method: 'raw', raw }),
    }),

  /** Re-fetch from the original URL source. */
  sync: (projectId: string) =>
    apiFetch<{ spec: ApiSpec }>(`/projects/${projectId}/apispec/sync`, {
      method: 'POST',
    }),

  /** Delete the imported spec. */
  delete: (projectId: string) =>
    apiFetch<null>(`/projects/${projectId}/apispec`, { method: 'DELETE' }),

  /** Update the custom note on an endpoint. */
  updateNote: (projectId: string, endpointId: string, note: string) =>
    apiFetch<{ spec: ApiSpec }>(`/projects/${projectId}/apispec/endpoint`, {
      method: 'PATCH',
      body: JSON.stringify({ endpointId, note }),
    }),

  /** Proxy a Try-It request through the server. */
  tryRequest: (
    projectId: string,
    opts: {
      method: string
      baseUrl: string
      path: string
      headers?: Record<string, string>
      queryParams?: Record<string, string>
      body?: string
    },
  ) =>
    apiFetch<TryItResult>(`/projects/${projectId}/apispec/try`, {
      method: 'POST',
      body: JSON.stringify(opts),
    }),
}

// ---------------------------------------------------------------------------
// Billing types
// ---------------------------------------------------------------------------

export interface BillingPlanLimits {
  projects: number | null
  seats: number | null
  extraSeatPriceMonthly: number | null
  attachmentsPerProject: number | null
  maxFileSizeMb: number
  aiChatsPerMonth: number | null
  portals: number | null
  versionHistoryDays: number | null
  exportFormats: string[]
}

export interface BillingPlanFeatures {
  shareViewOnly: boolean
  shareEdit: boolean
  maxShares: number | null
  archiveRestore: boolean
  customDomain: boolean
  docApproval: boolean
  progressTracker: boolean
  openApiImporter: boolean
  apiWebhookAccess: boolean
  githubSync: boolean
}

export interface BillingPlan {
  id: string
  name: string
  tagline: string
  prices: {
    monthly: number      // dollars
    annual: number       // dollars per month
    annualTotal: number | null
    savingsPercent: number
  }
  limits: BillingPlanLimits
  features: BillingPlanFeatures
}

export type SubscriptionStatus =
  | 'free'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'paused'

export interface SubscriptionData {
  plan: string
  planName: string
  billingCycle: 'monthly' | 'annual' | null
  status: SubscriptionStatus
  seats: number
  extraSeats: number
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  pendingPlan: string | null
  pauseEndsAt: string | null
  limits: BillingPlanLimits
  features: BillingPlanFeatures
}

export interface UsageData {
  aiChatsUsed: number
  aiChatsResetAt: string | null
  projectCount: number
  portalCount: number
  activeShareCount: number
}

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'void'

export interface InvoiceData {
  _id: string
  invoiceNumber: string
  amount: number            // cents
  currency: string
  description: string
  status: InvoiceStatus
  paymentMethodSnapshot: string | null
  paidAt: string | null
  periodStart: string | null
  periodEnd: string | null
  createdAt: string
}

export interface PaymentMethodData {
  _id: string
  type: 'card' | 'mobile_money' | 'bank_transfer'
  isDefault: boolean
  displayLabel: string
  /** ISO currency code the token was issued in (e.g. NGN, KES, USD) */
  currency: string
  card?: {
    last4: string
    brand: string
    expMonth: number
    expYear: number
  }
  mobileMoney?: {
    phone: string
    network: string
    country: string
  }
  createdAt: string
}

// ---------------------------------------------------------------------------
// Billing API
// ---------------------------------------------------------------------------

export const billingApi = {
  /** Public — no auth required. Returns all plan definitions. */
  getPlans: () =>
    apiFetch<{ plans: BillingPlan[] }>('/billing/plans', { skipAuth: true }),

  /** Returns current subscription state + usage counters for the authed user. */
  getSubscription: () =>
    apiFetch<{ subscription: SubscriptionData; usage: UsageData }>(
      '/billing/subscription',
    ),

  /**
   * Initiate checkout.
   * For free plan trials → returns `{ trial: true }`.
   * For paid plans → returns `{ paymentLink, txRef }` to redirect to FW.
   */
  checkout: (
    planId: string,
    cycle: 'monthly' | 'annual',
    seats?: number,
    startTrial?: boolean,
  ) =>
    apiFetch<{ trial?: boolean; paymentLink?: string; txRef?: string }>(
      '/billing/checkout',
      {
        method: 'POST',
        body: JSON.stringify({ planId, cycle, seats, startTrial }),
      },
    ),

  /** Verify a Flutterwave payment after redirect. Pass either txRef or transactionId. */
  verifyPayment: (txRef?: string, transactionId?: number) =>
    apiFetch<{ subscription: SubscriptionData }>('/billing/verify-payment', {
      method: 'POST',
      body: JSON.stringify({ txRef, transactionId }),
    }),

  /** Upgrade, downgrade or switch billing cycle. */
  changePlan: (planId: string, cycle: 'monthly' | 'annual', seats?: number) =>
    apiFetch<{
      type: 'upgrade' | 'downgrade' | 'none'
      immediate?: boolean          // true = card charged on the spot
      paymentLink?: string         // present when no saved card → redirect here
      effectiveAt?: string         // ISO date, for downgrades
    }>('/billing/change-plan', {
      method: 'POST',
      body: JSON.stringify({ planId, cycle, seats }),
    }),

  /** Cancel at period end (or immediately if on trial). */
  cancel: (reason?: string) =>
    apiFetch<{ subscription: SubscriptionData }>('/billing/cancel', {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  /** Pause subscription for 1-3 months. */
  pause: (months?: number) =>
    apiFetch<{ subscription: SubscriptionData }>('/billing/pause', {
      method: 'POST',
      body: JSON.stringify({ months }),
    }),

  /** Add extra seats (Pro/Team only). Prorated charge applied immediately or returns payment link. */
  addSeats: (seats: number) =>
    apiFetch<
      | { type: 'immediate'; extraSeats: number; totalSeats: number }
      | { type: 'payment_required'; paymentLink: string }
    >('/billing/seats', {
      method: 'POST',
      body: JSON.stringify({ seats }),
    }),

  /** List saved payment methods for the authed user. */
  getPaymentMethods: () =>
    apiFetch<{ methods: PaymentMethodData[] }>('/billing/payment-methods'),

  /** Remove a saved payment method. */
  deletePaymentMethod: (id: string) =>
    apiFetch<null>(`/billing/payment-methods/${id}`, { method: 'DELETE' }),

  /** Set a saved payment method as the default for renewals. */
  setDefaultPaymentMethod: (id: string) =>
    apiFetch<{ method: PaymentMethodData }>(
      `/billing/payment-methods/${id}/default`,
      { method: 'PATCH' },
    ),

  /** Paginated billing history. */
  getBillingHistory: (page = 1, limit = 20) =>
    apiFetch<{ invoices: InvoiceData[]; total: number; page: number; limit: number }>(
      `/billing/history?page=${page}&limit=${limit}`,
    ),

  /**
   * Returns a direct URL to download the invoice PDF.
   * Use as an anchor href — the browser will stream the PDF.
   */
  downloadInvoicePdfUrl: (id: string) =>
    `${API_BASE}/billing/invoices/${id}/pdf`,

  /** Update company name / VAT number on a paid invoice. */
  updateInvoiceDetails: (
    id: string,
    data: { companyName?: string; vatNumber?: string },
  ) =>
    apiFetch<{ invoice: InvoiceData }>(`/billing/invoices/${id}/details`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}
