/**
 * Component: Manual Repository URL Form Step
 */

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"
import Loader1 from "@/components/ui/loader1"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { manualProjectSchema } from "../../../types/ProjectTypes"
import type { ManualUrlFormProps, ManualProjectFormValues } from "../../../types/ProjectTypes"

export function ManualUrlForm({
    onBack,
    onSubmit,
    isLoading,
    error,
}: ManualUrlFormProps) {
    const form = useForm<ManualProjectFormValues>({
        resolver: zodResolver(manualProjectSchema),
        mode: "onBlur",
    })

    const handleSubmit = async (values: ManualProjectFormValues) => {
        try {
            await onSubmit(values)
        } catch {
            // Error handling is done in parent
        }
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)}>
            <div className="grid gap-4 py-4">
                {error && (
                    <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="repoUrl">Repository URL</Label>
                    <Input
                        id="repoUrl"
                        placeholder="https://github.com/owner/repo"
                        {...form.register("repoUrl")}
                        disabled={isLoading}
                    />
                    {form.formState.errors.repoUrl && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.repoUrl.message}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Supports GitHub, GitLab, Bitbucket, or Azure DevOps
                    </p>
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading}>
                    Back
                </Button>
                <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
                    {isLoading && <Loader1 className="mr-2 h-4 w-4" />}
                    Create Project
                </Button>
            </DialogFooter>
        </form>
    )
}
