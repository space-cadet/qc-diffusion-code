import React from 'react';
export const HistoryPanel = ({ simulationState }) => {
    return (<div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📖 Simulation History
      </h3>

      {/* History table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Time Range</th>
              <th className="text-left p-2">Parameters</th>
              <th className="text-left p-2">Actions</th>
              <th className="text-left p-2">Preview</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b bg-blue-50">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 0.0s - {(simulationState.time || 0).toFixed(1)}s
                  <span className="text-xs bg-green-200 px-1 rounded">
                    ● Current
                  </span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=2.5, a=0.1
                <br />
                v=1.0, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">
                    👁️
                  </button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">
                    📊
                  </button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">
                    🗑️
                  </button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲
                  <br />
                  ╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 5.2s - 12.8s
                  <span className="text-xs bg-gray-200 px-1 rounded">
                    ○ Saved
                  </span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=3.0, a=0.1
                <br />
                v=1.2, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">
                    👁️
                  </button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">
                    📊
                  </button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">
                    🗑️
                  </button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲
                  <br />
                  ╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 0.0s - 8.1s
                  <span className="text-xs bg-gray-200 px-1 rounded">
                    ○ Saved
                  </span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=1.5, a=0.2
                <br />
                v=0.8, N=500
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">
                    👁️
                  </button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">
                    📊
                  </button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">
                    🗑️
                  </button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲
                  <br />
                  ╱__╲
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>);
};
