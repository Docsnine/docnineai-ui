/**
 * Service: Project Creation
 * Unified project creation logic across different import methods
 */

import { projectsApi, ApiException, type ApiProject } from "@/lib/api";
import type {
  ManualProjectFormValues,
  FromScratchFormValues,
  NormalizedRepo,
} from "@/types/ProjectTypes";

export interface ProjectCreationResult {
  project: ApiProject;
  projectId: string;
}

export class ProjectCreationService {
  /**
   * Create project from manual repository URL
   */
  static async fromManualUrl(
    values: ManualProjectFormValues,
  ): Promise<ProjectCreationResult> {
    try {
      const result = await projectsApi.create(values.repoUrl);
      const project = result.project || result as any;
      return {
        project,
        projectId: project._id,
      };
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === "DUPLICATE_PROJECT") {
          throw new Error("A pipeline is already running for this repository.");
        }
        throw new Error(err.message);
      }
      throw new Error("Failed to create project. Is the server running?");
    }
  }

  /**
   * Create project from provider (GitHub, GitLab, etc.)
   */
  static async fromProvider(
    repo: NormalizedRepo,
  ): Promise<ProjectCreationResult> {
    try {
      const repoUrl = repo.html_url || repo.web_url || "";

      if (!repoUrl) {
        throw new Error("Unable to determine repository URL");
      }

      const result = await projectsApi.create(repoUrl);
      const project = result.project || result as any;
      return {
        project,
        projectId: project._id,
      };
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.code === "DUPLICATE_PROJECT") {
          throw new Error("A pipeline is already running for this repository.");
        }
        throw new Error(err.message);
      }
      throw new Error("Failed to create project.");
    }
  }

  /**
   * Create project from ZIP file upload
   */
  static async fromZip(zipFile: File): Promise<ProjectCreationResult> {
    try {
      const result = await projectsApi.uploadZip(zipFile);
      return {
        project: result.project,
        projectId: result.project._id,
      };
    } catch (err) {
      if (err instanceof ApiException) {
        throw new Error(err.message);
      }
      throw new Error("Failed to upload ZIP. Is the server running?");
    }
  }

  /**
   * Create empty project from scratch
   */
  static async fromScratch(
    values: FromScratchFormValues,
  ): Promise<ProjectCreationResult> {
    try {
      const result = await projectsApi.createFromScratch(values.projectName);
      return {
        project: result.project,
        projectId: result.project._id,
      };
    } catch (err) {
      if (err instanceof ApiException) {
        throw new Error(err.message);
      }
      throw new Error("Failed to create project.");
    }
  }

  /**
   * Validate ZIP file before upload
   */
  static async validateZip(
    zipFile: File,
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      return await projectsApi.validateZip(zipFile);
    } catch (err) {
      return {
        valid: false,
        message: "Failed to validate ZIP file",
      };
    }
  }
}
