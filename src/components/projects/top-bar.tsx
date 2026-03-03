function TopBar({ title, description, children }: { title: string, description?: string, children?: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-border border-b pb-5 mb-6">
            <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
                {description && (
                    <p className="text-muted-foreground mt-1 sm:mt-3 text-sm sm:text-base">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="shrink-0 flex flex-wrap gap-2">
                    {children}
                </div>
            )}
        </div>
    )
}

export default TopBar
