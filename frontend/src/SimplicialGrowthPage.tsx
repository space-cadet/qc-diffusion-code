import React, { useEffect, useState } from 'react';
import { MetricsGrid } from './lab/components/MetricsGrid';
import { TimelineSlider } from './lab/components/TimelineSlider';
import { ControlButtons } from './lab/components/ControlButtons';
import { ParameterPanel } from './lab/components/ParameterPanel';
import { AnalysisTable } from './lab/components/AnalysisTable';
import { MetricsTable } from './lab/components/MetricsTable';
import { TabNavigation } from './lab/components/TabNavigation';
import { SimplicialVisualization } from './lab/components/SimplicialVisualization';
import { SimplicialVisualization3D } from './lab/components/SimplicialVisualization3D';
import { PachnerMoveTester } from './lab/components/PachnerMoveTester';
import { useSimplicialGrowth } from './lab/hooks/useSimplicialGrowth';
import { useBoundaryGrowth } from './lab/hooks/useBoundaryGrowth';
import { ExportService } from './lab/services/ExportService';
import { SimplicialGrowthParams, BoundaryGrowthParams, InitialStateType } from './lab/types/simplicial';

// ---- Parameter Drawer (mobile slide-in from right) ----

const ParameterDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  console.debug('[ParameterDrawer] Rendering, isOpen:', isOpen);
  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[85%] max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
          <span className="text-sm font-semibold text-gray-700">Parameters</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-500">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
};

// ---- Interior Moves Tab ----

const InteriorMovesTab: React.FC = () => {
  const simulation = useSimplicialGrowth({
    dimension: 3, initialVertices: 4, maxSteps: 100,
    moveProbabilities: { '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1, '1-3': 0.0, '2-2': 0.0, '3-1': 0.0 },
    growthRate: 1.0,
  });

  const [isInitialized, setIsInitialized] = React.useState(false);
  const [metricsHistory, setMetricsHistory] = React.useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [params, setParams] = React.useState<SimplicialGrowthParams>({
    dimension: 3, initialVertices: 4, maxSteps: 100,
    moveProbabilities: { '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1, '1-3': 0.0, '2-2': 0.0, '3-1': 0.0 },
    growthRate: 1.0,
  });

  useEffect(() => {
    console.debug('[InteriorMovesTab] Mounted');
    simulation.initialize(params);
    setIsInitialized(true);
    setMetricsHistory([]);
  }, []);

  useEffect(() => {
    if (simulation.currentState && isInitialized) {
      const metricsRow = {
        step: simulation.currentState.step,
        totalSimplices: simulation.currentState.metrics.totalSimplices,
        vertexCount: simulation.currentState.metrics.vertexCount,
        volume: simulation.currentState.metrics.volume,
        curvature: simulation.currentState.metrics.curvature,
        lastMove: simulation.currentState.lastMove,
        timestamp: Date.now(),
      };
      setMetricsHistory(prev => {
        const existingIndex = prev.findIndex(row => row.step === metricsRow.step);
        if (existingIndex >= 0) { const updated = [...prev]; updated[existingIndex] = metricsRow; return updated; }
        return [...prev, metricsRow];
      });
    }
  }, [simulation.currentState, simulation.currentStep, isInitialized]);

  useEffect(() => {
    if (!simulation.isRunning) return;
    const interval = setInterval(() => simulation.step(), 500);
    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.step]);

  const handleExportCSV = () => {
    const csv = simulation.exportCSV(['totalSimplices', 'vertexCount', 'volume', 'curvature']);
    ExportService.downloadCSV(csv, `simplicial-growth-${Date.now()}.csv`);
  };

  const handleCopyMetrics = async () => {
    const metricsText = `Step: ${simulation.currentStep}\nSimplices: ${simulation.currentState?.metrics.totalSimplices || 0}\nVertices: ${simulation.currentState?.metrics.vertexCount || 0}`;
    await ExportService.copyToClipboard(metricsText);
  };

  const handleParamChange = (key: string, value: any) => {
    const coerced = key === 'dimension' ? Number(value) : value;
    console.debug(`[InteriorMovesTab] Param change: ${key} = ${coerced}`);
    let updatedParams = { ...params, [key]: coerced };
    if (key === 'dimension') {
      if (coerced === 2) {
        updatedParams.moveProbabilities = { '1-3': 0.5, '2-2': 0.3, '3-1': 0.2, '1-4': 0.0, '2-3': 0.0, '3-2': 0.0, '4-1': 0.0 };
        updatedParams.initialVertices = 3;
      } else {
        updatedParams.moveProbabilities = { '1-3': 0.0, '2-2': 0.0, '3-1': 0.0, '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1 };
        updatedParams.initialVertices = 4;
      }
    }
    setParams(updatedParams);
    simulation.initialize(updatedParams);
  };

  const statusColor: 'red' | 'gray' = simulation.isRunning ? 'red' : 'gray';
  const metrics = simulation.currentState && isInitialized
    ? [
        { label: 'Step', value: simulation.currentStep, color: 'blue' as const },
        { label: 'Simplices', value: simulation.currentState.metrics.totalSimplices, color: 'emerald' as const },
        { label: 'Vertices', value: simulation.currentState.metrics.vertexCount, color: 'purple' as const },
        { label: 'Edges', value: simulation.currentState.complex.topology.edges.size, color: 'blue' as const },
        { label: 'Faces', value: simulation.currentState.complex.topology.faces.size, color: 'blue' as const },
        { label: 'Euler X', value: simulation.currentState.metrics.curvature.toFixed(0), color: 'gray' as const },
        { label: 'Last Move', value: simulation.currentState.lastMove || 'None', color: statusColor },
      ]
    : [];

  const parameterSections = [
    {
      title: 'Simulation Parameters',
      fields: [
        { label: 'Dimension', type: 'select' as const, value: params.dimension,
          onChange: (val: 2 | 3) => handleParamChange('dimension', val),
          options: [{ label: '2D (Triangles)', value: '2' }, { label: '3D (Tetrahedra)', value: '3' }],
          hint: 'Choose between 2D or 3D triangulation' },
        { label: 'Initial Vertices', type: 'input' as const, value: params.initialVertices,
          onChange: (val: number) => handleParamChange('initialVertices', val),
          min: params.dimension === 2 ? 3 : 4, max: 20, step: 1 },
        { label: 'Max Steps', type: 'input' as const, value: params.maxSteps,
          onChange: (val: number) => handleParamChange('maxSteps', val), min: 10, max: 1000, step: 10 },
        { label: 'Growth Rate', type: 'range' as const, value: params.growthRate,
          onChange: (val: number) => handleParamChange('growthRate', val),
          min: 0.1, max: 2.0, step: 0.1, hint: 'Controls how fast simplices are added' },
      ],
    },
    {
      title: params.dimension === 2 ? '2D Pachner Probabilities' : '3D Pachner Probabilities',
      fields: params.dimension === 2 ? [
        { label: '1-3 (Subdivide)', type: 'range' as const, value: params.moveProbabilities['1-3'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '1-3': val }),
          min: 0, max: 1, step: 0.05 },
        { label: '2-2 (Flip)', type: 'range' as const, value: params.moveProbabilities['2-2'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '2-2': val }),
          min: 0, max: 1, step: 0.05 },
        { label: '3-1 (Coarsen)', type: 'range' as const, value: params.moveProbabilities['3-1'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '3-1': val }),
          min: 0, max: 1, step: 0.05 },
      ] : [
        { label: '1-4 (Subdivide)', type: 'range' as const, value: params.moveProbabilities['1-4'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '1-4': val }),
          min: 0, max: 1, step: 0.05 },
        { label: '2-3 Move', type: 'range' as const, value: params.moveProbabilities['2-3'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '2-3': val }),
          min: 0, max: 1, step: 0.05 },
        { label: '3-2 Move', type: 'range' as const, value: params.moveProbabilities['3-2'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '3-2': val }),
          min: 0, max: 1, step: 0.05 },
        { label: '4-1 (Coarsen)', type: 'range' as const, value: params.moveProbabilities['4-1'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '4-1': val }),
          min: 0, max: 1, step: 0.05 },
      ],
    },
  ];

  const analysisData = simulation.currentState && isInitialized
    ? [{ label: 'Move Statistics', data: [
        { step: simulation.currentStep, quantumVariance: simulation.currentState.moveCount['1-4'],
          classicalVariance: simulation.currentState.moveCount['2-3'], advantage: simulation.currentState.moveCount['3-2'] },
        { step: simulation.currentStep + 1, quantumVariance: simulation.currentState.moveCount['4-1'],
          classicalVariance: 0, advantage: 0 },
      ]}] : [];

  return (
    <div className="space-y-3 sm:space-y-6">
      {!isInitialized ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-blue-800">Initializing simulation...</p></div>
      ) : (<>
        <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
          <MetricsGrid metrics={metrics} columns={4} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Visualization</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              {simulation.currentState ? (
                <div>
                  {params.dimension === 3 ? (
                    <SimplicialVisualization3D complex={simulation.currentState.complex} width={600} height={400} responsive />
                  ) : (
                    <SimplicialVisualization complex={simulation.currentState.complex} width={600} height={400} responsive />
                  )}
                </div>
              ) : (<div className="text-center py-8 text-gray-500">No visualization data</div>)}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ControlButtons onPlay={simulation.play} onPause={simulation.pause} onStep={simulation.step} onReset={simulation.reset} isRunning={simulation.isRunning} />
                <button onClick={handleExportCSV} className="px-3 py-2 rounded font-medium bg-indigo-500 hover:bg-indigo-600 text-white text-sm">CSV</button>
                <button onClick={handleCopyMetrics} className="px-3 py-2 rounded font-medium bg-cyan-500 hover:bg-cyan-600 text-white text-sm">Copy</button>
                <button onClick={() => setDrawerOpen(true)} className="md:hidden px-3 py-2 rounded font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm">
                  Params
                </button>
              </div>
            </div>
            <PachnerMoveTester dimension={params.dimension} onApplyMove={() => {}} />
          </div>
        </div>

        <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
          <ParameterPanel sections={parameterSections} />
        </div>
        <ParameterDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <ParameterPanel sections={parameterSections} />
        </ParameterDrawer>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Timeline</h2>
          <TimelineSlider currentStep={simulation.currentStep} maxStep={Math.max(simulation.maxSteps - 1, 0)} onSeek={simulation.seek} label="Evolution Progress" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <MetricsTable data={metricsHistory} maxHeight="400px" />
        </div>
        {analysisData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
            {analysisData.map((section, idx) => (<AnalysisTable key={idx} title={section.label} data={section.data} />))}
          </div>
        )}
      </>)}
    </div>
  );
};

// ---- Boundary Growth Tab ----

const BoundaryGrowthTab: React.FC = () => {
  const simulation = useBoundaryGrowth();
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [metricsHistory, setMetricsHistory] = React.useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [params, setParams] = React.useState<BoundaryGrowthParams>({
    dimension: 2, maxSteps: 200, growthScale: 80, tentProbability: 0.3,
    preventOverlap: false, initialState: 'single-simplex', stripLength: 8,
  });

  useEffect(() => {
    console.debug('[BoundaryGrowthTab] Mounted');
    simulation.initialize(params);
    setIsInitialized(true);
    setMetricsHistory([]);
  }, []);

  useEffect(() => {
    if (simulation.currentState && isInitialized) {
      const row = {
        step: simulation.currentState.step,
        totalSimplices: simulation.currentState.metrics.totalSimplices,
        vertexCount: simulation.currentState.metrics.vertexCount,
        volume: simulation.currentState.boundarySize,
        curvature: simulation.currentState.metrics.curvature,
        lastMove: simulation.currentState.lastMove || 'None',
        timestamp: Date.now(),
      };
      setMetricsHistory(prev => {
        const idx = prev.findIndex(r => r.step === row.step);
        if (idx >= 0) { const u = [...prev]; u[idx] = row; return u; }
        return [...prev, row];
      });
    }
  }, [simulation.currentState, simulation.currentStep, isInitialized]);

  useEffect(() => {
    if (!simulation.isRunning) return;
    const interval = setInterval(() => simulation.step(), 300);
    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.step]);

  const handleParamChange = (key: string, value: any) => {
    const coerced = key === 'dimension' ? Number(value) : value;
    console.debug(`[BoundaryGrowthTab] Param change: ${key} = ${coerced}`);
    const updatedParams = { ...params, [key]: coerced };
    setParams(updatedParams);
    simulation.initialize(updatedParams);
    setIsInitialized(true);
    setMetricsHistory([]);
  };

  const metrics = simulation.currentState && isInitialized
    ? [
        { label: 'Step', value: simulation.currentStep, color: 'blue' as const },
        { label: 'Simplices', value: simulation.currentState.metrics.totalSimplices, color: 'emerald' as const },
        { label: 'Vertices', value: simulation.currentState.metrics.vertexCount, color: 'purple' as const },
        { label: 'Boundary', value: simulation.currentState.boundarySize, color: 'blue' as const },
        { label: 'Glue', value: simulation.currentState.moveCount.glue, color: 'emerald' as const },
        { label: 'Tent', value: simulation.currentState.moveCount.tent, color: 'purple' as const },
        { label: 'Euler X', value: simulation.currentState.metrics.curvature.toFixed(0), color: 'gray' as const },
        { label: 'Last Move', value: simulation.currentState.lastMove || 'None', color: (simulation.isRunning ? 'red' : 'gray') as 'red' | 'gray' },
      ]
    : [];

  const parameterSections = [
    {
      title: 'Boundary Growth Parameters',
      fields: [
        { label: 'Dimension', type: 'select' as const, value: params.dimension,
          onChange: (val: any) => handleParamChange('dimension', val),
          options: [{ label: '2D (Triangles)', value: '2' }, { label: '3D (Tetrahedra)', value: '3' }],
          hint: 'Dimension of the growing complex' },
        { label: 'Growth Scale', type: 'range' as const, value: params.growthScale,
          onChange: (val: number) => handleParamChange('growthScale', val),
          min: 20, max: 200, step: 10, hint: 'Distance of new vertex from boundary face' },
        { label: 'Tent Move Probability', type: 'range' as const, value: params.tentProbability,
          onChange: (val: number) => handleParamChange('tentProbability', val),
          min: 0, max: 1, step: 0.05, hint: 'Probability of tent move vs glue' },
        { label: 'Max Steps', type: 'input' as const, value: params.maxSteps,
          onChange: (val: number) => handleParamChange('maxSteps', val), min: 10, max: 2000, step: 10 },
      ],
    },
    {
      title: 'Initial State & Overlap',
      fields: [
        { label: 'Initial Topology', type: 'select' as const, value: params.initialState,
          onChange: (val: any) => handleParamChange('initialState', val as InitialStateType),
          options: [
            { label: 'Single Simplex', value: 'single-simplex' },
            { label: params.dimension === 2 ? 'Triangle Strip' : 'Tet Strip', value: 'triangle-strip' },
          ], hint: 'Starting topology' },
        { label: 'Strip Length', type: 'range' as const, value: params.stripLength,
          onChange: (val: number) => handleParamChange('stripLength', val),
          min: 3, max: 20, step: 1, hint: 'Simplices in initial strip' },
        { label: 'Prevent Overlap', type: 'checkbox' as const, value: params.preventOverlap,
          onChange: (val: boolean) => handleParamChange('preventOverlap', val),
          hint: 'Reject overlapping simplices' },
      ],
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-6">
      {!isInitialized ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-blue-800">Initializing boundary growth...</p></div>
      ) : (<>
        <div className="bg-white border border-gray-200 rounded-lg p-2 sm:p-4">
          <MetricsGrid metrics={metrics} columns={4} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Visualization</h2>
          {simulation.currentState ? (
            <div>
              {params.dimension === 3 ? (
                <SimplicialVisualization3D complex={simulation.currentState.complex} width={700} height={500} responsive />
              ) : (
                <SimplicialVisualization complex={simulation.currentState.complex} width={700} height={500} responsive />
              )}
            </div>
          ) : (<div className="text-center py-8 text-gray-500">No visualization data</div>)}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ControlButtons onPlay={simulation.play} onPause={simulation.pause} onStep={simulation.step} onReset={simulation.reset} isRunning={simulation.isRunning} />
            <button onClick={() => setDrawerOpen(true)} className="md:hidden px-3 py-2 rounded font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm">
              Params
            </button>
          </div>
        </div>

        <div className="hidden md:block bg-white border border-gray-200 rounded-lg">
          <ParameterPanel sections={parameterSections} />
        </div>
        <ParameterDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <ParameterPanel sections={parameterSections} />
        </ParameterDrawer>

        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Timeline</h2>
          <TimelineSlider currentStep={simulation.currentStep} maxStep={Math.max(simulation.maxSteps - 1, 0)} onSeek={simulation.seek} label="Growth Progress" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
          <MetricsTable data={metricsHistory} maxHeight="400px" />
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-1">Boundary Growth Algorithm</h3>
          <ul className="text-xs text-green-800 space-y-0.5">
            <li>- <strong>Glue:</strong> Attach simplex to boundary face</li>
            <li>- <strong>Tent:</strong> Displace boundary vertex outward</li>
            <li>- Ref: Dittrich & Hoehn, arXiv:1108.1974v2</li>
          </ul>
        </div>
      </>)}
    </div>
  );
};

// ---- Main Page ----

const TABS = [
  { id: 'boundary', label: 'Boundary Growth' },
  { id: 'interior', label: 'Interior Moves' },
];

export const SimplicialGrowthPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('boundary');
  console.debug('[SimplicialGrowthPage] Render, activeTab:', activeTab);

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-3 sm:p-6 border-b border-gray-200 bg-gray-50">
        <h1 className="text-xl sm:text-3xl font-bold mb-1">Simplicial Growth</h1>
        <p className="text-xs sm:text-sm text-gray-600">Discrete evolution via Pachner moves and boundary gluing</p>
      </div>
      <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-auto p-3 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'boundary' && <BoundaryGrowthTab />}
          {activeTab === 'interior' && <InteriorMovesTab />}
        </div>
      </div>
    </div>
  );
};

export default SimplicialGrowthPage;
