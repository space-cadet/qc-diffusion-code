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

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, columns = 4, title }) => {
  const colsClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  if (metrics.length === 0) {
    console.debug('[MetricsGrid] No metrics to display');
    return null;
  }

  console.debug(`[MetricsGrid] Rendering ${metrics.length} metrics in ${columns} columns`);

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-3">{title || 'Metrics'}</h3>
      <div className={`grid ${colsClass} gap-2 sm:gap-4`}>
        {metrics.map((metric, idx) => (
          <div
            key={`${metric.label}-${idx}`}
            className={`p-2 sm:p-4 border rounded-lg ${colorMap[metric.color] || colorMap.gray}`}
          >
            <div className="text-xs sm:text-sm opacity-75">{metric.label}</div>
            <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2 truncate">
              {typeof metric.value === 'number' ? metric.value.toFixed(3) : metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
