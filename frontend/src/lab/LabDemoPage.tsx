import React, { useEffect } from 'react';
import { MetricsGrid } from './components/MetricsGrid';
import { TimelineSlider } from './components/TimelineSlider';
import { ControlButtons } from './components/ControlButtons';
import { useSimulation } from './hooks/useSimulation';
import { ExportService } from './services/ExportService';

export const LabDemoPage: React.FC = () => {
  const simulation = useSimulation({ simulationSpeed: 1.0 });

  useEffect(() => {
    console.debug('[LabDemoPage] Component mounted');
    simulation.initialize({ simulationSpeed: 1.0 });
    return () => {
      console.debug('[LabDemoPage] Component unmounted');
    };
  }, []);

  // Auto-step when running
  useEffect(() => {
    if (!simulation.isRunning) return;

    const interval = setInterval(() => {
      console.debug('[LabDemoPage] Auto-step triggered');
      simulation.step();
    }, 500);

    return () => clearInterval(interval);
  }, [simulation.isRunning, simulation.step]);

  const handleExportCSV = () => {
    const csv = simulation.exportCSV(['value']);
    ExportService.downloadCSV(csv, `lab-demo-${Date.now()}.csv`);
  };

  const handleCopyMetrics = async () => {
    const metricsText = `Step: ${simulation.currentStep}\nValue: ${
      simulation.currentState ? (simulation.currentState as any).value.toFixed(3) : 'N/A'
    }`;
    const success = await ExportService.copyToClipboard(metricsText);
    if (success) {
      console.debug('[LabDemoPage] Metrics copied to clipboard');
    }
  };

  const statusColor: 'red' | 'gray' = simulation.isRunning ? 'red' : 'gray';

  const metrics = simulation.currentState
    ? [
        {
          label: 'Current Step',
          value: simulation.currentStep,
          color: 'blue' as const,
        },
        {
          label: 'Max Steps',
          value: simulation.maxSteps,
          color: 'purple' as const,
        },
        {
          label: 'Current Value',
          value: (simulation.currentState as any).value,
          color: 'emerald' as const,
        },
        {
          label: 'Status',
          value: simulation.isRunning ? 'Running' : 'Paused',
          color: statusColor,
        },
      ]
    : [];

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="p-6 border-b border-gray-200 bg-gray-50">
        <h1 className="text-3xl font-bold mb-2">Simulation Lab Framework Demo</h1>
        <p className="text-gray-600">
          Demonstrating integrated components: SimulationController, TimeSeriesStore, and UI controls
        </p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl space-y-6">
          {/* Metrics Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simulation Metrics</h2>
            <MetricsGrid metrics={metrics} columns={4} title="" />
          </div>

          {/* Timeline Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Timeline Control</h2>
            <TimelineSlider
              currentStep={simulation.currentStep}
              maxStep={Math.max(simulation.maxSteps - 1, 0)}
              onSeek={simulation.seek}
              label="Simulation Progress"
            />
          </div>

          {/* Controls Section */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Simulation Controls</h2>
            <div className="space-y-4">
              <ControlButtons
                onPlay={simulation.play}
                onPause={simulation.pause}
                onStep={simulation.step}
                onReset={simulation.reset}
                isRunning={simulation.isRunning}
              />

              {/* Export Options */}
              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button
                  onClick={handleExportCSV}
                  className="px-4 py-2 rounded font-medium bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleCopyMetrics}
                  className="px-4 py-2 rounded font-medium bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
                >
                  Copy Metrics
                </button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Framework Components</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ SimulationController (demo implementation)</li>
              <li>✓ TimeSeriesStore (in-memory)</li>
              <li>✓ MetricsGrid component</li>
              <li>✓ TimelineSlider component</li>
              <li>✓ ControlButtons component</li>
              <li>✓ useSimulation hook</li>
              <li>✓ ExportService</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabDemoPage;
