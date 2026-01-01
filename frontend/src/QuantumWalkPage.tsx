import React, { useEffect, useRef, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from './stores/appStore';
import { QuantumWalker } from './quantum/QuantumWalker';
import { hadamardWalkStep } from './quantum/strategies/HadamardWalkStrategy';
import { calculateObservables } from './quantum/observables/QuantumObservables';

const QuantumWalkPage: React.FC = () => {
  const { quantumWalkState, setQuantumWalkState } = useAppStore();
  const walkerRef = useRef<QuantumWalker | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const observables = walkerRef.current 
    ? calculateObservables(
        walkerRef.current.getStateVector(), 
        quantumWalkState.positions.length, 
        Math.floor(quantumWalkState.positions.length / 2)
      )
    : { mean: 0, variance: 0 };

  const initWalker = useCallback(() => {
    const walker = new QuantumWalker(quantumWalkState.maxSteps);
    walkerRef.current = walker;
    setQuantumWalkState({
      steps: 0,
      distribution: walker.getProbabilityDistribution(),
      positions: walker.getPositions(),
      history: [walker.getProbabilityDistribution()],
    });
  }, [quantumWalkState.maxSteps, setQuantumWalkState]);

  useEffect(() => {
    if (!walkerRef.current) {
      initWalker();
    }
  }, [initWalker]);

  const handleStep = useCallback(() => {
    if (walkerRef.current && quantumWalkState.steps < quantumWalkState.maxSteps) {
      walkerRef.current.step(hadamardWalkStep);
      const newDist = walkerRef.current.getProbabilityDistribution();
      setQuantumWalkState({
        steps: quantumWalkState.steps + 1,
        distribution: newDist,
        history: [...quantumWalkState.history, newDist],
      });
    } else {
      setQuantumWalkState({ isRunning: false });
    }
  }, [quantumWalkState.steps, quantumWalkState.maxSteps, quantumWalkState.history, setQuantumWalkState]);

  useEffect(() => {
    if (quantumWalkState.isRunning) {
      timerRef.current = setInterval(handleStep, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quantumWalkState.isRunning, handleStep]);

  const reset = () => {
    setQuantumWalkState({ isRunning: false });
    initWalker();
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4 bg-gray-900 text-white">
      <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-blue-400">Quantum Random Walk</h1>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Steps</span>
            <span className="text-xl font-mono">{quantumWalkState.steps} / {quantumWalkState.maxSteps}</span>
          </div>
          <button
            onClick={() => setQuantumWalkState({ isRunning: !quantumWalkState.isRunning })}
            className={`px-6 py-2 rounded-md font-bold transition-colors ${
              quantumWalkState.isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {quantumWalkState.isRunning ? 'Pause' : 'Start'}
          </button>
          <button
            onClick={reset}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-bold transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-grow">
        <div className="col-span-3 bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col gap-6">
          <h2 className="text-lg font-semibold border-b border-gray-700 pb-2">Parameters</h2>
          
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-400">Max Steps: {quantumWalkState.maxSteps}</label>
            <input
              type="range"
              min="10"
              max="200"
              value={quantumWalkState.maxSteps}
              onChange={(e) => setQuantumWalkState({ maxSteps: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="mt-auto p-4 bg-gray-900 rounded-md border border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-blue-300">Observables</h3>
            <div className="text-xs space-y-1 text-gray-400 font-mono">
              <div className="flex justify-between">
                <span>Mean ⟨x⟩:</span>
                <span className="text-white">{observables.mean.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Variance σ²:</span>
                <span className="text-white">{observables.variance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Std Dev σ:</span>
                <span className="text-white">{Math.sqrt(observables.variance).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-900 rounded-md border border-gray-700">
            <h3 className="text-sm font-medium mb-2 text-blue-300">Quantum Properties</h3>
            <ul className="text-xs space-y-2 text-gray-400">
              <li>• Coin: Hadamard</li>
              <li>• Initial: |0⟩|↑⟩</li>
              <li>• Interference: Constructive/Destructive</li>
              <li>• Spreading: Ballistic (σ ∝ t)</li>
            </ul>
          </div>
        </div>

        <div className="col-span-9 bg-gray-800 p-4 rounded-lg shadow-lg relative min-h-[500px]">
          <Plot
            data={[
              {
                x: quantumWalkState.positions,
                y: quantumWalkState.distribution,
                type: 'bar',
                marker: { color: '#60a5fa' },
                name: 'Probability',
              }
            ]}
            layout={{
              autosize: true,
              paper_bgcolor: 'rgba(0,0,0,0)',
              plot_bgcolor: 'rgba(0,0,0,0)',
              margin: { t: 40, r: 20, b: 40, l: 60 },
              xaxis: {
                title: 'Position',
                gridcolor: '#374151',
                zerolinecolor: '#4b5563',
                tickfont: { color: '#9ca3af' },
                titlefont: { color: '#9ca3af' },
              },
              yaxis: {
                title: 'Probability',
                gridcolor: '#374151',
                zerolinecolor: '#4b5563',
                tickfont: { color: '#9ca3af' },
                titlefont: { color: '#9ca3af' },
                range: [0, 0.5]
              },
              title: {
                text: 'Position Probability Distribution',
                font: { color: '#f3f4f6', size: 16 }
              }
            }}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: false }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuantumWalkPage;
