import { CoordinateSystem } from '../core/CoordinateSystem';
import { CTRWStrategy1D } from '../strategies/CTRWStrategy1D';
import { CTRWStrategy2D } from '../strategies/CTRWStrategy2D';
import { CompositeStrategy } from '../strategies/CompositeStrategy';
import { InterparticleCollisionStrategy2D } from '../strategies/InterparticleCollisionStrategy2D';
import { InterparticleCollisionStrategy1D } from '../strategies/InterparticleCollisionStrategy1D';
import { BallisticStrategy } from '../strategies/BallisticStrategy';
export function createStrategies(parameterManager, boundaryConfig) {
    return createStrategiesInternal(parameterManager, boundaryConfig, false);
}
export function createPhysicsStrategies(parameterManager, boundaryConfig) {
    return createStrategiesInternal(parameterManager, boundaryConfig, true);
}
function createStrategiesInternal(parameterManager, boundaryConfig, forPhysicsEngine) {
    const config = { dimension: parameterManager.dimension, strategies: parameterManager.strategies };
    const physicsParams = parameterManager.getPhysicsParameters();
    const selectedStrategies = config.strategies || [];
    // Create coordinate system instance for strategies that need it (use actual canvas size)
    const coordSystem = new CoordinateSystem({ width: parameterManager.canvasWidth, height: parameterManager.canvasHeight }, boundaryConfig, config.dimension);
    // For 1D, compose strategies: base is CTRW1D if selected else Ballistic; collisions added if selected
    if (config.dimension === '1D') {
        const oneDStrategies = [];
        if (selectedStrategies.includes('ctrw')) {
            oneDStrategies.push(new CTRWStrategy1D({
                collisionRate: physicsParams.collisionRate,
                jumpLength: physicsParams.jumpLength,
                velocity: physicsParams.velocity,
                boundaryConfig: boundaryConfig,
                interparticleCollisions: false, // collisions handled via separate 1D strategy below
                coordSystem,
            }));
        }
        else {
            // Always use modern BallisticStrategy (uses BoundaryManager). LegacyBallisticStrategy is deprecated.
            oneDStrategies.push(new BallisticStrategy({ boundaryConfig, coordSystem }));
        }
        if (selectedStrategies.includes('collisions')) {
            oneDStrategies.push(new InterparticleCollisionStrategy1D({ boundaryConfig: boundaryConfig, coordSystem }));
        }
        if (forPhysicsEngine) {
            // For physics engine, return array of PhysicsStrategy instances directly
            return oneDStrategies;
        }
        else {
            // For legacy path, wrap in CompositeStrategy if needed
            return oneDStrategies.length === 1 ? [oneDStrategies[0]] : [new CompositeStrategy(oneDStrategies)];
        }
    }
    // For 2D, compose strategies: base is Ballistic; others are added if selected
    else {
        // Always use modern BallisticStrategy (uses BoundaryManager). LegacyBallisticStrategy is deprecated.
        const twoDStrategies = [
            new BallisticStrategy({ boundaryConfig, coordSystem })
        ];
        if (selectedStrategies.includes('ctrw')) {
            twoDStrategies.push(new CTRWStrategy2D({
                collisionRate: physicsParams.collisionRate,
                jumpLength: physicsParams.jumpLength,
                velocity: physicsParams.velocity,
                boundaryConfig: boundaryConfig,
                coordSystem
            }));
        }
        if (selectedStrategies.includes('collisions')) {
            twoDStrategies.push(new InterparticleCollisionStrategy2D({ boundaryConfig, coordSystem }));
        }
        if (forPhysicsEngine) {
            // For physics engine, return array of PhysicsStrategy instances directly
            return twoDStrategies;
        }
        else {
            // For legacy path, wrap in CompositeStrategy if needed
            return twoDStrategies.length === 1 ? [twoDStrategies[0]] : [new CompositeStrategy(twoDStrategies)];
        }
    }
}
