import React from 'react';

export const ReplayControls = ({ simulationState, selectedRun, onSelectRun }) => {
  // If no selectedRun provided, create one from current simulation state
  const currentRun = selectedRun || {
    startTime: 0,
    endTime: (simulationState?.time || 0),
    parameters: {
      collisionRate: 2.5, // Default values - these should come from actual parameters
      jumpLength: 0.1,
      velocity: 1.0,
    },
  };

  const progress = currentRun.endTime > 0 ? ((simulationState?.time || 0) / currentRun.endTime) * 100 : 0;
    return (<div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        🔄 Replay Controls
      </h3>

      <div className="space-y-4">
        <div className="text-sm">
          <strong>Current Run:</strong> ⏰ {currentRun.startTime.toFixed(1)}s - {currentRun.endTime.toFixed(1)}s
          (λ={currentRun.parameters.collisionRate}, a={currentRun.parameters.jumpLength}, v={currentRun.parameters.velocity})
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

          <span className="ml-4 text-sm">Time: {(simulationState.time || 0).toFixed(1)}s / {currentRun.endTime.toFixed(1)}s</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
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
