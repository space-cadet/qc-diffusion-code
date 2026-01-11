import { ParticleManager } from './ParticleManager';
import { ObservableManager } from './ObservableManager';
import { StreamObservableManager } from './stream-ObservableManager';
import { USE_NEW_ENGINE } from './config/flags';
import { PhysicsEngine } from './core/PhysicsEngine';
import { CoordinateSystem } from './core/CoordinateSystem';
import { getDensityProfile1D as densityProfile1DUtil, getDensityProfile2D as densityProfile2DUtil, getDensityField1D as densityField1DUtil } from './utils/density';
import { generateThermalVelocities as genThermalUtil } from './utils/ThermalVelocities';
import { sampleCanvasPosition as samplePosUtil } from './utils/InitDistributions';
import { analyzeWaveFrontSpeed as analyzeWavefrontSpeedUtil } from './analysis/WavefrontAnalysis';
import { ParameterManager } from './core/ParameterManager';
import { createStrategies, createPhysicsStrategies } from './factories/StrategyFactory';
import { LegacySimulationRunner, EngineSimulationRunner } from './core/SimulationRunner';
import { CompositeStrategy } from './strategies/CompositeStrategy';
export class RandomWalkSimulator {
    constructor(config) {
        this.time = 0;
        this.densityHistory = [];
        this.useNewEngine = config.useNewEngine ?? USE_NEW_ENGINE === true;
        this.useStreamingObservables = config.useStreamingObservables ?? false;
        this.parameterManager = new ParameterManager(config);
        // DIAG: Log effective boundary configuration and canvas size at initialization
        try {
            const bc = this.parameterManager.getBoundaryConfig();
            // eslint-disable-next-line no-console
            console.log('[RWS:init] BoundaryConfig', {
                type: bc.type,
                xMin: bc.xMin,
                xMax: bc.xMax,
                yMin: bc.yMin,
                yMax: bc.yMax,
                canvas: { width: this.parameterManager.canvasWidth, height: this.parameterManager.canvasHeight },
            });
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[RWS:init] Failed to read BoundaryConfig:', e);
        }
        this.setupStrategies();
        this.setupParticleManager();
        this.setupSimulationRunner();
        if (this.useStreamingObservables) {
            this.observableManager = new StreamObservableManager({
                width: this.parameterManager.canvasWidth,
                height: this.parameterManager.canvasHeight
            });
        }
        else {
            this.observableManager = new ObservableManager({
                width: this.parameterManager.canvasWidth,
                height: this.parameterManager.canvasHeight
            });
        }
        this.initializeParticles();
    }
    setupStrategies() {
        const boundaryConfig = this.parameterManager.getBoundaryConfig();
        this.strategies = createStrategies(this.parameterManager, boundaryConfig);
        // If multiple strategies are returned, wrap them into a CompositeStrategy so the
        // ParticleManager and PhysicsEngine receive a single strategy that orchestrates them.
        this.currentStrategy = this.strategies.length > 1
            ? new CompositeStrategy(this.strategies)
            : this.strategies[0];
        console.log('[RWS] Strategy initialized:', {
            strategyCount: this.strategies.length,
            currentStrategy: this.currentStrategy.constructor.name,
            isComposite: this.currentStrategy instanceof CompositeStrategy
        });
    }
    setupParticleManager() {
        const boundaryConfig = this.parameterManager.getBoundaryConfig();
        const coordinateSystem = new CoordinateSystem({ width: this.parameterManager.canvasWidth, height: this.parameterManager.canvasHeight }, boundaryConfig, this.parameterManager.dimension);
        this.particleManager = new ParticleManager(this.currentStrategy, this.parameterManager.dimension, coordinateSystem);
    }
    setupSimulationRunner() {
        console.log('[RWS] setupSimulationRunner', { useNewEngine: this.useNewEngine });
        if (this.useNewEngine) {
            try {
                // Get physics strategies directly instead of using adapter
                const physicsStrategies = createPhysicsStrategies(this.parameterManager, this.parameterManager.getBoundaryConfig());
                this.physicsEngine = new PhysicsEngine({
                    timeStep: this.parameterManager.dt,
                    boundaries: this.parameterManager.getBoundaryConfig(),
                    canvasSize: { width: this.parameterManager.canvasWidth, height: this.parameterManager.canvasHeight },
                    dimension: this.parameterManager.dimension,
                    strategies: physicsStrategies,
                });
                this.simulationRunner = new EngineSimulationRunner(this.physicsEngine, this.particleManager);
                console.log('[RWS] Using EngineSimulationRunner with direct PhysicsStrategies');
            }
            catch (e) {
                console.warn('[RandomWalkSimulator] Failed to initialize PhysicsEngine (fallback to legacy path):', e);
                this.physicsEngine = undefined;
                this.simulationRunner = new LegacySimulationRunner(this.particleManager);
                console.log('[RWS] Fallback to LegacySimulationRunner');
            }
        }
        else {
            this.simulationRunner = new LegacySimulationRunner(this.particleManager);
            console.log('[RWS] Using LegacySimulationRunner (flag disabled)');
        }
    }
    sampleCanvasPosition(i) {
        return samplePosUtil(i, {
            canvasWidth: this.parameterManager.canvasWidth,
            canvasHeight: this.parameterManager.canvasHeight,
            dimension: this.parameterManager.dimension,
            initialDistType: this.parameterManager.initialDistType,
            distSigmaX: this.parameterManager.distSigmaX,
            distSigmaY: this.parameterManager.distSigmaY,
            distR0: this.parameterManager.distR0,
            distDR: this.parameterManager.distDR,
            distThickness: this.parameterManager.distThickness,
            distNx: this.parameterManager.distNx,
            distNy: this.parameterManager.distNy,
            distJitter: this.parameterManager.distJitter,
        });
    }
    initializeParticles() {
        this.particleManager.clearAllParticles();
        const thermalVelocities = this.generateThermalVelocities(this.parameterManager.particleCount, this.parameterManager.dimension);
        const positions = [];
        for (let i = 0; i < this.parameterManager.particleCount; i++) {
            const pos = this.sampleCanvasPosition(i);
            positions.push(pos);
            const thermalVelocity = thermalVelocities[i];
            if (i < 3) {
                console.log('[RWS] init particle', i, {
                    position: pos,
                    velocity: thermalVelocity,
                    canvasSize: { width: this.parameterManager.canvasWidth, height: this.parameterManager.canvasHeight }
                });
            }
            const tsParticle = {
                id: `p${i}`,
                position: pos,
                velocity: thermalVelocity
            };
            this.particleManager.initializeParticle(tsParticle);
        }
    }
    generateThermalVelocities(count, dimension) {
        const velocities = genThermalUtil(count, dimension, this.parameterManager.temperature);
        return velocities;
    }
    step(dt) {
        if (!this.simulationRunner)
            return;
        // console.log('[RWS] step called', { dt, hasSimulationRunner: !!this.simulationRunner, currentTime: this.time });
        const timeStep = this.simulationRunner.step(dt);
        this.time += timeStep;
        // console.log('[RWS] step completed', { timeStep, newTime: this.time });
        // Observable calculations now triggered only during polling, not every simulation step
        const particles = this.particleManager.getAllParticles();
        if (this.observableManager instanceof StreamObservableManager) {
            this.observableManager.updateSnapshotAndCalculate(particles, this.time);
        }
        // Regular ObservableManager updateSnapshot moved to polling system
    }
    reset() {
        this.time = 0;
        this.initializeParticles();
    }
    updateParameters(params) {
        const needsReinitialization = this.parameterManager.updateParameters(params);
        // Always recreate strategies when strategies, physics parameters, or interparticle collisions change
        const needsStrategyUpdate = params.strategies || params.collisionRate !== undefined ||
            params.jumpLength !== undefined || params.velocity !== undefined ||
            params.interparticleCollisions !== undefined;
        if (needsStrategyUpdate) {
            // Preserve current boundary config before strategy recreation
            const currentBoundaryConfig = this.parameterManager.getBoundaryConfig();
            this.setupStrategies();
            this.particleManager.updatePhysicsEngine(this.currentStrategy);
            // New engine path: also refresh engine strategies so runtime toggles take effect
            if (this.useNewEngine && this.physicsEngine) {
                // Get physics strategies directly instead of using adapter
                const physicsStrategies = createPhysicsStrategies(this.parameterManager, currentBoundaryConfig);
                this.physicsEngine.updateConfiguration({
                    strategies: physicsStrategies,
                    boundaries: currentBoundaryConfig
                });
            }
            // Recreate particle manager with preserved boundary config
            const coordinateSystem = new CoordinateSystem({ width: this.parameterManager.canvasWidth, height: this.parameterManager.canvasHeight }, currentBoundaryConfig, this.parameterManager.dimension);
            this.particleManager = new ParticleManager(this.currentStrategy, this.parameterManager.dimension, coordinateSystem);
        }
        this.particleManager.setCanvasSize(this.parameterManager.canvasWidth, this.parameterManager.canvasHeight);
        // Lightweight path: if only boundaries changed and the new engine is active, update in place
        const boundaryChanged = params.boundaryCondition !== undefined;
        const dtChanged = params.dt !== undefined;
        const onlyBoundaryChanged = boundaryChanged && Object.keys(params).every((k) => k === 'boundaryCondition');
        if (this.useNewEngine && this.physicsEngine && !needsReinitialization) {
            // Update boundaries and/or timestep in place when possible
            const partial = {};
            if (boundaryChanged)
                partial.boundaries = this.parameterManager.getBoundaryConfig();
            if (dtChanged)
                partial.timeStep = this.parameterManager.dt;
            if (Object.keys(partial).length > 0) {
                this.physicsEngine.updateConfiguration(partial);
            }
            // Keep existing runner; no rebuild necessary
        }
        else {
            this.setupSimulationRunner();
        }
        if (needsReinitialization) {
            this.initializeParticles();
        }
    }
    getDensityField() {
        const particles = this.particleManager.getAllParticles();
        return densityField1DUtil(particles, this.parameterManager.particleCount, 0.1, 1000);
    }
    getDensityProfile2D(binSize = 10) {
        const particles = this.particleManager.getAllParticles();
        return densityProfile2DUtil(particles, this.parameterManager.particleCount, binSize);
    }
    getDensityProfile1D(binSize = 10) {
        const particles = this.particleManager.getAllParticles();
        return densityProfile1DUtil(particles, this.parameterManager.particleCount, binSize);
    }
    getCollisionStats() {
        return this.particleManager.getCollisionStats();
    }
    getTime() {
        return this.time;
    }
    getParticleManager() {
        return this.particleManager;
    }
    getBoundaryConfig() {
        return this.parameterManager.getBoundaryConfig();
    }
    getPhysicsEngine() {
        return this.physicsEngine;
    }
    getParticleCount() {
        return this.parameterManager.particleCount;
    }
    getDimension() {
        return this.parameterManager.dimension;
    }
    getStrategy() {
        return this.currentStrategy.constructor.name;
    }
    registerObservable(observable) {
        this.observableManager.register(observable);
    }
    unregisterObservable(id) {
        this.observableManager.unregister(id);
    }
    getObservableData(id) {
        if ('getResult' in this.observableManager) {
            return this.observableManager.getResult(id);
        }
        console.warn(`[RandomWalkSimulator] getResult is not available for the current observable manager.`);
        return null;
    }
    getObservableManager() {
        return this.observableManager;
    }
    recordDensitySnapshot(binSize = 15) {
        const profile = this.getDensityProfile2D(binSize);
        if (profile.density.length > 0) {
            this.densityHistory.push({
                time: this.time,
                density: profile.density,
                bounds: {
                    xMin: profile.xBounds.min,
                    xMax: profile.xBounds.max,
                    yMin: profile.yBounds.min,
                    yMax: profile.yBounds.max
                }
            });
            if (this.densityHistory.length > 10) {
                this.densityHistory.shift();
            }
        }
    }
    getDensityHistory() {
        return this.densityHistory;
    }
    clearDensityHistory() {
        this.densityHistory = [];
    }
    dispose() {
        this.clearDensityHistory();
        this.observableManager.reset();
        this.particleManager.clearAllParticles();
        if (this.physicsEngine) {
            this.physicsEngine.dispose();
            this.physicsEngine = undefined;
        }
        this.simulationRunner = undefined;
    }
    analyzeWaveFrontSpeed() {
        return analyzeWavefrontSpeedUtil(this.densityHistory, this.currentStrategy);
    }
}
