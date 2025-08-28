// Feature flags (Vite)
// To enable the new physics engine in local dev, set:
// VITE_USE_NEW_PHYSICS_ENGINE=true
export const USE_NEW_ENGINE = (import.meta as any).env?.VITE_USE_NEW_PHYSICS_ENGINE === 'true';
