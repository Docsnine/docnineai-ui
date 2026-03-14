/**
 * Component: Provider Repository Selector Step
 */

import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogFooter } from "@/components/ui/dialog"
import Loader1 from "@/components/ui/loader1"
import { OrgAccountPicker } from "@/components/projects/org-account-picker"
import { RepoList } from "./RepoList"
import { PROVIDER_CONFIG } from "@/configs/ProjectConfig"
import type { ProviderRepoSelectorProps, ProviderKey } from "../../../types/ProjectTypes"

export function ProviderRepoSelector({
    provider,
    repos,
    filteredRepos,
    selectedRepo,
    searchQuery,
    loading,
    hasNextPage,
    isConnecting,
    username,
    githubOrgs,
    githubOrgsLoading,
    githubSelectedOrg,
    onSearchChange,
    onSelectRepo,
    onLoadMore,
    onBack,
    onSubmit,
    onGithubOrgChange,
}: ProviderRepoSelectorProps) {
    const config = PROVIDER_CONFIG[provider]

    return (
        <div className="grid gap-4 py-4">
            {/* GitHub org picker */}
            {provider === "github" && onGithubOrgChange && (
                <OrgAccountPicker
                    username={username}
                    orgs={githubOrgs || []}
                    orgsLoading={githubOrgsLoading || false}
                    selected={githubSelectedOrg || null}
                    onSelect={onGithubOrgChange}
                />
            )}

            {/* Repository search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search repositories…"
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    disabled={loading || isConnecting}
                />
            </div>

            {/* Repository list */}
            <div className="max-h-62.5 overflow-y-auto rounded-md border border-border">
                <RepoList
                    repos={filteredRepos}
                    loading={loading}
                    hasNextPage={hasNextPage}
                    selectedRepo={selectedRepo}
                    onSelect={onSelectRepo}
                    onLoadMore={onLoadMore}
                />
            </div>

            {/* Footer actions */}
            <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isConnecting}>
                    Back
                </Button>
                <Button
                    onClick={onSubmit}
                    disabled={!selectedRepo || isConnecting}
                >
                    {isConnecting && <Loader1 className="mr-2 h-4 w-4" />}
                    Import Repository
                </Button>
            </DialogFooter>
        </div>
    )
}
