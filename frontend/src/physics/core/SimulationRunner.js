var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _EngineSimulationRunner_physicsEngine, _EngineSimulationRunner_particleManager;
export class LegacySimulationRunner {
    constructor(particleManager) {
        this.particleManager = particleManager;
    }
    step(dt) {
        // console.log('[LSR] step called', { dt, hasParticleManager: !!this.particleManager });
        this.particleManager.update(dt);
        // console.log('[LSR] step completed');
        return dt;
    }
}
export class EngineSimulationRunner {
    constructor(physicsEngine, particleManager) {
        _EngineSimulationRunner_physicsEngine.set(this, void 0);
        _EngineSimulationRunner_particleManager.set(this, void 0);
        __classPrivateFieldSet(this, _EngineSimulationRunner_physicsEngine, physicsEngine, "f");
        __classPrivateFieldSet(this, _EngineSimulationRunner_particleManager, particleManager, "f");
    }
    step(dt) {
        // console.log('[ESR] step called', { dt, hasPhysicsEngine: !!this.#physicsEngine, hasParticleManager: !!this.#particleManager });
        const particles = __classPrivateFieldGet(this, _EngineSimulationRunner_particleManager, "f").getAllParticles();
        const physicsTimeStep = __classPrivateFieldGet(this, _EngineSimulationRunner_physicsEngine, "f").step(particles);
        // No need to call particleManager.update() as particles are already updated by the PhysicsEngine
        // through the PhysicsStrategy implementations
        // console.log('[ESR] step completed', { physicsTimeStep });
        return physicsTimeStep;
    }
}
_EngineSimulationRunner_physicsEngine = new WeakMap(), _EngineSimulationRunner_particleManager = new WeakMap();
