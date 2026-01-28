import React, { useState, useEffect, useCallback } from 'react';
import Plot from 'react-plotly.js';
import { useAppStore } from './stores/appStore';
import { useSimulation } from './lab/hooks/useSimulation';
import { QuantumWalkController, QuantumWalkParams, QuantumWalkState } from './lab/controllers/QuantumWalkController';
import { MetricsGrid } from './lab/components/MetricsGrid';
import { TimelineSlider } from './lab/components/TimelineSlider';
import { ControlButtons } from './lab/components/ControlButtons';
import { ExportService } from './lab/services/ExportService';
import { ParameterPanel } from './lab/components/ParameterPanel';
import { AnalysisTable } from './lab/components/AnalysisTable';
import { TabNavigation } from './lab/components/TabNavigation';

const ANIMATION_DELAY = 100;

export const QuantumWalkPageRefactored: React.FC = () => {
  const { activeTab } = useAppStore();

  // UI State
  const [currentView, setCurrentView] = useState('visualization');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Simulation Parameters
  const [latticeSize, setLatticeSize] = useState(51);
  const [coinType, setCoinType] = useState<'hadamard' | 'grover' | 'rotation'>('hadamard');
  const [boundaryType, setBoundaryType] = useState<'periodic' | 'reflecting'>('reflecting');
  const [theta, setTheta] = useState(Math.PI / 4);
  const [compareClassical, setCompareClassical] = useState(true);
  const [overlayClassical, setOverlayClassical] = useState(true);
  const [classicalModel, setClassicalModel] = useState<'simple' | 'persistent'>('simple');
  const [persistence, setPersistence] = useState(0.9);
  const [decoherence, setDecoherence] = useState(0);
  const [ensembleSize, setEnsembleSize] = useState(50);
  const [maxSteps, setMaxSteps] = useState(10);

  // Simulation Data State
  const [quantumPlotData, setQuantumPlotData] = useState<any>(null);
  const [classicalPlotData, setClassicalPlotData] = useState<any>(null);
  const [varianceData, setVarianceData] = useState<any[]>([]);

  // Controller ref
  const controllerRef = React.useRef<QuantumWalkController | null>(null);

  // Animation timer
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const buildController = useCallback(() => {
    console.debug('[QuantumWalkPageRefactored] Building controller');
    const params: QuantumWalkParams = {
      latticeSize,
      coinType,
      theta,
      boundaryType,
      compareClassical,
      classicalModel,
      persistence,
      decoherence,
      maxSteps,
    };
    const ctrl = new QuantumWalkController();
    ctrl.initialize(params);
    controllerRef.current = ctrl;
    updatePlots();
  }, [latticeSize, coinType, theta, boundaryType, compareClassical, classicalModel, persistence, decoherence, maxSteps]);

  const updatePlots = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    const state = ctrl.getState();
    console.debug('[QuantumWalkPageRefactored] Updating plots - step:', state.step);

    // Extract probability distributions for plotting
    const size = latticeSize;
    const x0 = (size - 1) / 2;
    const positions = Array.from({ length: size }, (_, i) => i - x0);

    // Quantum probabilities
    const quantumProbs = positions.map((_, i) => {
      const leftAmp = state.quantumState.amplitudes[i];
      const rightAmp = state.quantumState.amplitudes[size + i];
      return Math.abs(leftAmp.re) ** 2 + Math.abs(leftAmp.im) ** 2 + Math.abs(rightAmp.re) ** 2 + Math.abs(rightAmp.im) ** 2;
    });

    setQuantumPlotData({
      data: [
        {
          x: positions,
          y: quantumProbs,
          type: 'bar',
          marker: { color: 'rgba(99, 110, 250, 0.7)' },
          name: 'Quantum Walk',
        },
      ],
      layout: {
        title: 'Probability Distribution',
        xaxis: { title: 'Position' },
        yaxis: { title: 'Probability' },
        hovermode: 'closest',
        height: 400,
      },
    });

    // Classical probabilities
    if (compareClassical) {
      setClassicalPlotData({
        data: [
          {
            x: positions,
            y: state.classicalProbs,
            type: 'bar',
            marker: { color: 'rgba(239, 85, 59, 0.7)' },
            name: 'Classical Walk',
          },
        ],
        layout: {
          title: 'Classical Comparison',
          xaxis: { title: 'Position' },
          yaxis: { title: 'Probability' },
          hovermode: 'closest',
          height: 400,
        },
      });
    }
  }, [latticeSize, compareClassical]);

  const handleStep = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    const newState = ctrl.step();
    console.debug('[QuantumWalkPageRefactored] Step executed - step:', newState.step);

    // Record variance analysis
    setVarianceData((prev) => [
      ...prev,
      {
        step: newState.step,
        quantum: newState.quantumVariance,
        classical: newState.classicalVariance,
        advantage: newState.classicalVariance > 0 ? newState.quantumVariance / newState.classicalVariance : 0,
      },
    ]);

    updatePlots();
  }, [updatePlots]);

  const handleReset = useCallback(() => {
    console.debug('[QuantumWalkPageRefactored] Reset');
    setVarianceData([]);
    buildController();
  }, [buildController]);

  const handleSeek = useCallback(
    (step: number) => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      console.debug('[QuantumWalkPageRefactored] Seeking to step:', step);
      ctrl.seekToStep(step);
      updatePlots();
    },
    [updatePlots]
  );

  const handleExportCSV = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;

    const history = ctrl.getHistory();
    let csv = 'step,quantumVariance,classicalVariance,quantumSpread,classicalSpread\n';
    history.forEach((state) => {
      csv += `${state.step},${state.quantumVariance.toFixed(6)},${state.classicalVariance.toFixed(6)},${state.quantumSpread.toFixed(6)},${state.classicalSpread.toFixed(6)}\n`;
    });

    ExportService.downloadCSV(csv, `quantum-walk-${Date.now()}.csv`);
    console.debug('[QuantumWalkPageRefactored] Exported CSV');
  }, []);

  // Initialize on mount
  useEffect(() => {
    console.debug('[QuantumWalkPageRefactored] Component mounted');
    buildController();
    return () => {
      console.debug('[QuantumWalkPageRefactored] Component unmounted');
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [buildController]);

  // Handle parameter changes - rebuild controller
  useEffect(() => {
    console.debug('[QuantumWalkPageRefactored] Parameters changed, rebuilding');
    handleReset();
  }, [latticeSize, coinType, boundaryType, theta, compareClassical, classicalModel, persistence, decoherence, maxSteps, handleReset]);

  const ctrl = controllerRef.current;
  if (!ctrl) return <div>Initializing...</div>;

  const currentState = ctrl.getState();
  const maxStep = ctrl.getHistory().length - 1;

  // Build variance analysis data for AnalysisTable
  const varianceAnalysisData = varianceData.map((d) => ({
    step: d.step,
    quantumVariance: d.quantum,
    classicalVariance: d.classical,
    advantage: d.classical > 0 ? d.quantum / d.classical : 0,
  }));
  // Build metrics for framework
  const metrics = [
    {
      label: 'Current Step',
      value: currentState.step,
      color: 'blue' as const,
    },
    {
      label: 'Quantum σ² (∝ t²)',
      value: currentState.quantumVariance.toFixed(4),
      color: 'blue' as const,
    },
    {
      label: 'Classical σ² (∝ t)',
      value: currentState.classicalVariance.toFixed(4),
      color: 'red' as const,
    },
    {
      label: 'Quantum Advantage',
      value: currentState.classicalVariance > 0 
        ? (currentState.quantumVariance / currentState.classicalVariance).toFixed(2) + 'x' 
        : 'N/A',
      color: 'purple' as const,
    },
    {
      label: 'Quantum Spread',
      value: currentState.quantumSpread.toFixed(2),
      color: 'emerald' as const,
    },
    {
      label: 'Classical Spread',
      value: currentState.classicalSpread.toFixed(2),
      color: 'red' as const,
    },
    {
      label: 'Regime',
      value: currentState.regime,
      color: 'gray' as const,
    },
  ];

  if (activeTab !== 'quantumwalk' && activeTab !== 'quantumwalk-refactored') return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex-shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Quantum Random Walk Explorer (Framework)</h1>
          <p className="text-sm text-gray-500">Using Simulation Lab Framework Components</p>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-72'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between overflow-hidden">
            {!isSidebarCollapsed && <h3 className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Controls</h3>}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
            >
              {isSidebarCollapsed ? '▶' : '◀'}
            </button>
          </div>

          <nav className="flex-1 py-2 overflow-y-auto space-y-2 px-2">
            {!isSidebarCollapsed && (
              <>
                <div className="px-2 py-3 space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Lattice Size</label>
                  <select value={latticeSize} onChange={(e) => setLatticeSize(parseInt(e.target.value))} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                    {[11, 21, 31, 51, 101].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="px-2 py-3 space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Coin Type</label>
                  <select value={coinType} onChange={(e) => setCoinType(e.target.value as any)} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                    <option value="hadamard">Hadamard</option>
                    <option value="grover">Grover</option>
                    <option value="rotation">Rotation</option>
                  </select>
                </div>

                <div className="px-2 py-3 space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Boundary</label>
                  <select value={boundaryType} onChange={(e) => setBoundaryType(e.target.value as any)} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                    <option value="reflecting">Reflecting</option>
                    <option value="periodic">Periodic</option>
                  </select>
                </div>

                {coinType === 'rotation' && (
                  <div className="px-2 py-3 space-y-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase">Theta: {theta.toFixed(2)}</label>
                    <input type="range" min="0" max={Math.PI} step="0.1" value={theta} onChange={(e) => setTheta(parseFloat(e.target.value))} className="w-full" />
                  </div>
                )}

                <div className="px-2 py-3 pt-4 border-t border-gray-100 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={compareClassical} onChange={(e) => setCompareClassical(e.target.checked)} className="w-4 h-4" />
                    <span className="text-xs font-medium text-gray-700">Compare Classical</span>
                  </label>

                  {compareClassical && (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={overlayClassical} onChange={(e) => setOverlayClassical(e.target.checked)} className="w-4 h-4" />
                        <span className="text-xs font-medium text-gray-700">Overlay Plots</span>
                      </label>

                      <select value={classicalModel} onChange={(e) => setClassicalModel(e.target.value as any)} className="text-xs p-1.5 border border-gray-200 rounded bg-white w-full">
                        <option value="simple">Simple Walk</option>
                        <option value="persistent">Persistent Walk</option>
                      </select>

                      {classicalModel === 'persistent' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 font-bold uppercase">Persistence: {persistence.toFixed(2)}</label>
                          <input type="range" min="0" max="1" step="0.1" value={persistence} onChange={(e) => setPersistence(parseFloat(e.target.value))} className="w-full" />
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="px-2 py-3 space-y-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase">Decoherence: {decoherence.toFixed(2)}</label>
                  <input type="range" min="0" max="1" step="0.05" value={decoherence} onChange={(e) => setDecoherence(parseFloat(e.target.value))} className="w-full" />
                </div>
              </>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Tab Navigation */}
          <TabNavigation
            tabs={[
              { id: 'visualization', label: 'Visualization' },
              { id: 'analysis', label: 'Analysis' },
            ]}
            activeTab={currentView}
            onTabChange={setCurrentView}
          />

          {/* Metrics */}
          <div className="bg-white border-b border-gray-200 p-4">
            <MetricsGrid metrics={metrics} columns={4} />
          </div>

          {/* Controls */}
          <div className="bg-white border-b border-gray-200 p-4">
            <ControlButtons onPlay={() => {
              console.debug('[QuantumWalkPageRefactored] Play pressed');
              if (!timerRef.current) {
                timerRef.current = setInterval(handleStep, ANIMATION_DELAY);
              }
            }} onPause={() => {
              console.debug('[QuantumWalkPageRefactored] Pause pressed');
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
            }} onStep={handleStep} onReset={handleReset} isRunning={timerRef.current !== null} />

            <div className="flex gap-2 pt-3 border-t border-gray-200 mt-3">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 rounded text-xs font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Content based on view */}
          {currentView === 'visualization' ? (
            <div className="flex-1 overflow-auto">
              <div className="p-4 space-y-4">
                {/* Mathematical Equation */}
                <div className="bg-gray-50 text-gray-600 p-3 rounded font-serif text-center italic border border-gray-100 text-sm">
                  |ψ(t+1)⟩ = S(C ⊗ I)|ψ(t)⟩
                </div>

                {/* Quantum Plot with Overlay */}
                {quantumPlotData && (
                  <div className="bg-white rounded-lg shadow">
                    <Plot 
                      data={[
                        {
                          x: quantumPlotData.data[0].x,
                          y: quantumPlotData.data[0].y,
                          type: 'bar' as const,
                          name: 'Quantum Probabilities',
                          marker: { 
                            color: quantumPlotData.data[0].x.map((_: any, i: number) => `hsl(${210 + i * 5}, 70%, 50%)`) 
                          }
                        } as any,
                        ...(compareClassical && overlayClassical && classicalPlotData ? [{
                          x: classicalPlotData.data[0].x,
                          y: classicalPlotData.data[0].y,
                          type: 'scatter' as const,
                          mode: 'lines' as const,
                          name: 'Classical Probabilities',
                          line: { color: '#ef4444', width: 3 }
                        } as any] : [])
                      ]}
                      layout={{
                        ...quantumPlotData.layout,
                        showlegend: true,
                        legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: 1.1 }
                      }}
                      config={{ responsive: true }} 
                    />
                  </div>
                )}

                {/* Classical Plot (separate when overlay disabled) */}
                {compareClassical && !overlayClassical && classicalPlotData && (
                  <div className="bg-white rounded-lg shadow">
                    <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase p-4">Classical Walk Comparison</h4>
                    <Plot 
                      data={classicalPlotData.data} 
                      layout={classicalPlotData.layout} 
                      config={{ responsive: true }} 
                    />
                  </div>
                )}

                {varianceData.length > 0 && (
                  <div className="bg-white rounded-lg shadow">
                    <Plot
                      data={[
                        {
                          x: varianceData.map((d) => d.step),
                          y: varianceData.map((d) => d.quantum),
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Quantum Variance',
                          line: { color: 'rgba(99, 110, 250, 0.8)' },
                        },
                        {
                          x: varianceData.map((d) => d.step),
                          y: varianceData.map((d) => d.classical),
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Classical Variance',
                          line: { color: 'rgba(239, 85, 59, 0.8)' },
                        },
                      ]}
                      layout={{
                        title: 'Variance Analysis',
                        xaxis: { title: 'Step' },
                        yaxis: { title: 'Variance' },
                        hovermode: 'closest',
                        height: 400,
                      }}
                      config={{ responsive: true }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              <AnalysisTable data={varianceAnalysisData} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuantumWalkPageRefactored;
