/**
 * Component: ZIP File Upload Step
 */

import { AlertCircle, CheckCircle2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { DialogFooter } from "@/components/ui/dialog"
import Loader1 from "@/components/ui/loader1"
import { ZIP_MAX_SIZE_MB } from "@/configs/ProjectConfig"
import type { ZipUploadStepProps } from "../../../types/ProjectTypes"

export function ZipUploadStep({
    onBack,
    error,
    isLoading,
    isValidating,
    onFileChange,
    onUpload,
    zipFile,
}: ZipUploadStepProps) {
    const fileSizeMB = zipFile ? (zipFile.size / 1024 / 1024).toFixed(2) : "0"

    return (
        <div className="grid gap-4 py-4">
            {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="space-y-2">
                <Label htmlFor="zipFile">Project ZIP File</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <input
                        id="zipFile"
                        type="file"
                        accept=".zip"
                        onChange={onFileChange}
                        className="hidden"
                        disabled={isLoading || isValidating}
                    />

                    {zipFile ? (
                        <div className="space-y-2">
                            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                            <p className="font-medium text-sm">{zipFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {fileSizeMB} MB
                            </p>
                            <button
                                type="button"
                                onClick={() => onFileChange({ target: { files: null } } as any)}
                                className="text-xs text-primary hover:underline mt-2 disabled:opacity-50"
                                disabled={isLoading || isValidating}
                            >
                                Choose different file
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm font-medium">Drag and drop your ZIP here</p>
                            <p className="text-xs text-muted-foreground">or</p>
                            <button
                                type="button"
                                onClick={() =>
                                    document.getElementById("zipFile")?.click()
                                }
                                className="text-sm text-primary hover:underline disabled:opacity-50"
                                disabled={isLoading || isValidating}
                            >
                                browse files
                            </button>
                            <p className="text-xs text-muted-foreground mt-2">
                                Max {ZIP_MAX_SIZE_MB} MB
                            </p>
                        </>
                    )}
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="ghost" onClick={onBack} disabled={isLoading || isValidating}>
                    Back
                </Button>
                <Button onClick={onUpload} disabled={!zipFile || isLoading || isValidating}>
                    {(isLoading || isValidating) && <Loader1 className="mr-2 h-4 w-4" />}
                    {isValidating ? "Validating..." : "Upload & Create Project"}
                </Button>
            </DialogFooter>
        </div>
    )
}
