import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import PlotlyChart from './PlotlyChart';
const ResponsiveGridLayout = WidthProvider(Responsive);
const Panel = ({ title, children, onCollapse, isCollapsed }) => (<div className="bg-white rounded-lg shadow-md border border-gray-200 h-full flex flex-col">
    <div className="drag-handle bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg flex justify-between items-center cursor-move">
      <h3 className="font-semibold text-gray-700">{title}</h3>
      {onCollapse && (<button onClick={onCollapse} className="text-gray-500 hover:text-gray-700 text-sm">
          {isCollapsed ? '▼' : '▲'}
        </button>)}
    </div>
    {!isCollapsed && (<div className="p-4 flex-1 overflow-auto">
        {children}
      </div>)}
  </div>);
const DataImportPanel = () => {
    const [importStatus, setImportStatus] = useState('idle');
    const handleImportSimulation = () => {
        setImportStatus('importing');
        // TODO: Import data from simulation stores
        setTimeout(() => setImportStatus('success'), 1000);
    };
    return (<div className="space-y-4">
      <div className="flex flex-col gap-2">
        <button onClick={handleImportSimulation} disabled={importStatus === 'importing'} className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded">
          {importStatus === 'importing' ? 'Importing...' : 'Import from Simulation'}
        </button>
        <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded">
          Load CSV File
        </button>
      </div>
      
      <div className="text-sm text-gray-600">
        <div>Status: {importStatus}</div>
        <div>Data Points: 0</div>
        <div>Time Range: N/A</div>
      </div>
    </div>);
};
const PlotConfigPanel = () => {
    const [plotType, setPlotType] = useState('line');
    const [xAxis, setXAxis] = useState('time');
    const [yAxis, setYAxis] = useState('position');
    return (<div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Plot Type</label>
        <select value={plotType} onChange={(e) => setPlotType(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
          <option value="line">Line Plot</option>
          <option value="scatter">Scatter Plot</option>
          <option value="histogram">Histogram</option>
          <option value="heatmap">Heatmap</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">X-Axis</label>
        <select value={xAxis} onChange={(e) => setXAxis(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
          <option value="time">Time</option>
          <option value="position">Position</option>
          <option value="velocity">Velocity</option>
          <option value="particle_id">Particle ID</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Y-Axis</label>
        <select value={yAxis} onChange={(e) => setYAxis(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2">
          <option value="position">Position</option>
          <option value="velocity">Velocity</option>
          <option value="density">Density</option>
          <option value="msd">Mean Square Displacement</option>
        </select>
      </div>
      
      <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full">
        Generate Plot
      </button>
    </div>);
};
const PlotDisplayPanel = () => {
    const [hasData, setHasData] = useState(false);
    // Sample data for demonstration
    const sampleData = [
        {
            x: [1, 2, 3, 4, 5],
            y: [2, 4, 3, 5, 6],
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Sample Data',
            line: { color: 'rgb(219, 64, 82)' }
        }
    ];
    const plotLayout = {
        title: 'Simulation Analysis',
        xaxis: { title: 'Time' },
        yaxis: { title: 'Value' },
        showlegend: true
    };
    if (!hasData) {
        return (<div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">📊</div>
          <div>Plot will appear here</div>
          <div className="text-sm mb-4">Configure and generate plot to view</div>
          <button onClick={() => setHasData(true)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm">
            Show Sample Plot
          </button>
        </div>
      </div>);
    }
    return (<div className="h-full">
      <PlotlyChart data={sampleData} layout={plotLayout} config={{ displayModeBar: true }}/>
    </div>);
};
const ExportControlsPanel = () => {
    return (<div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Export Format</label>
        <select className="w-full border border-gray-300 rounded px-3 py-2">
          <option value="png">PNG Image</option>
          <option value="pdf">PDF Document</option>
          <option value="svg">SVG Vector</option>
          <option value="csv">CSV Data</option>
          <option value="json">JSON Data</option>
        </select>
      </div>
      
      <div className="flex flex-col gap-2">
        <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded">
          Export Plot
        </button>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded">
          Export Data
        </button>
      </div>
      
      <div className="text-sm text-gray-600">
        <div>Last Export: Never</div>
        <div>File Size: N/A</div>
      </div>
    </div>);
};
const AnalysisPage = () => {
    const [layouts, setLayouts] = useState({
        lg: [
            { i: 'data-import', x: 0, y: 0, w: 3, h: 6, minW: 2, minH: 4 },
            { i: 'plot-config', x: 3, y: 0, w: 3, h: 6, minW: 2, minH: 4 },
            { i: 'plot-display', x: 6, y: 0, w: 6, h: 8, minW: 4, minH: 6 },
            { i: 'export-controls', x: 0, y: 6, w: 6, h: 4, minW: 3, minH: 3 },
        ],
    });
    const handleLayoutChange = (layout, layouts) => {
        setLayouts(layouts);
    };
    return (<div className="h-screen bg-gray-100 p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Analysis Dashboard</h1>
        <p className="text-gray-600">Advanced plotting and analysis tools for simulation data</p>
      </div>
      
      <ResponsiveGridLayout className="layout" layouts={layouts} onLayoutChange={handleLayoutChange} breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }} cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }} rowHeight={60} draggableHandle=".drag-handle">
        <div key="data-import">
          <Panel title="Data Import">
            <DataImportPanel />
          </Panel>
        </div>
        
        <div key="plot-config">
          <Panel title="Plot Configuration">
            <PlotConfigPanel />
          </Panel>
        </div>
        
        <div key="plot-display">
          <Panel title="Plot Display">
            <PlotDisplayPanel />
          </Panel>
        </div>
        
        <div key="export-controls">
          <Panel title="Export Controls">
            <ExportControlsPanel />
          </Panel>
        </div>
      </ResponsiveGridLayout>
    </div>);
};
export default AnalysisPage;
