import React from 'react'

export default function CustomCard({
    children,
    title,
    subtitle,
    icon,
    actions,
    variant = 'default',
    hover = false,
    className = ''
}) {
    const variants = {
        default: 'bg-white/3 border-white/10',
        primary: 'bg-cyan-500/10 border-cyan-500/30',
        success: 'bg-green-500/10 border-green-500/30',
        warning: 'bg-yellow-500/10 border-yellow-500/30',
        danger: 'bg-red-500/10 border-red-500/30'
    }

    const variantClass = variants[variant] || variants.default
    const hoverClass = hover ? 'hover:transform hover:scale-[1.02] hover:shadow-lg transition-all duration-200' : ''

    return (
        <div className={`card border ${variantClass} ${hoverClass} ${className}`}>
            {(title || icon || actions) && (
                <div className="card-header flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {icon && <span className="mi text-2xl">{icon}</span>}
                        <div>
                            {title && <h3 className="font-semibold text-lg">{title}</h3>}
                            {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            )}
            <div className="card-body p-4">
                {children}
            </div>
        </div>
    )
}
