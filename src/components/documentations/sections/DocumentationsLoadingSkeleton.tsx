import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DocumentationsLoadingSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="shadow-none">
                    <CardHeader className="pb-3">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-3 w-full mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                            <Skeleton className="h-12" />
                        </div>
                        <Skeleton className="h-8 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
