import React, { useState, useRef, useEffect } from 'react'

export default function CustomSelect({
    options = [],
    value,
    onChange,
    placeholder = "Selecione...",
    label,
    icon,
    searchable = false,
    multiple = false,
    className = ""
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const containerRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = searchable && searchQuery
        ? options.filter(opt =>
            (opt.label || opt.value).toLowerCase().includes(searchQuery.toLowerCase())
        )
        : options

    const selectedOption = options.find(opt => opt.value === value)
    const displayValue = selectedOption?.label || selectedOption?.value || placeholder

    const handleSelect = (option) => {
        onChange(option.value)
        if (!multiple) {
            setIsOpen(false)
            setSearchQuery('')
        }
    }

    return (
        <div className={`custom-select ${className}`} ref={containerRef}>
            {label && <label className="custom-select-label">{label}</label>}

            <div
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {icon && <span className="mi custom-select-icon">{icon}</span>}
                <span className="custom-select-value">{displayValue}</span>
                <span className={`mi custom-select-arrow ${isOpen ? 'rotate' : ''}`}>
                    expand_more
                </span>
            </div>

            {isOpen && (
                <div className="custom-select-dropdown">
                    {searchable && (
                        <div className="custom-select-search">
                            <span className="mi">search</span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="custom-select-options">
                        {filteredOptions.length === 0 ? (
                            <div className="custom-select-option disabled">Nenhum resultado</div>
                        ) : (
                            filteredOptions.map((option, idx) => (
                                <div
                                    key={idx}
                                    className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option.icon && <span className="mi">{option.icon}</span>}
                                    <span>{option.label || option.value}</span>
                                    {option.value === value && <span className="mi check">check</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
