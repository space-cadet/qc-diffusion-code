import React, { useEffect, useState } from "react";
import { useAppStore } from '../stores/appStore';
import { useDensityVisualization } from '../hooks/useDensityVisualization';
import type { Particle } from "../physics/types/Particle";
import { RandomWalkSimulator } from "../physics/RandomWalkSimulator";

interface DensityComparisonProps {
  simulatorRef: React.RefObject<RandomWalkSimulator>;
  particles?: Particle[];
  particleCount?: number;
  gridLayoutParams: {
    simulationType: "continuum" | "graph";
    velocity: number;
    collisionRate: number;
    dimension: '1D' | '2D';
  };
  simulationState: {
    status: 'Running' | 'Paused' | 'Stopped' | 'Initialized';
  };
  particlesLoaded?: any;
}

export const DensityComparison: React.FC<DensityComparisonProps> = ({
  particles,
  particleCount,
  simulatorRef,
  gridLayoutParams,
  simulationState,
  particlesLoaded,
}) => {
  const { 
    randomWalkUIState, 
    setRandomWalkUIState,
    useGPU 
  } = useAppStore();
  
  // Stable empty particles array to avoid identity changes each render
  const EMPTY_PARTICLES = React.useRef<Particle[]>([]).current;
  // Use live particles from simulatorRef when available; fall back to props
  const liveParticles = React.useMemo(() => {
    try {
      const particlesFromSim = simulatorRef.current?.getParticleManager().getAllParticles();
      // console.log('[DensityComparison] Getting live particles:', {
      //   fromSim: !!particlesFromSim,
      //   particleCount: particlesFromSim?.length || 0,
      //   simulatorExists: !!simulatorRef.current,
      //   hasParticleManager: !!simulatorRef.current?.getParticleManager?.(),
      //   simulationState: simulationState.status
      // });
      return (
        particles ??
        particlesFromSim ??
        EMPTY_PARTICLES
      );
    } catch (error) {
      // console.error('[DensityComparison] Error getting particles:', error);
      return EMPTY_PARTICLES;
    }
  }, [particles, simulatorRef, simulationState.status]);
  const liveCount = liveParticles.length;

  const { canvasRef, densityData1D, densityData2D, updateDensity } = useDensityVisualization(
    liveParticles,
    liveCount,
    undefined,
    gridLayoutParams.dimension,
    useGPU,
    particlesLoaded
  );
  const [recordHistory, setRecordHistory] = useState(false);

  // Trigger an initial density draw once on mount
  useEffect(() => {
    updateDensity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Calculate effective values from density data
  const densityData = gridLayoutParams.dimension === '1D' ? densityData1D : densityData2D;
  const maxDensity = densityData ? Math.max(...(densityData.density as number[] | number[][]).flat() as number[]) : 0;
  const totalBins = densityData ? (gridLayoutParams.dimension === '1D' ? densityData.density.length : (densityData.density as number[][]).length * (densityData.density as number[][])[0]?.length || 0) : 0;
  const occupiedBins = densityData ? (densityData.density as number[] | number[][]).flat().filter((d: number) => d > 0).length : 0;
  const spreadRatio = totalBins > 0 ? occupiedBins / totalBins : 0;

  // Auto-update density when simulation is running
  useEffect(() => {
    if (!randomWalkUIState.densityAutoUpdate || simulationState.status !== 'Running') {
      // console.log('[DensityComparison] Auto-update disabled or simulation not running:', {
      //   autoUpdateEnabled: randomWalkUIState.densityAutoUpdate,
      //   simulationStatus: simulationState.status
      // });
      return;
    }
    
    // console.log('[DensityComparison] Starting auto-update interval');
    const interval = setInterval(() => {
      // console.log('[DensityComparison] Auto-update tick, updating density');
      updateDensity();
    }, 100);

    return () => {
      // console.log('[DensityComparison] Clearing auto-update interval');
      clearInterval(interval);
    };
  }, [randomWalkUIState.densityAutoUpdate, simulationState.status, updateDensity]);

  // Redraw when dimension changes
  useEffect(() => {
    updateDensity();
  }, [gridLayoutParams.dimension]);

  return (
    <div className="bg-white border rounded-lg p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="drag-handle text-lg font-semibold cursor-move">
          Density Profile ρ(x,y,t)
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('[Density] Manual update', { particleCount: liveCount });
              updateDensity();
            }}
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
            {densityData && gridLayoutParams.dimension === '2D' && densityData.density && (
              <div>Size: {(densityData.density as number[][])[0]?.length || 0}×{(densityData.density as number[][]).length}</div>
            )}
            {densityData && gridLayoutParams.dimension === '1D' && densityData.density && (
              <div>Size: {(densityData.density as number[]).length}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};