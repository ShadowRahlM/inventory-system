import { useState, useRef, useEffect, useMemo } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  label,
  options,
  value,
  onChange,
  onBlur,
  placeholder = 'Select...',
  error,
  disabled,
}: SearchableSelectProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label ?? '';

  const filtered = useMemo(
    () => {
      if (!search) return options;
      const q = search.toLowerCase();
      return options.filter(o => o.label.toLowerCase().includes(q));
    },
    [options, search],
  );

  useEffect(() => {
    setHighlightIndex(-1);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        onBlur?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const open = () => {
    if (!disabled) {
      setIsOpen(true);
      setSearch('');
    }
  };

  const select = (opt: Option) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        open();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          select(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        onBlur?.();
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block mb-1 text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type="text"
        value={isOpen ? search : selectedLabel}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={open}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-gray-100"
      />
      {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No results</div>
          ) : (
            filtered.map((opt, idx) => (
              <div
                key={opt.value}
                onMouseDown={(e) => { e.preventDefault(); select(opt); }}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`px-3 py-2 text-sm cursor-pointer ${
                  idx === highlightIndex
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-blue-50'
                } ${opt.value === value && !search ? 'bg-blue-50 font-medium' : ''}`}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
