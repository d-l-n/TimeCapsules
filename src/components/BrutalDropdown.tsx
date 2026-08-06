interface BrutalDropdownProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel: string
  buttonClassName?: string
  className?: string
}

export default function BrutalDropdown({ value, options, onChange, placeholder, ariaLabel, buttonClassName = '', className = '' }: BrutalDropdownProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`border-2 border-border bg-surface font-bold uppercase cursor-pointer text-left w-full appearance-none ${buttonClassName}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <span aria-hidden="true" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none">▼</span>
    </div>
  )
}
