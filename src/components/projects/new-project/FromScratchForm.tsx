/**
 * Component: From Scratch Project Creation Form
 */

import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"
import Loader1 from "@/components/ui/loader1"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { fromScratchSchema } from "../../../types/ProjectTypes"
import type { FromScratchFormProps, FromScratchFormValues } from "../../../types/ProjectTypes"

export function FromScratchForm({
    onBack,
    onSubmit,
    isLoading,
    error,
}: FromScratchFormProps) {
    const form = useForm<FromScratchFormValues>({
        resolver: zodResolver(fromScratchSchema),
        mode: "onBlur",
    })

    const handleSubmit = async (values: FromScratchFormValues) => {
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
                    <Label htmlFor="projectName">Project Name</Label>
                    <Input
                        id="projectName"
                        placeholder="My Project"
                        {...form.register("projectName")}
                        disabled={isLoading}
                    />
                    {form.formState.errors.projectName && (
                        <p className="text-sm text-destructive">
                            {form.formState.errors.projectName.message}
                        </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        You can edit the project name and add content later
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
