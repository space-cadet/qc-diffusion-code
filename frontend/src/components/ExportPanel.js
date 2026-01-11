import React from 'react';
export const ExportPanel = ({ simulationState, onExport, onCopy, onShare }) => {
    return (<div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📊 Data Export
      </h3>

      <div className="space-y-4 text-sm">
        <div>
          <label className="block mb-1">Export Format:</label>
          <div className="flex gap-2">
            <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs" onClick={() => onExport('csv')}>
              CSV
            </button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={() => onExport('json')}>
              JSON
            </button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={() => onExport('hdf5')}>
              HDF5
            </button>
          </div>
        </div>

        <div>
          <label className="block mb-2">Data to Export:</label>
          <div className="space-y-1 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked/>
              Particle positions
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked/>
              Density field ρ(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked/>
              Velocity field u(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked/>
              Collision events
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked/>
              Parameters & metadata
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox"/>
              Individual trajectories
            </label>
          </div>
        </div>

        <div>
          <label className="block mb-1">Time Range:</label>
          <select className="w-full px-2 py-1 border rounded text-xs">
            <option>Full Run</option>
            <option>Custom: 2.0s - 8.5s</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1 bg-green-500 text-white rounded text-xs" onClick={() => onExport('csv')}>
            📥 Download
          </button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={onCopy}>
            📋
          </button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={onShare}>
            🔗
          </button>
        </div>
      </div>
    </div>);
};
