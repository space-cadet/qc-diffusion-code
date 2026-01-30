import React from 'react';

export interface MetricConfig {
  label: string;
  value: string | number;
  color: 'blue' | 'red' | 'purple' | 'emerald' | 'gray';
}

export interface MetricsGridProps {
  metrics: MetricConfig[];
  columns?: 2 | 4;
  title?: string;
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-900',
  red: 'bg-red-50 border-red-200 text-red-900',
  purple: 'bg-purple-50 border-purple-200 text-purple-900',
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  gray: 'bg-gray-50 border-gray-200 text-gray-900',
};

const colorTextMap: Record<string, string> = {
  blue: 'text-blue-800',
  red: 'text-red-800',
  purple: 'text-purple-800',
  emerald: 'text-emerald-800',
  gray: 'text-gray-800',
};

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, columns = 4, title }) => {
  const colsClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-3 sm:grid-cols-4';

  if (metrics.length === 0) {
    console.debug('[MetricsGrid] No metrics to display');
    return null;
  }

  console.debug(`[MetricsGrid] Rendering ${metrics.length} metrics`);

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
      <div className={`grid ${colsClass} gap-1.5 sm:gap-3`}>
        {metrics.map((metric, idx) => (
          <div
            key={`${metric.label}-${idx}`}
            className={`px-2 py-1.5 sm:p-3 border rounded-lg ${colorMap[metric.color] || colorMap.gray}`}
          >
            <div className="text-[10px] sm:text-xs opacity-75 truncate">{metric.label}</div>
            <div className={`text-sm sm:text-xl font-bold truncate ${colorTextMap[metric.color] || colorTextMap.gray}`}>
              {typeof metric.value === 'number' ? metric.value.toFixed(metric.value % 1 === 0 ? 0 : 2) : metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
