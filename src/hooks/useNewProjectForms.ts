/**
 * Hook: New Project Forms Management
 * Centralizes form initialization and handling
 */

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { manualProjectSchema, fromScratchSchema } from "@/types/ProjectTypes"
import type {
    ManualProjectFormValues,
    FromScratchFormValues,
} from "@/types/ProjectTypes"

export function useNewProjectForms() {
    const manualForm = useForm<ManualProjectFormValues>({
        resolver: zodResolver(manualProjectSchema),
        mode: "onBlur",
    })

    const fromScratchForm = useForm<FromScratchFormValues>({
        resolver: zodResolver(fromScratchSchema),
        mode: "onBlur",
    })

    const resetAllForms = () => {
        manualForm.reset()
        fromScratchForm.reset()
    }

    return {
        manualForm,
        fromScratchForm,
        resetAllForms,
    }
}
