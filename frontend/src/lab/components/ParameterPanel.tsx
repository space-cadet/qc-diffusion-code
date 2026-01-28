import React from 'react';

export interface ParameterField {
  label: string;
  type: 'select' | 'input' | 'range' | 'checkbox';
  value: any;
  onChange: (value: any) => void;
  hint?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ParameterSection {
  title: string;
  fields: ParameterField[];
}

export interface ParameterPanelProps {
  sections: ParameterSection[];
  className?: string;
}

export const ParameterPanel: React.FC<ParameterPanelProps> = ({ sections, className = '' }) => {
  const renderField = (field: ParameterField, idx: number) => {
    const baseInputClass = "p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all";
    
    switch (field.type) {
      case 'select':
        return (
          <select 
            value={field.value} 
            onChange={(e) => field.onChange(e.target.value)}
            className={`${baseInputClass} w-full`}
          >
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'input':
        return (
          <input
            type="number"
            value={field.value}
            onChange={(e) => field.onChange(parseFloat(e.target.value))}
            className={baseInputClass}
            min={field.min}
            max={field.max}
            step={field.step}
          />
        );

      case 'range':
        return (
          <div className="space-y-2">
            <input
              type="range"
              value={field.value}
              onChange={(e) => field.onChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              min={field.min}
              max={field.max}
              step={field.step}
            />
            <div className="text-xs text-gray-500 font-mono">
              {typeof field.value === 'number' ? field.value.toFixed(2) : field.value}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-xs font-medium text-gray-700">{field.label}</span>
          </label>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden ${className}`}>
      {sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className={sectionIdx > 0 ? 'border-t border-gray-200' : ''}>
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-700 text-sm tracking-wide uppercase">
              {section.title}
            </h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {section.fields.map((field, fieldIdx) => (
              <div key={fieldIdx} className="space-y-4">
                {field.type !== 'checkbox' && (
                  <label className="text-xs font-bold text-gray-600 uppercase">
                    {field.label}
                  </label>
                )}
                {renderField(field, fieldIdx)}
                {field.hint && (
                  <span className="text-[10px] text-gray-400 font-medium tracking-tight block">
                    {field.hint}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
