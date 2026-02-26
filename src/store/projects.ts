import { create } from 'zustand'

export type ProjectStatus = 'idle' | 'analyzing' | 'completed' | 'failed'
export type ProjectSource = 'github' | 'manual'

export interface Project {
  id: string
  name: string
  repoUrl: string
  status: ProjectStatus
  source: ProjectSource
  lastAnalyzed?: string
  createdAt: string
}

interface ProjectState {
  projects: Project[]
  addProject: (project: Omit<Project, 'id' | 'createdAt' | 'status'>) => void
  updateProjectStatus: (id: string, status: ProjectStatus) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [
    {
      id: '1',
      name: 'docnine-frontend',
      repoUrl: 'https://github.com/user/docnine-frontend',
      status: 'completed',
      source: 'github',
      lastAnalyzed: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    },
    {
      id: '2',
      name: 'legacy-api-service',
      repoUrl: 'https://github.com/user/legacy-api',
      status: 'failed',
      source: 'manual',
      lastAnalyzed: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    },
    {
      id: '3',
      name: 'auth-microservice',
      repoUrl: 'https://github.com/user/auth-service',
      status: 'analyzing',
      source: 'github',
      createdAt: new Date().toISOString(),
    }
  ],
  addProject: (project) => set((state) => ({
    projects: [
      {
        ...project,
        id: Math.random().toString(36).substring(7),
        status: 'idle',
        createdAt: new Date().toISOString(),
      },
      ...state.projects
    ]
  })),
  updateProjectStatus: (id, status) => set((state) => ({
    projects: state.projects.map(p => p.id === id ? { ...p, status } : p)
  }))
}))
