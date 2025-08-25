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
  dtInfo?: {
    dt_ui: number;
    dt_limit_diff?: number; 
    dt_limit_tel?: number;  
    dt_effective: number;   
    safety: number;
  };
  equationParams?: {
    selected: string[];
    telegraph?: { collision_rate: number; velocity: number };
    diffusion?: { diffusivity: number };
  };
}

export default function ConservationDisplay({ 
  currentQuantities, 
  errors, 
  isStable,
  dtInfo,
  equationParams
}: ConservationDisplayProps) {
  if (!currentQuantities) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded border text-sm">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-gray-800">Conserved Quantities</h4>
          <span className="px-2 py-1 rounded text-sm font-medium bg-gray-100 text-gray-700">
            Not Running
          </span>
        </div>
        <div className="text-gray-600 text-sm text-center py-2">
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
    <div className="mt-3 p-3 bg-gray-50 rounded border text-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-base font-semibold text-gray-800">Conserved Quantities</h4>
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          isStable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isStable ? 'Stable' : 'Unstable'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="font-medium text-gray-700 mb-1">Mass</div>
          <div className="space-y-1">
            <div>Telegraph: <span className="font-mono text-[0.95rem]">{formatNumber(currentQuantities.mass_telegraph)}</span></div>
            <div className="text-gray-600">Error: <span className="font-mono">{formatError(errors.mass_telegraph_error)}</span></div>
          </div>
          <div className="space-y-1 mt-1">
            <div>Diffusion: <span className="font-mono text-[0.95rem]">{formatNumber(currentQuantities.mass_diffusion)}</span></div>
            <div className="text-gray-600">Error: <span className="font-mono">{formatError(errors.mass_diffusion_error)}</span></div>
          </div>
        </div>
        
        <div>
          <div className="font-medium text-gray-700 mb-1">Energy</div>
          <div className="space-y-1">
            <div>Telegraph: <span className="font-mono text-[0.95rem]">{formatNumber(currentQuantities.energy_telegraph)}</span></div>
            <div className="text-gray-600">Error: <span className="font-mono">{formatError(errors.energy_telegraph_error)}</span></div>
          </div>
        </div>
      </div>
      
      <div className="mt-2 text-gray-700 text-sm">
        Time: <span className="font-mono">{currentQuantities.time.toFixed(3)}s</span>
      </div>

      {/* dt diagnostics */}
      {dtInfo && (
        <div className="mt-3 p-3 rounded bg-white border text-gray-800">
          <div className="font-medium mb-2">Time Step Diagnostics</div>
          <div className="grid grid-cols-2 gap-3">
            <div>UI dt: <span className="font-mono text-[0.95rem]">{dtInfo.dt_ui.toExponential(3)}</span></div>
            <div>Effective dt: <span className="font-mono text-[0.95rem]">{dtInfo.dt_effective.toExponential(3)}</span> <span className="text-gray-600">(safety {dtInfo.safety})</span></div>
            {typeof dtInfo.dt_limit_diff === 'number' && (
              <div>Diffusion limit: <span className="font-mono text-[0.95rem]">{dtInfo.dt_limit_diff.toExponential(3)}</span></div>
            )}
            {typeof dtInfo.dt_limit_tel === 'number' && (
              <div>Telegraph limit: <span className="font-mono text-[0.95rem]">{dtInfo.dt_limit_tel.toExponential(3)}</span></div>
            )}
          </div>
        </div>
      )}

      {equationParams && (
        <div className="mt-3 p-3 rounded bg-white border text-gray-800">
          <div className="font-medium mb-2">Parameters</div>
          <div className="space-y-2">
            <div>Selected: <span className="font-mono">{equationParams.selected.join(', ')}</span></div>
            {equationParams.telegraph && (
              <div className="grid grid-cols-2 gap-3">
                <div>Telegraph a (collision_rate): <span className="font-mono">{equationParams.telegraph.collision_rate.toExponential(3)}</span></div>
                <div>Telegraph v (velocity): <span className="font-mono">{equationParams.telegraph.velocity.toExponential(3)}</span></div>
              </div>
            )}
            {equationParams.diffusion && (
              <div>Diffusion k (diffusivity): <span className="font-mono">{equationParams.diffusion.diffusivity.toExponential(3)}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
