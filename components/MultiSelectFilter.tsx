import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Filter, Check } from 'lucide-react';

interface MultiSelectFilterProps {
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  label: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({ 
  options, 
  selectedValues, 
  onChange,
  label 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    const newSelected = selectedValues.includes(opt)
      ? selectedValues.filter(v => v !== opt)
      : [...selectedValues, opt];
    onChange(newSelected);
  };

  const filteredOptions = useMemo(() => {
    return options.filter(opt => 
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort();
  }, [options, searchTerm]);

  const handleSelectAll = () => {
    if (selectedValues.length === filteredOptions.length && filteredOptions.length > 0) {
      onChange([]);
    } else {
      onChange(filteredOptions);
    }
  };

  const isActive = selectedValues.length > 0;

  return (
    <div className="relative inline-block text-left w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-2 py-1.5 text-xs font-medium border rounded-md transition-colors ${
          isActive 
            ? 'bg-blue-50 border-blue-300 text-blue-700' 
            : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span className="truncate max-w-[80px] mr-1">
          {isActive ? `${selectedValues.length} sel.` : 'Tutti'}
        </span>
        <Filter size={12} className={isActive ? 'fill-blue-700' : ''} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 flex flex-col max-h-80">
          {/* Search Header */}
          <div className="p-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
            <input
              type="text"
              placeholder={`Cerca ${label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-between mt-2 px-1">
              <button 
                onClick={handleSelectAll}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                {selectedValues.length === filteredOptions.length && filteredOptions.length > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}
              </button>
              {isActive && (
                <button 
                  onClick={() => onChange([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1 flex-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">Nessun risultato</div>
            ) : (
              filteredOptions.map((opt, idx) => (
                <div 
                  key={idx}
                  onClick={() => toggleOption(opt)}
                  className="flex items-center px-2 py-2 hover:bg-slate-50 cursor-pointer rounded-md group"
                >
                  <div className={`w-4 h-4 border rounded mr-2 flex items-center justify-center transition-colors ${
                    selectedValues.includes(opt) 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-slate-300 group-hover:border-blue-400'
                  }`}>
                    {selectedValues.includes(opt) && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-xs text-slate-700 truncate" title={opt}>{opt}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
