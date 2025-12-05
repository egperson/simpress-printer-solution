import React, { useState } from 'react'

export default function CustomInput({
    value,
    onChange,
    type = "text",
    placeholder = "",
    label,
    icon,
    iconRight,
    error,
    className = "",
    clearable = true,
    ...props
}) {
    const [showPassword, setShowPassword] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword && showPassword ? 'text' : type

    const handleClear = () => {
        onChange({ target: { value: '' } })
    }

    return (
        <div className={`custom-input ${error ? 'error' : ''} ${className}`}>
            {label && <label className="custom-input-label">{label}</label>}

            <div className="custom-input-wrapper">
                {icon && <span className="mi custom-input-icon left">{icon}</span>}

                <input
                    type={inputType}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`custom-input-field ${icon ? 'has-icon-left' : ''} ${(iconRight || isPassword || (clearable && value)) ? 'has-icon-right' : ''}`}
                    {...props}
                />

                <div className="custom-input-icons-right">
                    {clearable && value && !isPassword && (
                        <button
                            type="button"
                            className="custom-input-clear"
                            onClick={handleClear}
                            aria-label="Limpar"
                        >
                            <span className="mi">close</span>
                        </button>
                    )}

                    {isPassword && (
                        <button
                            type="button"
                            className="custom-input-toggle-password"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                            <span className="mi">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                    )}

                    {iconRight && !isPassword && (
                        <span className="mi custom-input-icon right">{iconRight}</span>
                    )}
                </div>
            </div>

            {error && <div className="custom-input-error">{error}</div>}
        </div>
    )
}
