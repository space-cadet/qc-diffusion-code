import React, { useEffect } from 'react';
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
import { SimplicialGrowthParams, BoundaryGrowthParams } from './lab/types/simplicial';

// ---- Interior Moves Tab (existing T28 functionality) ----

const InteriorMovesTab: React.FC = () => {
  const simulation = useSimplicialGrowth({
    dimension: 3,
    initialVertices: 4,
    maxSteps: 100,
    moveProbabilities: {
      '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1,
      '1-3': 0.0, '2-2': 0.0, '3-1': 0.0,
    },
    growthRate: 1.0,
  });

  const [isInitialized, setIsInitialized] = React.useState(false);
  const [metricsHistory, setMetricsHistory] = React.useState<any[]>([]);
  const [params, setParams] = React.useState<SimplicialGrowthParams>({
    dimension: 3,
    initialVertices: 4,
    maxSteps: 100,
    moveProbabilities: {
      '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1,
      '1-3': 0.0, '2-2': 0.0, '3-1': 0.0,
    },
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
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = metricsRow;
          return updated;
        }
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
    const metricsText = `Step: ${simulation.currentStep}\nSimplices: ${
      simulation.currentState?.metrics.totalSimplices || 0
    }\nVertices: ${simulation.currentState?.metrics.vertexCount || 0}`;
    await ExportService.copyToClipboard(metricsText);
  };

  const handleParamChange = (key: string, value: any) => {
    const coerced = key === 'dimension' ? Number(value) : value;
    console.debug(`[InteriorMovesTab] Param change: ${key} = ${coerced}`);
    let updatedParams = { ...params, [key]: coerced };
    if (key === 'dimension') {
      if (coerced === 2) {
        updatedParams.moveProbabilities = {
          '1-3': 0.5, '2-2': 0.3, '3-1': 0.2,
          '1-4': 0.0, '2-3': 0.0, '3-2': 0.0, '4-1': 0.0,
        };
        updatedParams.initialVertices = 3;
      } else {
        updatedParams.moveProbabilities = {
          '1-3': 0.0, '2-2': 0.0, '3-1': 0.0,
          '1-4': 0.4, '2-3': 0.3, '3-2': 0.2, '4-1': 0.1,
        };
        updatedParams.initialVertices = 4;
      }
    }
    setParams(updatedParams);
    simulation.initialize(updatedParams);
  };

  const statusColor: 'red' | 'gray' = simulation.isRunning ? 'red' : 'gray';

  const metrics = simulation.currentState && isInitialized
    ? [
        { label: 'Current Step', value: simulation.currentStep, color: 'blue' as const },
        { label: 'Total Simplices', value: simulation.currentState.metrics.totalSimplices, color: 'emerald' as const },
        { label: 'Vertex Count', value: simulation.currentState.metrics.vertexCount, color: 'purple' as const },
        { label: 'Edges', value: simulation.currentState.complex.topology.edges.size, color: 'blue' as const },
        { label: 'Faces', value: simulation.currentState.complex.topology.faces.size, color: 'blue' as const },
        { label: 'Euler Char (X)', value: simulation.currentState.metrics.curvature.toFixed(0), color: 'gray' as const },
        { label: 'Last Move', value: simulation.currentState.lastMove || 'None', color: statusColor },
      ]
    : [];

  const parameterSections = [
    {
      title: 'Simulation Parameters',
      fields: [
        {
          label: 'Dimension', type: 'select' as const, value: params.dimension,
          onChange: (val: 2 | 3) => handleParamChange('dimension', val),
          options: [{ label: '2D (Triangles)', value: '2' }, { label: '3D (Tetrahedra)', value: '3' }],
          hint: 'Choose between 2D triangulation or 3D triangulation',
        },
        {
          label: 'Initial Vertices', type: 'input' as const, value: params.initialVertices,
          onChange: (val: number) => handleParamChange('initialVertices', val),
          min: params.dimension === 2 ? 3 : 4, max: 20, step: 1,
        },
        {
          label: 'Max Steps', type: 'input' as const, value: params.maxSteps,
          onChange: (val: number) => handleParamChange('maxSteps', val),
          min: 10, max: 1000, step: 10,
        },
        {
          label: 'Growth Rate', type: 'range' as const, value: params.growthRate,
          onChange: (val: number) => handleParamChange('growthRate', val),
          min: 0.1, max: 2.0, step: 0.1, hint: 'Controls how fast simplices are added',
        },
      ],
    },
    {
      title: params.dimension === 2 ? '2D Pachner Move Probabilities' : '3D Pachner Move Probabilities',
      fields: params.dimension === 2 ? [
        { label: '1-3 Move (Subdivision)', type: 'range' as const, value: params.moveProbabilities['1-3'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '1-3': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 1 triangle with 3 triangles' },
        { label: '2-2 Move (Edge Flip)', type: 'range' as const, value: params.moveProbabilities['2-2'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '2-2': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 2 triangles with 2 triangles (flip edge)' },
        { label: '3-1 Move (Coarsening)', type: 'range' as const, value: params.moveProbabilities['3-1'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '3-1': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 3 triangles with 1 triangle' },
      ] : [
        { label: '1-4 Move (Subdivision)', type: 'range' as const, value: params.moveProbabilities['1-4'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '1-4': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 1 tetrahedron with 4 tetrahedra' },
        { label: '2-3 Move', type: 'range' as const, value: params.moveProbabilities['2-3'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '2-3': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 2 tetrahedra with 3 tetrahedra' },
        { label: '3-2 Move', type: 'range' as const, value: params.moveProbabilities['3-2'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '3-2': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 3 tetrahedra with 2 tetrahedra' },
        { label: '4-1 Move (Coarsening)', type: 'range' as const, value: params.moveProbabilities['4-1'],
          onChange: (val: number) => handleParamChange('moveProbabilities', { ...params.moveProbabilities, '4-1': val }),
          min: 0, max: 1, step: 0.05, hint: 'Replace 4 tetrahedra with 1 tetrahedron' },
      ],
    },
  ];

  const analysisData = simulation.currentState && isInitialized
    ? [{
        label: 'Move Statistics',
        data: [
          { step: simulation.currentStep, quantumVariance: simulation.currentState.moveCount['1-4'],
            classicalVariance: simulation.currentState.moveCount['2-3'], advantage: simulation.currentState.moveCount['3-2'] },
          { step: simulation.currentStep + 1, quantumVariance: simulation.currentState.moveCount['4-1'],
            classicalVariance: 0, advantage: 0 },
        ],
      }]
    : [];

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-800">Initializing simulation...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simplicial Complex Metrics</h2>
            <MetricsGrid metrics={metrics} columns={4} title="" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simplicial Complex Visualization</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                {simulation.currentState ? (
                  <div className="flex justify-center">
                    {params.dimension === 3 ? (
                      <SimplicialVisualization3D complex={simulation.currentState.complex} width={600} height={400} />
                    ) : (
                      <SimplicialVisualization complex={simulation.currentState.complex} width={600} height={400} />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No visualization data available</div>
                )}
              </div>
              <PachnerMoveTester dimension={params.dimension} onApplyMove={() => {}} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <ParameterPanel sections={parameterSections} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Timeline Control</h2>
            <TimelineSlider currentStep={simulation.currentStep} maxStep={Math.max(simulation.maxSteps - 1, 0)} onSeek={simulation.seek} label="Evolution Progress" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
            <div className="space-y-4">
              <ControlButtons onPlay={simulation.play} onPause={simulation.pause} onStep={simulation.step} onReset={simulation.reset} isRunning={simulation.isRunning} />
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button onClick={handleExportCSV} className="px-4 py-2 rounded font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors">Export CSV</button>
                <button onClick={handleCopyMetrics} className="px-4 py-2 rounded font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors">Copy Metrics</button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Evolution History</h2>
            <MetricsTable data={metricsHistory} maxHeight="400px" />
          </div>

          {analysisData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Move Analysis</h2>
              {analysisData.map((section, idx) => (
                <AnalysisTable key={idx} title={section.label} data={section.data} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---- Boundary Growth Tab (T30) ----

const BoundaryGrowthTab: React.FC = () => {
  const simulation = useBoundaryGrowth();
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [metricsHistory, setMetricsHistory] = React.useState<any[]>([]);
  const [params, setParams] = React.useState<BoundaryGrowthParams>({
    dimension: 2,
    maxSteps: 200,
    growthScale: 80,
    tentProbability: 0.3,
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
        { label: 'Boundary Size', value: simulation.currentState.boundarySize, color: 'blue' as const },
        { label: 'Glue Moves', value: simulation.currentState.moveCount.glue, color: 'emerald' as const },
        { label: 'Tent Moves', value: simulation.currentState.moveCount.tent, color: 'purple' as const },
        { label: 'Euler Char', value: simulation.currentState.metrics.curvature.toFixed(0), color: 'gray' as const },
        { label: 'Last Move', value: simulation.currentState.lastMove || 'None', color: (simulation.isRunning ? 'red' : 'gray') as 'red' | 'gray' },
      ]
    : [];

  const parameterSections = [
    {
      title: 'Boundary Growth Parameters',
      fields: [
        {
          label: 'Dimension', type: 'select' as const, value: params.dimension,
          onChange: (val: any) => handleParamChange('dimension', val),
          options: [{ label: '2D (Triangles)', value: '2' }, { label: '3D (Tetrahedra)', value: '3' }],
          hint: 'Dimension of the growing complex',
        },
        {
          label: 'Growth Scale', type: 'range' as const, value: params.growthScale,
          onChange: (val: number) => handleParamChange('growthScale', val),
          min: 20, max: 200, step: 10,
          hint: 'Distance of new vertex from boundary face',
        },
        {
          label: 'Tent Move Probability', type: 'range' as const, value: params.tentProbability,
          onChange: (val: number) => handleParamChange('tentProbability', val),
          min: 0, max: 1, step: 0.05,
          hint: 'Probability of tent move vs single glue (rest is glue probability)',
        },
        {
          label: 'Max Steps', type: 'input' as const, value: params.maxSteps,
          onChange: (val: number) => handleParamChange('maxSteps', val),
          min: 10, max: 2000, step: 10,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {!isInitialized ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <p className="text-blue-800">Initializing boundary growth...</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Boundary Growth Metrics</h2>
            <MetricsGrid metrics={metrics} columns={4} title="" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Complex Visualization</h2>
            {simulation.currentState ? (
              <div className="flex justify-center">
                {params.dimension === 3 ? (
                  <SimplicialVisualization3D complex={simulation.currentState.complex} width={700} height={500} />
                ) : (
                  <SimplicialVisualization complex={simulation.currentState.complex} width={700} height={500} />
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No visualization data</div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <ParameterPanel sections={parameterSections} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Timeline Control</h2>
            <TimelineSlider currentStep={simulation.currentStep} maxStep={Math.max(simulation.maxSteps - 1, 0)} onSeek={simulation.seek} label="Growth Progress" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
            <ControlButtons onPlay={simulation.play} onPause={simulation.pause} onStep={simulation.step} onReset={simulation.reset} isRunning={simulation.isRunning} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Growth History</h2>
            <MetricsTable data={metricsHistory} maxHeight="400px" />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Boundary Growth Algorithm</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>- <strong>Glue Move:</strong> Attach a new simplex to a random boundary face, displacing a new vertex outward along the face normal</li>
              <li>- <strong>Tent Move:</strong> Select a boundary vertex, create a future copy displaced outward, glue simplices around its boundary star</li>
              <li>- Growth proceeds outward from the boundary, modeling spacetime foliation evolution</li>
              <li>- <strong>Reference:</strong> Dittrich & Hoehn, arXiv:1108.1974v2</li>
            </ul>
          </div>
        </>
      )}
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

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h1 className="text-3xl font-bold mb-2">Simplicial Growth Algorithm</h1>
        <p className="text-gray-600">
          Discrete evolution of triangulations via Pachner moves and boundary gluing - arXiv:1108.1974v2
        </p>
      </div>

      <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'boundary' && <BoundaryGrowthTab />}
          {activeTab === 'interior' && <InteriorMovesTab />}
        </div>
      </div>
    </div>
  );
};

export default SimplicialGrowthPage;
