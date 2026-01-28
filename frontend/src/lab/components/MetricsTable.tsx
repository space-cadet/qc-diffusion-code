import React from 'react';

export interface MetricsRow {
  step: number;
  totalSimplices: number;
  vertexCount: number;
  volume: number;
  curvature: number;
  lastMove: string;
  timestamp: number;
}

export interface MetricsTableProps {
  data: MetricsRow[];
  className?: string;
  maxHeight?: string;
}

export const MetricsTable: React.FC<MetricsTableProps> = ({ data, className = '', maxHeight = '300px' }) => {
  const formatNumber = (num: number, decimals: number = 3) => {
    return num.toFixed(decimals);
  };

  const formatMove = (move: string | null) => {
    return move || 'None';
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-md overflow-hidden flex flex-col ${className}`}>
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700 text-sm tracking-wide uppercase">Evolution Metrics</h3>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight }}>
        <table className="w-full text-left bg-white border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                Step
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                Simplices
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                Vertices
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                Volume
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-r border-gray-100">
                Curvature
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Last Move
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length > 0 ? (
              data.map((row, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-2 font-mono font-bold text-gray-700 text-sm border-r border-gray-50">
                    {row.step}
                  </td>
                  <td className="px-4 py-2 font-mono text-blue-600 text-sm border-r border-gray-50">
                    {row.totalSimplices}
                  </td>
                  <td className="px-4 py-2 font-mono text-purple-600 text-sm border-r border-gray-50">
                    {row.vertexCount}
                  </td>
                  <td className="px-4 py-2 font-mono text-emerald-600 text-sm border-r border-gray-50">
                    {formatNumber(row.volume)}
                  </td>
                  <td className="px-4 py-2 font-mono text-orange-600 text-sm border-r border-gray-50">
                    {formatNumber(row.curvature)}
                  </td>
                  <td className="px-4 py-2 font-mono text-gray-600 text-sm">
                    {formatMove(row.lastMove)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                  Run simulation to generate metrics data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
