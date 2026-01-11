import React from 'react';
export const ReplayControls = ({ simulationState, selectedRun }) => {
    return (<div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        🔄 Replay Controls
      </h3>

      <div className="space-y-4">
        <div className="text-sm">
          <strong>Selected Run:</strong> ⏰ {selectedRun.startTime.toFixed(1)}s - {selectedRun.endTime.toFixed(1)}s
          (λ={selectedRun.parameters.collisionRate}, a={selectedRun.parameters.jumpLength}, v={selectedRun.parameters.velocity})
        </div>

        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded">⏮️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏪</button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded">
            ▶️
          </button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏸️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏩</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏭️</button>

          <select className="ml-4 px-2 py-1 border rounded text-sm">
            <option>1x</option>
            <option>0.5x</option>
            <option>2x</option>
            <option>5x</option>
          </select>

          <span className="ml-4 text-sm">Time: {(simulationState.time || 0).toFixed(1)}s / {selectedRun.endTime.toFixed(1)}s</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${((simulationState.time || 0) / selectedRun.endTime) * 100}%` }}></div>
        </div>

        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox"/>
            🔄 Loop
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox"/>
            📊 Show Metrics
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox"/>
            ⚖️ Compare Mode
          </label>
        </div>
      </div>
    </div>);
};
