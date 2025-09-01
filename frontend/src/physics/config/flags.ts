// Feature flags (Vite + Jest compatible)
// To enable the new physics engine in local dev, set:
// VITE_USE_NEW_PHYSICS_ENGINE=true

// Use different approaches for Vite vs Jest environments
export function getNewEngineFlag(): boolean {
  // Jest/Node environment - check process.env
  if (typeof process !== 'undefined' && process.env && typeof process.env.VITE_USE_NEW_PHYSICS_ENGINE !== 'undefined') {
    return process.env.VITE_USE_NEW_PHYSICS_ENGINE === 'true';
  }

  // Vite/browser environment - read from import.meta.env
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && typeof (import.meta as any).env.VITE_USE_NEW_PHYSICS_ENGINE !== 'undefined') {
    return (import.meta as any).env.VITE_USE_NEW_PHYSICS_ENGINE === 'true';
  }

  return false;
}

export const USE_NEW_ENGINE = getNewEngineFlag();
