import React from 'react'

export default function CustomCheckbox({
    checked = false,
    onChange,
    label,
    disabled = false,
    indeterminate = false,
    className = ''
}) {
    return (
        <label className={`custom-checkbox-container ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={onChange}
                        disabled={disabled}
                        className="sr-only"
                    />
                    <div className={`custom-checkbox ${checked ? 'checked' : ''} ${indeterminate ? 'indeterminate' : ''}`}>
                        {indeterminate ? (
                            <span className="mi text-white text-sm">remove</span>
                        ) : checked ? (
                            <span className="mi text-white text-sm">check</span>
                        ) : null}
                    </div>
                </div>
                {label && <span className="text-sm text-white/90">{label}</span>}
            </div>
        </label>
    )
}
