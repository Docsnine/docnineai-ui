/**
 * Component: Source Selector Step
 * Displays provider options and other import methods
 */

import { CheckCircle2, UploadCloudIcon, Plus, LinkIcon, CloudIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PROVIDER_CONFIG } from "@/configs/ProjectConfig"
import type { SourceSelectorProps, ProviderKey } from "../../../types/ProjectTypes"

export function SourceSelector({
    providerStatus,
    checkingStatus,
    isConnecting,
    onSelectProvider,
    onSelectZip,
    onSelectFromScratch,
    onSelectManual,
}: SourceSelectorProps) {
    const providers: ProviderKey[] = ["github", "gitlab", "bitbucket"]

    return (
        <div className="grid gap-4 py-4">
            {/* Provider buttons */}
            <div className="grid grid-cols-3 gap-3">
                {providers.map((provider) => {
                    const config = PROVIDER_CONFIG[provider]
                    const checking = checkingStatus[provider]
                    const IconComponent = config.emoji

                    return (
                        <button
                            key={provider}
                            onClick={() => onSelectProvider(provider)}
                            disabled={checking || isConnecting}
                            className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-busy={checking}
                        >
                            <div className="text-2xl">
                                <IconComponent />
                            </div>
                            <div className="font-medium text-sm">{config.label}</div>
                            <div className="text-xs text-muted-foreground">{config.description}</div>
                            {providerStatus[provider] && (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Azure + ZIP + From Scratch row */}
            <div className="grid grid-cols-3 gap-3">
                <button
                    onClick={() => onSelectProvider("azure")}
                    disabled={checkingStatus.azure || isConnecting}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-busy={checkingStatus.azure}
                >
                    <div className="text-2xl">
                        <CloudIcon />
                    </div>
                    <div className="font-medium text-sm">Azure DevOps</div>
                    <div className="text-xs text-muted-foreground">Connect Account</div>
                    {providerStatus.azure && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1" />
                    )}
                </button>

                <button
                    onClick={onSelectZip}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <UploadCloudIcon className="h-6 w-6" />
                    <div className="font-medium text-sm">Upload ZIP</div>
                    <div className="text-xs text-muted-foreground">Import from a .zip File</div>
                </button>

                <button
                    onClick={onSelectFromScratch}
                    className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border p-4 text-center transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                >
                    <Plus className="h-6 w-6" />
                    <div className="font-medium text-sm">From Scratch</div>
                    <div className="text-xs text-muted-foreground">Write manually</div>
                </button>
            </div>

            {/* Manual URL option */}
            <button
                onClick={onSelectManual}
                className="w-full flex items-center gap-2 rounded-lg border border-border p-3 text-left text-sm transition-colors hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            >
                <LinkIcon className="h-4 w-4" />
                Or paste a repository URL manually
            </button>
        </div>
    )
}
