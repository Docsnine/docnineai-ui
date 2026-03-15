/**
 * Hook: Provider Repositories Management
 * Handles fetching, pagination, and searching repositories across providers
 */

import { useState, useCallback } from "react"
import { githubApi, gitlabApi, bitbucketApi, azureApi } from "@/lib/api"
import type { ProviderKey, NormalizedRepo, RepositoryState } from "@/types/ProjectTypes"
import { REPOS_PER_PAGE } from "@/configs/ProjectConfig"

export function useProviderRepos() {
    const [reposState, setReposState] = useState<RepositoryState>({
        repos: [],
        loading: false,
        page: 1,
        hasNext: false,
        selectedRepo: null,
        searchQuery: "",
    })

    const [apiError, setApiError] = useState<string | null>(null)

    // Normalize repository data from different providers
    const normalizeRepo = (repo: any): NormalizedRepo => {
        return {
            id: repo.id,
            uuid: repo.uuid,
            path_with_namespace: repo.path_with_namespace,
            full_name: repo.full_name || repo.path_with_namespace || repo.full_slug || repo.name,
            description: repo.description,
            html_url: repo.html_url || repo.web_url || repo.links?.html?.href || repo.webUrl || "",
            web_url: repo.web_url || repo.webUrl,
        }
    }

    const loadRepos = useCallback(async (provider: ProviderKey, page: number, org?: string | null) => {
        setReposState((prev) => ({ ...prev, loading: true }))
        setApiError(null)

        try {
            let data
            if (provider === "github") {
                data = await githubApi.getRepos({ page, perPage: REPOS_PER_PAGE, sort: "updated", org: org ?? undefined })
            } else if (provider === "gitlab") {
                data = await gitlabApi.getRepos({ page, perPage: REPOS_PER_PAGE })
            } else if (provider === "bitbucket") {
                data = await bitbucketApi.getRepos({ page, perPage: REPOS_PER_PAGE })
            } else {
                data = await azureApi.getRepos({ page, perPage: REPOS_PER_PAGE })
            }

            if (data) {
                const mapped = data.repos.map(normalizeRepo)
                setReposState((prev) => ({
                    ...prev,
                    repos: page === 1 ? mapped : [...prev.repos, ...mapped],
                    page,
                    hasNext: data.hasNextPage,
                }))
            }
        } catch (err: any) {
            // Don't show error if provider is not connected - this is expected
            if (err?.code !== "GITHUB_NOT_CONNECTED" && 
                err?.code !== "GITLAB_NOT_CONNECTED" && 
                err?.code !== "BITBUCKET_NOT_CONNECTED" &&
                err?.code !== "AZURE_NOT_CONNECTED") {
                setApiError(`Failed to load ${provider} repositories.`)
            }
        } finally {
            setReposState((prev) => ({ ...prev, loading: false }))
        }
    }, [])

    const resetRepos = useCallback(() => {
        setReposState((prev) => ({
            ...prev,
            repos: [],
            selectedRepo: null,
            searchQuery: "",
            page: 1,
            hasNext: false,
        }))
    }, [])

    const setSelectedRepo = useCallback((repo: NormalizedRepo | null) => {
        setReposState((prev) => ({ ...prev, selectedRepo: repo }))
    }, [])

    const setSearchQuery = useCallback((query: string) => {
        setReposState((prev) => ({ ...prev, searchQuery: query }))
    }, [])

    const getFilteredRepos = useCallback(() => {
        const { repos, searchQuery } = reposState
        return repos.filter((r) =>
            r.full_name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    }, [reposState])

    return {
        reposState,
        loadRepos,
        resetRepos,
        setSelectedRepo,
        setSearchQuery,
        getFilteredRepos,
        apiError,
    }
}
