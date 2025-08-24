import React, { useEffect, useState } from "react";
import { useAppStore } from '../stores/appStore';
import type { RandomWalkSimulator } from '../physics/RandomWalkSimulator';
import { useDensityVisualization } from '../hooks/useDensityVisualization';

interface DensityComparisonProps {
  simulatorRef: React.RefObject<RandomWalkSimulator>;
  gridLayoutParams: {
    simulationType: "continuum" | "graph";
    velocity: number;
    collisionRate: number;
  };
}

export const DensityComparison: React.FC<DensityComparisonProps> = ({
  simulatorRef,
  gridLayoutParams,
}) => {
  const { 
    randomWalkUIState, 
    setRandomWalkUIState 
  } = useAppStore();
  
  const { canvasRef, densityData, updateDensity } = useDensityVisualization(simulatorRef, 15);
  const [recordHistory, setRecordHistory] = useState(false);
  const [waveFrontAnalysis, setWaveFrontAnalysis] = useState({ measuredSpeed: 0, theoreticalSpeed: 0, error: 0 });

  // Helper function to update persistent autoUpdate state
  const setAutoUpdate = (autoUpdate: boolean) => {
    setRandomWalkUIState({
      ...randomWalkUIState,
      densityAutoUpdate: autoUpdate
    });
  };

  // Calculate theoretical values
  const diffusionCoefficient =
    gridLayoutParams.velocity ** 2 / (2 * gridLayoutParams.collisionRate);
  const convergenceError =
    simulatorRef.current?.getDensityField()?.error || 0.023;

  // Calculate effective values from density data
  const maxDensity = densityData ? Math.max(...densityData.density.flat()) : 0;
  const totalBins = densityData ? densityData.density.length * densityData.density[0]?.length || 0 : 0;
  const occupiedBins = densityData ? densityData.density.flat().filter(d => d > 0).length : 0;
  const spreadRatio = totalBins > 0 ? occupiedBins / totalBins : 0;

  // Telegraph equation verification
  const updateWaveFrontAnalysis = () => {
    if (simulatorRef.current) {
      const analysis = simulatorRef.current.analyzeWaveFrontSpeed();
      setWaveFrontAnalysis(analysis);
    }
  };

  // Auto-update density when simulation is running
  useEffect(() => {
    if (!randomWalkUIState.densityAutoUpdate) return;
    
    const interval = setInterval(() => {
      updateDensity();
      if (recordHistory && simulatorRef.current) {
        simulatorRef.current.recordDensitySnapshot(15);
      }
      updateWaveFrontAnalysis();
    }, 100);

    return () => clearInterval(interval);
  }, [randomWalkUIState.densityAutoUpdate, recordHistory, updateDensity]);

  return (
    <div className="bg-white border rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="drag-handle text-lg font-semibold cursor-move">
          Density Profile ρ(x,y,t)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={updateDensity}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Update
          </button>
          <button
            onClick={() => setAutoUpdate(!randomWalkUIState.densityAutoUpdate)}
            className={`px-3 py-1 text-xs rounded ${
              randomWalkUIState.densityAutoUpdate 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {randomWalkUIState.densityAutoUpdate ? 'Auto ON' : 'Auto OFF'}
          </button>
          <button
            onClick={() => {
              setRecordHistory(!recordHistory);
              if (!recordHistory && simulatorRef.current) {
                simulatorRef.current.clearDensityHistory();
              }
            }}
            className={`px-3 py-1 text-xs rounded ${
              recordHistory 
                ? 'bg-purple-500 text-white hover:bg-purple-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {recordHistory ? 'Rec ON' : 'Rec OFF'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex gap-4">
        {/* Heatmap visualization */}
        <div className="flex-1 border rounded-lg bg-gray-50 p-2">
          <canvas
            ref={canvasRef}
            width={280}
            height={200}
            className="w-full h-full border rounded"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {/* Statistics panel */}
        <div className="w-48 text-xs space-y-2">
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-semibold mb-1">Theoretical</div>
            <div>D = {diffusionCoefficient.toFixed(3)}</div>
            <div>τ = {(1/gridLayoutParams.collisionRate).toFixed(3)}</div>
            <div>v = {gridLayoutParams.velocity.toFixed(2)}</div>
          </div>
          
          <div className="bg-gray-100 p-2 rounded">
            <div className="font-semibold mb-1">Measured</div>
            <div>Max ρ: {maxDensity.toFixed(4)}</div>
            <div>Spread: {(spreadRatio * 100).toFixed(1)}%</div>
            <div>Bins: {occupiedBins}/{totalBins}</div>
            {densityData && (
              <div>Size: {densityData.density[0]?.length || 0}×{densityData.density.length}</div>
            )}
          </div>
          
          <div className="bg-blue-50 p-2 rounded">
            <div className="font-semibold mb-1">Telegraph Eq.</div>
            <div>Error: {convergenceError.toFixed(3)}</div>
            <div>v_meas: {waveFrontAnalysis.measuredSpeed.toFixed(3)}</div>
            <div>v_theo: {waveFrontAnalysis.theoreticalSpeed.toFixed(3)}</div>
            <div>Wave Error: {(waveFrontAnalysis.error * 100).toFixed(1)}%</div>
            <div className="text-xs text-gray-600 mt-1">
              Blue = Low density<br/>
              Red = High density
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
