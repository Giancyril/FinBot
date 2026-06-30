import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomSelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  icon: Icon,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-gray-800/60 border border-white/5 text-gray-300 text-xs rounded-xl px-4 py-2.5 outline-none hover:border-white/10 transition-all text-left"
      >
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon size={13} className="text-gray-600 shrink-0" />}
          {value || placeholder}
        </span>
        <ChevronDown size={13} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-gray-900 border border-white/10 rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto">
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            const isSelected = value === val;

            return (
              <button
                key={val}
                type="button"
                onClick={() => {
                  onChange(val);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs transition-colors ${
                  isSelected
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold'
                    : 'text-gray-400 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
