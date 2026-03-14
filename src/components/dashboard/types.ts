import { ProjectStatus } from "@/store/projects";

export interface ProjectFilters {
  status: ProjectStatus | "all";
  sort: "updated" | "created" | "name";
  search: string;
}

export interface DashboardStats {
  projectLimit: number | null;
  projectCount: number;
  canCreateProject: boolean;
}

export interface GithubNotice {
  type: "success" | "error";
  message: string;
}
