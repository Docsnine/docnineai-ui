/**
 * Hook: GitHub Organizations Management
 * Handles loading and managing GitHub organizations
 */

import { useState, useCallback } from "react"
import { githubApi, type GitHubOrg } from "@/lib/api"

export function useGithubOrgs() {
    const [githubOrgs, setGithubOrgs] = useState<GitHubOrg[]>([])
    const [githubOrgsLoading, setGithubOrgsLoading] = useState(false)

    const loadGithubOrgs = useCallback(async () => {
        if (githubOrgs.length > 0) return // Already loaded

        setGithubOrgsLoading(true)
        try {
            const res = await githubApi.getOrgs()
            setGithubOrgs(res.orgs)
        } catch (err) {
            console.warn("[GitHub Orgs] Failed to load organizations:", err)
            setGithubOrgs([])
        } finally {
            setGithubOrgsLoading(false)
        }
    }, [githubOrgs.length])

    return {
        githubOrgs,
        githubOrgsLoading,
        loadGithubOrgs,
    }
}
