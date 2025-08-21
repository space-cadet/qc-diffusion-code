import React, { useState } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import type { Layout } from "react-grid-layout";
import { useAppStore } from "./stores/appStore";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ReactGridLayout = WidthProvider(RGL);

export default function GridLayoutPage() {
  // Get parameters from Zustand store (persistent)
  const { gridLayoutParams, setGridLayoutParams } = useAppStore();
  
  // Keep layout and runtime state local (non-persistent)
  const [layouts, setLayouts] = useState<Layout[]>([
    { i: "parameters", x: 0, y: 0, w: 3, h: 8, minW: 3, minH: 6 },
    { i: "canvas", x: 3, y: 0, w: 9, h: 8, minW: 6, minH: 6 },
    { i: "density", x: 0, y: 8, w: 12, h: 4, minW: 8, minH: 3 },
    { i: "history", x: 0, y: 12, w: 12, h: 4, minW: 6, minH: 2 },
    { i: "replay", x: 0, y: 16, w: 8, h: 3, minW: 6, minH: 2 },
    { i: "export", x: 8, y: 16, w: 4, h: 3, minW: 4, minH: 2 },
  ]);

  const [simulationState, setSimulationState] = useState({
    isRunning: false,
    time: 0,
    collisions: 0,
    status: 'Stopped',
  });

  const onLayoutChange = (layout: Layout[]) => {
    setLayouts(layout);
  };

  const handleStart = () => {
    setSimulationState(prev => ({ ...prev, isRunning: true, status: 'Running' }));
  };

  const handlePause = () => {
    setSimulationState(prev => ({ 
      ...prev, 
      isRunning: !prev.isRunning, 
      status: prev.isRunning ? 'Paused' : 'Running' 
    }));
  };

  const handleReset = () => {
    setSimulationState({ isRunning: false, time: 0, collisions: 0, status: 'Stopped' });
  };

  const ParameterPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">Parameters</h3>
      
      <div className="space-y-6">
        {/* Particle Count */}
        <div>
          <label className="block text-sm font-medium mb-2">Particles:</label>
          <select 
            value={gridLayoutParams.particles}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, particles: parseInt(e.target.value) })}
            className="w-full p-2 border rounded"
          >
            <option value={100}>100</option>
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={2000}>2000</option>
            <option value={5000}>5000</option>
          </select>
        </div>

        {/* Collision Rate */}
        <div>
          <label className="block text-sm font-medium mb-2">λ (Collision Rate):</label>
          <input
            type="range"
            min="0.1"
            max="10.0"
            step="0.1"
            value={gridLayoutParams.collisionRate}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, collisionRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1</span>
            <span className="font-medium">{gridLayoutParams.collisionRate}</span>
            <span>10.0</span>
          </div>
        </div>

        {/* Jump Length */}
        <div>
          <label className="block text-sm font-medium mb-2">a (Jump Length):</label>
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={gridLayoutParams.jumpLength}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, jumpLength: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.01</span>
            <span className="font-medium">{gridLayoutParams.jumpLength}</span>
            <span>1.0</span>
          </div>
        </div>

        {/* Velocity */}
        <div>
          <label className="block text-sm font-medium mb-2">v (Velocity):</label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={gridLayoutParams.velocity}
            onChange={(e) => setGridLayoutParams({ ...gridLayoutParams, velocity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1</span>
            <span className="font-medium">{gridLayoutParams.velocity}</span>
            <span>5.0</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={simulationState.isRunning}
              className="flex-1 px-3 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
            >
              ▶️ Start
            </button>
            <button
              onClick={handlePause}
              className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded"
            >
              {simulationState.isRunning ? '⏸️ Pause' : '▶️ Resume'}
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full px-3 py-2 bg-red-500 text-white rounded"
          >
            🔄 Reset
          </button>
        </div>

        {/* Status Display */}
        <div className="border-t pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`font-medium ${
              simulationState.status === 'Running' ? 'text-green-600' : 
              simulationState.status === 'Paused' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              ● {simulationState.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Time:</span>
            <span>{simulationState.time.toFixed(1)}s</span>
          </div>
          <div className="flex justify-between">
            <span>Collisions:</span>
            <span>{simulationState.collisions.toLocaleString()}</span>
          </div>
        </div>

        {/* Derived Parameters */}
        <div className="border-t pt-4 space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>D (Diffusion):</span>
            <span>{(gridLayoutParams.velocity ** 2 / (2 * gridLayoutParams.collisionRate)).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mean Free Path:</span>
            <span>{(gridLayoutParams.velocity / gridLayoutParams.collisionRate).toFixed(3)}</span>
          </div>
          <div className="flex justify-between">
            <span>Mean Wait Time:</span>
            <span>{(1 / gridLayoutParams.collisionRate).toFixed(3)}s</span>
          </div>
        </div>
      </div>
    </div>
  );

  const ParticleCanvas = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">Particle Canvas</h3>
      <div className="h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">•••</div>
          <div>Live particle simulation</div>
          <div className="text-sm mt-2">Particles: {gridLayoutParams.particles}</div>
        </div>
      </div>
    </div>
  );

  const DensityComparison = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 cursor-move">Density Comparison</h3>
      <div className="h-full border rounded-lg bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-2xl mb-2">📈</div>
          <div>ρ(x,t) Random Walk vs Telegraph Equation</div>
          <div className="text-sm mt-2 flex gap-4 justify-center">
            <span>Convergence Error: 0.023</span>
            <span>D_eff: 0.89</span>
            <span>v_eff: 1.02</span>
          </div>
        </div>
      </div>
    </div>
  );

  const HistoryPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full overflow-auto">
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
                  ⏰ 0.0s - 5.2s
                  <span className="text-xs bg-green-200 px-1 rounded">● Current</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=2.5, a=0.1<br/>
                v=1.0, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 5.2s - 12.8s
                  <span className="text-xs bg-gray-200 px-1 rounded">○ Saved</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=3.0, a=0.1<br/>
                v=1.2, N=1000
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2">
                <div className="flex items-center gap-2">
                  ⏰ 0.0s - 8.1s
                  <span className="text-xs bg-gray-200 px-1 rounded">○ Saved</span>
                </div>
              </td>
              <td className="p-2 text-xs">
                λ=1.5, a=0.2<br/>
                v=0.8, N=500
              </td>
              <td className="p-2">
                <div className="flex gap-1">
                  <button className="text-xs bg-blue-100 px-2 py-1 rounded">👁️</button>
                  <button className="text-xs bg-green-100 px-2 py-1 rounded">📊</button>
                  <button className="text-xs bg-red-100 px-2 py-1 rounded">🗑️</button>
                </div>
              </td>
              <td className="p-2">
                <div className="w-16 h-8 border text-center text-xs flex items-center justify-center">
                  ╱╲<br/>╱__╲
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const ReplayControls = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        🔄 Replay Controls
      </h3>
      
      <div className="space-y-4">
        <div className="text-sm">
          <strong>Selected Run:</strong> ⏰ 5.2s - 12.8s (λ=3.0, a=0.1, v=1.2)
        </div>
        
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 bg-gray-100 rounded">⏮️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏪</button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded">▶️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏸️</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏩</button>
          <button className="px-3 py-1 bg-gray-100 rounded">⏭️</button>
          
          <select className="ml-4 px-2 py-1 border rounded text-sm">
            <option>1x</option>
            <option>0.5x</option>
            <option>2x</option>
            <option>5x</option>
          </select>
          
          <span className="ml-4 text-sm">Time: 7.4s / 12.8s</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '58%' }}></div>
        </div>
        
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            🔄 Loop
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            📊 Show Metrics
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" />
            ⚖️ Compare Mode
          </label>
        </div>
      </div>
    </div>
  );

  const ExportPanel = () => (
    <div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📊 Data Export
      </h3>
      
      <div className="space-y-4 text-sm">
        <div>
          <label className="block mb-1">Export Format:</label>
          <div className="flex gap-2">
            <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs">CSV</button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs">JSON</button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs">HDF5</button>
          </div>
        </div>
        
        <div>
          <label className="block mb-2">Data to Export:</label>
          <div className="space-y-1 text-xs">
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Particle positions
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Density field ρ(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Velocity field u(x,t)
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Collision events
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" defaultChecked />
              Parameters & metadata
            </label>
            <label className="flex items-center gap-1">
              <input type="checkbox" />
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
          <button className="px-3 py-1 bg-green-500 text-white rounded text-xs">📥 Download</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs">📋</button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs">🔗</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Random Walk → Telegraph Equation</h1>
        <p className="text-gray-600">Interactive simulation showing stochastic particle motion converging to telegraph equation</p>
      </div>
      
      <div className="flex-1 p-4">
        <ReactGridLayout
          className="layout"
          layout={layouts}
          onLayoutChange={onLayoutChange}
          cols={12}
          rowHeight={60}
          isDraggable={true}
          isResizable={true}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          draggableHandle=".drag-handle"
        >
          <div key="parameters" className="bg-gray-100">
            <ParameterPanel />
          </div>
          <div key="canvas" className="bg-gray-100">
            <ParticleCanvas />
          </div>
          <div key="density" className="bg-gray-100">
            <DensityComparison />
          </div>
          <div key="history" className="bg-gray-100">
            <HistoryPanel />
          </div>
          <div key="replay" className="bg-gray-100">
            <ReplayControls />
          </div>
          <div key="export" className="bg-gray-100">
            <ExportPanel />
          </div>
        </ReactGridLayout>
      </div>
    </div>
  );
}
