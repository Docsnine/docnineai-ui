/**
 * Service: Provider OAuth Management
 * Handles OAuth window flows and result polling
 */

import { githubApi, gitlabApi, bitbucketApi, azureApi } from "@/lib/api";
import {
  readOAuthResult,
  clearOAuthResult,
  OAUTH_TIMEOUT_MS,
  OAUTH_POLL_INTERVAL_MS,
} from "@/configs/ProjectConfig";
import type { ProviderKey } from "@/types/ProjectTypes";

export type OAuthStatus = "success" | "error" | "cancelled";

export interface OAuthResult {
  status: OAuthStatus;
  user?: string;
  message?: string;
}

export class ProviderOAuthService {
  /**
   * Get OAuth window URL for a provider
   */
  static getOAuthUrl(provider: ProviderKey): string {
    const base = window.location.origin;
    switch (provider) {
      case "github":
        return `${base}/auth/github?popup=1`;
      case "gitlab":
        return `${base}/auth/gitlab?popup=1`;
      case "bitbucket":
        return `${base}/auth/bitbucket?popup=1`;
      case "azure":
        return `${base}/auth/azure?popup=1`;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Open OAuth window and handle the authentication flow
   */
  static async openOAuthWindow(
    provider: ProviderKey,
    onStatusChange: (
      status: OAuthStatus,
      user?: string,
      message?: string,
    ) => void,
  ): Promise<void> {
    clearOAuthResult(provider);

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      this.getOAuthUrl(provider),
      `${provider}-oauth`,
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );

    if (!popup) {
      onStatusChange(
        "error",
        undefined,
        "Failed to open OAuth window. Please allow popups.",
      );
      return;
    }

    let settled = false;

    const finish = (status: OAuthStatus, user?: string, msg?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      onStatusChange(status, user, msg);
    };

    const cleanup = (pollInterval?: NodeJS.Timeout) => {
      if (pollInterval) clearInterval(pollInterval);
      window.removeEventListener("message", onMessage);
      clearTimeout(maxWaitTimer);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== `${provider}-oauth-complete`) return;
      finish(event.data.status, event.data.user, event.data.msg);
    };

    window.addEventListener("message", onMessage);

    const maxWaitTimer = setTimeout(() => {
      if (!settled) finish("cancelled");
    }, OAUTH_TIMEOUT_MS);

    const poll = setInterval(() => {
      // Check localStorage for result
      const result = readOAuthResult(provider);
      if (result) {
        finish(result.status, result.user, result.msg);
        return;
      }

      // Check if popup was closed
      if (popup.closed) {
        if (!settled) {
          settled = true;
          cleanup(poll);

          // Fallback: check provider status
          this.checkProviderStatus(provider)
            .then((connected) => {
              if (connected) {
                finish("success", undefined, "Connected successfully");
              }
            })
            .catch(() => {
              /* network error */
            });
        }
        return;
      }
    }, OAUTH_POLL_INTERVAL_MS);
  }

  /**
   * Check if a provider is currently connected
   */
  private static async checkProviderStatus(
    provider: ProviderKey,
  ): Promise<boolean> {
    try {
      let status: any;
      if (provider === "github") {
        status = await githubApi.getStatus();
      } else if (provider === "gitlab") {
        status = await gitlabApi.getStatus();
      } else if (provider === "bitbucket") {
        status = await bitbucketApi.getStatus();
      } else if (provider === "azure") {
        status = await azureApi.getStatus();
      }
      return status?.connected ?? false;
    } catch {
      return false;
    }
  }
}
