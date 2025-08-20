import React from 'react';
import type { ConservationQuantities } from './utils/conservationMonitor';

interface ConservationDisplayProps {
  currentQuantities: ConservationQuantities | null;
  errors: {
    mass_telegraph_error: number;
    mass_diffusion_error: number;
    energy_telegraph_error: number;
  };
  isStable: boolean;
}

export default function ConservationDisplay({ 
  currentQuantities, 
  errors, 
  isStable 
}: ConservationDisplayProps) {
  if (!currentQuantities) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded border text-xs">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-700">Conservation Quantities</h4>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Not Running
          </span>
        </div>
        <div className="text-gray-500 text-xs text-center py-2">
          Start simulation to monitor conservation quantities
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (Math.abs(num) < 1e-10) return '0.000';
    return num.toExponential(3);
  };

  const formatError = (error: number) => {
    if (error < 1e-10) return '< 1e-10';
    return (error * 100).toFixed(3) + '%';
  };

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded border text-xs">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-700">Conservation Quantities</h4>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          isStable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isStable ? 'Stable' : 'Unstable'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="font-medium text-gray-600 mb-1">Mass Conservation</div>
          <div className="space-y-1">
            <div>Telegraph: {formatNumber(currentQuantities.mass_telegraph)}</div>
            <div className="text-gray-500">Error: {formatError(errors.mass_telegraph_error)}</div>
          </div>
          <div className="space-y-1 mt-1">
            <div>Diffusion: {formatNumber(currentQuantities.mass_diffusion)}</div>
            <div className="text-gray-500">Error: {formatError(errors.mass_diffusion_error)}</div>
          </div>
        </div>
        
        <div>
          <div className="font-medium text-gray-600 mb-1">Energy Conservation</div>
          <div className="space-y-1">
            <div>Telegraph: {formatNumber(currentQuantities.energy_telegraph)}</div>
            <div className="text-gray-500">Error: {formatError(errors.energy_telegraph_error)}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-gray-500 text-xs">
        Time: {currentQuantities.time.toFixed(3)}s
      </div>
    </div>
  );
}
