import React from "react";
export default function BottomControls({ params, onChange, isRunning, onStart, onStop, onPause, onReset, }) {
    return (<div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
      <div className="flex gap-6 items-center justify-center">
        {/* Solver Type */}
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700">Solver Type</h3>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input type="radio" name="solver" value="python" checked={params.solver_type !== "webgl"} onChange={() => onChange({ ...params, solver_type: "python" })} className="mr-2"/>
              <span className="text-sm">Python</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="solver" value="webgl" checked={params.solver_type === "webgl"} onChange={() => onChange({ ...params, solver_type: "webgl" })} className="mr-2"/>
              <span className="text-sm">WebGL</span>
            </label>
          </div>
        </div>

        {/* Simulation Control */}
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Simulation Control
          </h3>
          <div className="flex gap-2">
            <button onClick={onStart} disabled={isRunning} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300 text-sm font-medium">
              Start
            </button>
            <button onClick={onPause} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm font-medium">
              {isRunning ? "Pause" : "Resume"}
            </button>
            <button onClick={onStop} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm font-medium">
              Stop
            </button>
            <button onClick={onReset} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium">
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>);
}
