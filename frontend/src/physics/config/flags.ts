// Feature flags (Vite + Jest compatible)
// To enable the new physics engine in local dev, set:
// VITE_USE_NEW_PHYSICS_ENGINE=true

declare const VITE_USE_NEW_PHYSICS_ENGINE: string | undefined;

// Use different approaches for Vite vs Jest environments
function getNewEngineFlag(): boolean {
  // Jest/Node environment - check process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env.VITE_USE_NEW_PHYSICS_ENGINE === 'true';
  }
  
  // Vite environment - check if Vite injected the variable
  if (typeof VITE_USE_NEW_PHYSICS_ENGINE !== 'undefined') {
    return VITE_USE_NEW_PHYSICS_ENGINE === 'true';
  }
  
  return false;
}

export const USE_NEW_ENGINE = getNewEngineFlag();
