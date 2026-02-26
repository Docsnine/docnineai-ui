import React from 'react'

function BackgroundGrid() {
    return (
        <div>
            {/* Background Grid */}
            <div
                className="absolute inset-0 z-0 opacity-5 dark:opacity-50"
                style={{
                    backgroundImage: `linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)`,
                    backgroundSize: '4rem 4rem',
                    maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
                }}
            />
        </div>
    )
}

export default BackgroundGrid
