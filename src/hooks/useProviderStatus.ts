/**
 * Hook: Provider Status Management
 * Handles checking provider connection status on modal open
 */

import { useState, useEffect } from "react"
import { githubApi, gitlabApi, bitbucketApi, azureApi } from "@/lib/api"
import type { ProviderKey, ProviderStatusRecord, ProviderUsernamesRecord, ProviderCheckingRecord } from "@/types/ProjectTypes"
import { INITIAL_PROVIDER_STATUS, INITIAL_PROVIDER_USERNAMES, INITIAL_PROVIDER_CHECKING } from "@/configs/ProjectConfig"

export function useProviderStatus(isOpen: boolean, isAuthenticated: boolean) {
    const [providerStatus, setProviderStatus] = useState<ProviderStatusRecord>(INITIAL_PROVIDER_STATUS)
    const [providerUsernames, setProviderUsernames] = useState<ProviderUsernamesRecord>(INITIAL_PROVIDER_USERNAMES)
    const [checkingStatus, setCheckingStatus] = useState<ProviderCheckingRecord>(INITIAL_PROVIDER_CHECKING)

    useEffect(() => {
        if (!isOpen || !isAuthenticated) return

        const checkAllProviders = async () => {
            const providers: ProviderKey[] = ["github", "gitlab", "bitbucket", "azure"]

            for (const provider of providers) {
                setCheckingStatus((prev) => ({ ...prev, [provider]: true }))
                try {
                    let status: any
                    let username = ""

                    if (provider === "github") {
                        const s = await githubApi.getStatus()
                        status = s
                        username = s.githubUsername || ""
                    } else if (provider === "gitlab") {
                        const s = await gitlabApi.getStatus()
                        status = s
                        username = s.gitlabUsername || ""
                    } else if (provider === "bitbucket") {
                        const s = await bitbucketApi.getStatus()
                        status = s
                        username = s.bitbucketUsername || ""
                    } else if (provider === "azure") {
                        const s = await azureApi.getStatus()
                        status = s
                        username = s.azureUsername || ""
                    }

                    if (status) {
                        setProviderStatus((prev) => ({ ...prev, [provider]: status.connected }))
                        setProviderUsernames((prev) => ({ ...prev, [provider]: username }))
                    }
                } catch (err: any) {
                    console.warn(`[Provider Status] ${provider} check failed:`, err?.message || err)
                    setProviderStatus((prev) => ({ ...prev, [provider]: false }))
                } finally {
                    setCheckingStatus((prev) => ({ ...prev, [provider]: false }))
                }
            }
        }

        checkAllProviders()
    }, [isOpen, isAuthenticated])

    return {
        providerStatus,
        setProviderStatus,
        providerUsernames,
        setProviderUsernames,
        checkingStatus,
    }
}
