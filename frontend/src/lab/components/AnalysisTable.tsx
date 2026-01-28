import React from 'react';

export interface AnalysisRow {
  step: number;
  quantumVariance: number;
  classicalVariance: number;
  advantage: number;
}

export interface AnalysisTableProps {
  title?: string;
  data: AnalysisRow[];
  emptyMessage?: string;
  className?: string;
}

export const AnalysisTable: React.FC<AnalysisTableProps> = ({
  title = 'Variance Growth Analysis',
  data,
  emptyMessage = 'Run simulation to generate analysis data',
  className = '',
}) => {
  const formatNumber = (num: number, decimals: number = 4) => {
    return num.toFixed(decimals);
  };

  const displayData = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 text-sm tracking-wide uppercase">{title}</h3>
      </div>
      <div className="p-0 overflow-x-auto">
        <table className="w-full text-left bg-white border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">
                Step
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">
                Quantum σ² (∝ t²)
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100">
                Classical σ² (∝ t)
              </th>
              <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Advantage Factor
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayData.length > 0 ? (
              displayData.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-gray-700 text-sm border-r border-gray-50">
                    {row.step}
                  </td>
                  <td className="px-6 py-4 font-mono text-blue-600 text-sm border-r border-gray-50">
                    {formatNumber(row.quantumVariance)}
                  </td>
                  <td className="px-6 py-4 font-mono text-red-600 text-sm border-r border-gray-50">
                    {formatNumber(row.classicalVariance)}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-green-600 text-sm">
                    {formatNumber(row.advantage, 3)}x
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
