/**
 * New Project Modal (Refactored)
 * 
 * Orchestrates the project creation flow with clean separation of concerns:
 * - Hook-based state management (modal, providers, repos, forms)
 * - Service-based business logic (OAuth, project creation, ZIP validation)
 * - Component-based UI steps (source, manual, zip, from-scratch, provider repos)
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { AlertCircle } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { useProjectStore } from "@/store/projects"
import {
    useProviderStatus,
    useProviderRepos,
    useGithubOrgs,
    useModalState,
    useNewProjectForms,
} from "@/hooks"
import {
    ProjectCreationService,
    ProviderOAuthService,
} from "@/services"
import {
    PROVIDER_CONFIG,
    readSavedOrg,
    saveOrg,
    ZIP_MAX_SIZE_BYTES,
} from "@/configs/ProjectConfig"
import type {
    NewProjectModalProps,
    ProviderKey,
    ManualProjectFormValues,
    FromScratchFormValues,
} from "../../../types/ProjectTypes"
import { SourceSelector } from "./SourceSelector"
import { ManualUrlForm } from "./ManualUrlForm"
import { ZipUploadStep } from "./ZipUploadStep"
import { FromScratchForm } from "./FromScratchForm"
import { ProviderRepoSelector } from "./ProviderRepoSelector"

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function NewProjectModal({ open, onOpenChange }: NewProjectModalProps) {
    const navigate = useNavigate()
    const { createProject } = useProjectStore()
    const { user, isAuthenticated } = useAuthStore()

    // ── State Management (Hooks) ───────────────────────────────────────────

    // Provider connection status
    const {
        providerStatus,
        setProviderStatus,
        providerUsernames,
        setProviderUsernames,
        checkingStatus,
    } = useProviderStatus(open, isAuthenticated)

    // Repository management
    const {
        reposState,
        loadRepos,
        resetRepos,
        setSelectedRepo,
        setSearchQuery,
        getFilteredRepos,
        apiError: reposApiError,
    } = useProviderRepos()

    // GitHub organizations
    const {
        githubOrgs,
        githubOrgsLoading,
        loadGithubOrgs,
    } = useGithubOrgs()

    // Modal navigation and state
    const handleReset = () => {
        manualForm.reset()
        fromScratchForm.reset()
        resetRepos()
        setZipFile(null)
        setZipError(null)
    }

    const {
        state: modalState,
        setStep,
        setIsConnecting,
        setApiError,
        goBack,
        handleClose: closeModal,
    } = useModalState(open, handleReset)

    // Forms
    const {
        manualForm,
        fromScratchForm,
        resetAllForms,
    } = useNewProjectForms()

    // ZIP file management
    const [zipFile, setZipFile] = React.useState<File | null>(null)
    const [zipValidating, setZipValidating] = React.useState(false)
    const [zipError, setZipError] = React.useState<string | null>(null)

    // GitHub organization selection
    const [githubSelectedOrg, setGithubSelectedOrg] = React.useState<string | null>(
        readSavedOrg(),
    )

    // ── Dialog Close Handler ───────────────────────────────────────────────

    const handleModalClose = (isOpen: boolean) => {
        if (!isOpen) {
            closeModal()
            onOpenChange(false)
        }
    }

    // ── Provider OAuth Flow ────────────────────────────────────────────────

    const handleEnterProvider = async (provider: ProviderKey) => {
        // Set step first
        setStep(provider)
        setApiError(null)
        resetRepos()

        // Check if already connected
        if (providerStatus[provider]) {
            // Load GitHub orgs if needed
            if (provider === "github" && githubOrgs.length === 0) {
                loadGithubOrgs()
            }

            // Already connected - load repos immediately
            await loadRepos(provider, 1, provider === "github" ? githubSelectedOrg : undefined)
            return
        }

        // Not connected yet - open OAuth window
        setIsConnecting(true)
        
        try {
            await ProviderOAuthService.openOAuthWindow(
                provider,
                async (status, user, msg) => {
                    if (status === "success") {
                        setProviderStatus((prev) => ({ ...prev, [provider]: true }))
                        if (user) {
                            setProviderUsernames((prev) => ({ ...prev, [provider]: user }))
                        }
                        
                        // Load GitHub orgs if needed
                        if (provider === "github" && githubOrgs.length === 0) {
                            loadGithubOrgs()
                        }
                        
                        // Reload repos after successful connection
                        await loadRepos(
                            provider,
                            1,
                            provider === "github" ? githubSelectedOrg : undefined,
                        )
                    } else if (status === "error") {
                        setApiError(msg ?? `${provider} connection failed. Please try again.`)
                    }
                    setIsConnecting(false)
                },
            )
        } catch (err: any) {
            setApiError(err?.message ?? `Failed to connect ${provider}`)
            setIsConnecting(false)
        }
    }

    // ── Form Submission Handlers ───────────────────────────────────────────

    const handleSubmitManual = async (values: ManualProjectFormValues) => {
        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await ProjectCreationService.fromManualUrl(values)
            handleModalClose(false)
            navigate(`/projects/${result.projectId}/live`)
        } catch (err: any) {
            setApiError(err.message)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleSubmitProvider = async (provider: ProviderKey) => {
        if (!reposState.selectedRepo) return

        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await ProjectCreationService.fromProvider(reposState.selectedRepo)
            handleModalClose(false)
            navigate(`/projects/${result.projectId}/live`)
        } catch (err: any) {
            setApiError(err.message)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleSubmitZip = async () => {
        if (!zipFile) return

        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await ProjectCreationService.fromZip(zipFile)
            handleModalClose(false)
            navigate(`/projects/${result.projectId}/live`)
        } catch (err: any) {
            setApiError(err.message)
        } finally {
            setIsConnecting(false)
        }
    }

    const handleSubmitFromScratch = async (values: FromScratchFormValues) => {
        setApiError(null)
        setIsConnecting(true)
        try {
            const result = await ProjectCreationService.fromScratch(values)
            handleModalClose(false)
            navigate(`/projects/${result.projectId}/live`)
        } catch (err: any) {
            setApiError(err.message)
        } finally {
            setIsConnecting(false)
        }
    }

    // ── ZIP File Handler ───────────────────────────────────────────────────

    const handleZipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) {
            setZipFile(null)
            return
        }

        if (!file.name.endsWith(".zip")) {
            setZipError("Please select a .zip file")
            setZipFile(null)
            return
        }

        if (file.size > ZIP_MAX_SIZE_BYTES) {
            setZipError(`ZIP file must be smaller than 100MB`)
            setZipFile(null)
            return
        }

        setZipFile(file)
        setZipError(null)

        // Validate ZIP
        setZipValidating(true)
        try {
            const result = await ProjectCreationService.validateZip(file)
            if (!result.valid) {
                setZipError(result.message || "ZIP file validation failed")
                setZipFile(null)
            }
        } catch {
            setZipError("Failed to validate ZIP file")
            setZipFile(null)
        } finally {
            setZipValidating(false)
        }
    }

    // ── GitHub Organization Change ────────────────────────────────────────

    const handleGithubOrgChange = async (org: string | null) => {
        setGithubSelectedOrg(org)
        saveOrg(org)
        resetRepos()
        await loadRepos("github", 1, org)
    }

    // ── Render ─────────────────────────────────────────────────────────────

    // Get dialog title and description based on current step
    const getDialogTitle = (): string => {
        switch (modalState.step) {
            case "source":
                return "Import To Docnine"
            case "manual":
                return "Enter Repository URL"
            case "zip":
                return "Upload Project ZIP"
            case "from-scratch":
                return "Create From Scratch"
            case "github":
                return "Select GitHub Repository"
            case "gitlab":
                return "Select GitLab Repository"
            case "bitbucket":
                return "Select Bitbucket Repository"
            case "azure":
                return "Select Azure Repository"
            default:
                return "Import To Docnine"
        }
    }

    const getDialogDescription = (): string => {
        switch (modalState.step) {
            case "source":
                return "Import your project to Docnine to generate documentation."
            case "manual":
                return "Enter a repository URL for GitHub, GitLab, Bitbucket, or Azure DevOps."
            case "zip":
                return "Upload a ZIP file containing your project source code."
            case "from-scratch":
                return "Create a new empty project to set up manually."
            case "github":
            case "gitlab":
            case "bitbucket":
            case "azure":
                return `Select a repository from your ${PROVIDER_CONFIG[modalState.step as ProviderKey]?.label} account.`
            default:
                return ""
        }
    }

    const isProviderStep = ["github", "gitlab", "bitbucket", "azure"].includes(modalState.step)

    return (
        <Dialog open={open} onOpenChange={handleModalClose}>
            <DialogContent className="sm:max-w-125 w-full md:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{getDialogTitle()}</DialogTitle>
                    <DialogDescription>{getDialogDescription()}</DialogDescription>
                </DialogHeader>

                {/* Error banner */}
                {(modalState.apiError || reposApiError) && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {modalState.apiError || reposApiError}
                    </div>
                )}

                {/* Source selection step */}
                {modalState.step === "source" && (
                    <SourceSelector
                        providerStatus={providerStatus}
                        checkingStatus={checkingStatus}
                        isConnecting={modalState.isConnecting}
                        onSelectProvider={handleEnterProvider}
                        onSelectZip={() => setStep("zip")}
                        onSelectFromScratch={() => setStep("from-scratch")}
                        onSelectManual={() => setStep("manual")}
                    />
                )}

                {/* Manual URL form step */}
                {modalState.step === "manual" && (
                    <ManualUrlForm
                        onBack={goBack}
                        onSubmit={handleSubmitManual}
                        isLoading={modalState.isConnecting}
                        error={modalState.apiError}
                    />
                )}

                {/* ZIP upload step */}
                {modalState.step === "zip" && (
                    <ZipUploadStep
                        onBack={goBack}
                        error={zipError}
                        isLoading={modalState.isConnecting}
                        isValidating={zipValidating}
                        onFileChange={handleZipFileChange}
                        onUpload={handleSubmitZip}
                        zipFile={zipFile}
                    />
                )}

                {/* From scratch step */}
                {modalState.step === "from-scratch" && (
                    <FromScratchForm
                        onBack={goBack}
                        onSubmit={handleSubmitFromScratch}
                        isLoading={modalState.isConnecting}
                        error={modalState.apiError}
                    />
                )}

                {/* Provider repository selector step */}
                {isProviderStep && (
                    <ProviderRepoSelector
                        provider={modalState.step as ProviderKey}
                        repos={reposState.repos}
                        filteredRepos={getFilteredRepos()}
                        selectedRepo={reposState.selectedRepo}
                        searchQuery={reposState.searchQuery}
                        loading={reposState.loading}
                        hasNextPage={reposState.hasNext}
                        isConnecting={modalState.isConnecting}
                        username={providerUsernames[modalState.step as ProviderKey]}
                        githubOrgs={githubOrgs}
                        githubOrgsLoading={githubOrgsLoading}
                        githubSelectedOrg={githubSelectedOrg}
                        onSearchChange={setSearchQuery}
                        onSelectRepo={setSelectedRepo}
                        onLoadMore={() =>
                            loadRepos(
                                modalState.step as ProviderKey,
                                reposState.page + 1,
                                modalState.step === "github" ? githubSelectedOrg : undefined,
                            )
                        }
                        onBack={goBack}
                        onSubmit={() => handleSubmitProvider(modalState.step as ProviderKey)}
                        onGithubOrgChange={modalState.step === "github" ? handleGithubOrgChange : undefined}
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
