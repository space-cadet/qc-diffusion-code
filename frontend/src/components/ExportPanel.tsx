import React from 'react';

export const ExportPanel = ({ simulationState, onExport, onCopy, onShare }) => {
  const handleExport = (format: string) => {
    if (!simulationState?.particleData || simulationState.particleData.length === 0) {
      alert('No data to export. Please run the simulation first.');
      return;
    }

    switch (format) {
      case 'csv':
        exportCSV();
        break;
      case 'json':
        exportJSON();
        break;
      case 'hdf5':
        alert('HDF5 export not yet implemented');
        break;
      default:
        console.log(`Exporting in ${format} format`);
    }
  };

  const exportCSV = () => {
    const data = simulationState.particleData;
    let csv = 'id,x,y,vx,vy,collisionCount,lastCollisionTime,waitingTime\n';
    
    data.forEach(particle => {
      csv += `${particle.id},${particle.position.x},${particle.position.y},${particle.velocity.vx},${particle.velocity.vy},${particle.collisionCount},${particle.lastCollisionTime},${particle.waitingTime}\n`;
    });

    downloadFile(csv, `random-walk-data-${Date.now()}.csv`, 'text/csv');
  };

  const exportJSON = () => {
    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        simulationTime: simulationState.time,
        particleCount: simulationState.particleData.length,
        collisions: simulationState.collisions,
        interparticleCollisions: simulationState.interparticleCollisions
      },
      particles: simulationState.particleData,
      densityHistory: simulationState.densityHistory || [],
      observableData: simulationState.observableData || {}
    };

    const json = JSON.stringify(exportData, null, 2);
    downloadFile(json, `random-walk-data-${Date.now()}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!simulationState?.particleData) {
      alert('No data to copy. Please run the simulation first.');
      return;
    }

    const summary = {
      time: simulationState.time,
      particles: simulationState.particleData.length,
      collisions: simulationState.collisions,
      interparticleCollisions: simulationState.interparticleCollisions
    };

    navigator.clipboard.writeText(JSON.stringify(summary, null, 2))
      .then(() => alert('Summary copied to clipboard!'))
      .catch(err => console.error('Failed to copy:', err));
  };

  const handleShare = () => {
    if (!simulationState?.particleData) {
      alert('No data to share. Please run the simulation first.');
      return;
    }

    const summary = {
      time: simulationState.time,
      particles: simulationState.particleData.length,
      collisions: simulationState.collisions
    };

    const shareUrl = `${window.location.origin}?data=${btoa(JSON.stringify(summary))}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Share link copied to clipboard!'))
      .catch(err => console.error('Failed to create share link:', err));
  };
    return (<div className="bg-white border rounded-lg p-4 h-full">
      <h3 className="drag-handle text-lg font-semibold mb-4 flex items-center cursor-move">
        📊 Data Export
      </h3>

      <div className="space-y-4 text-sm">
        <div>
          <label className="block mb-1">Export Format:</label>
          <div className="flex gap-2">
            <button className="px-2 py-1 bg-blue-500 text-white rounded text-xs" onClick={() => handleExport('csv')}>
              CSV
            </button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={() => handleExport('json')}>
              JSON
            </button>
            <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={() => handleExport('hdf5')}>
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
          <button className="px-3 py-1 bg-green-500 text-white rounded text-xs" onClick={() => handleExport('csv')}>
            📥 Download
          </button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={handleCopy}>
            📋
          </button>
          <button className="px-2 py-1 bg-gray-100 rounded text-xs" onClick={handleShare}>
            🔗
          </button>
        </div>
      </div>
    </div>);
};
