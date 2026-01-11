import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';
import { GPUCollisionManager } from './GPUCollisionManager';
import POSITION_UPDATE_SHADER from './shaders/positionUpdate.glsl?raw';
import VELOCITY_UPDATE_SHADER from './shaders/velocityUpdate.glsl?raw';
import CTRW_SHADER from './shaders/ctrw.glsl?raw';
import { boundaryConditionMap } from './lib/GPUParams';
import { syncParticlesToContainer } from './lib/GPUSync';
// TODO[C16-Phase2 GPU Collisions]: Minimal MVP plan (comments only, no behavior change)
// 1) Data layout
//    - positionLayer: vec2 (x,y)
//    - velocityLayer: vec2 (vx,vy)
//    - radius: derive from UI for now (uniform) or pack into spare channels if needed later
// 2) Spatial binning (coarse):
//    - Build a per-pixel cell index texture from position (compute cell id via bounds + cellSize)
//    - Option A (simplest): fixed-capacity per cell: write up to K indices; overflow: skip
//    - Option B: prefix-sum compaction (later). Start with Option A.
// 3) Collision pass ordering (per step):
//    - Pass A: position update (existing)
//    - Pass B: velocity boundary update (existing)
//    - Pass C: collision update (new): for each particle, scan 3x3 neighboring cells (max N per cell),
//             resolve at most M collisions per particle deterministically. Equal mass 2D using n/t projection.
// 4) Validation:
//    - For small N (<= 256), mirror CPU strategy and compare per-step energies; target <1% error.
//    - Log collision counts and step timings via getMetrics().
// 5) Fallback:
//    - If shaders fail or capacities exceeded, skip collisions and continue with advection only.
// POSITION_UPDATE_SHADER imported from external GLSL file
// VELOCITY_UPDATE_SHADER imported from external GLSL file
// boundaryConditionMap imported from GPUParams
export class GPUParticleManager {
    constructor(canvas, particleCount) {
        this.ctrwTempLayer = null; // persistent temp layer for CTRW pass
        this.collisionCount = 0;
        this.boundaryCondition = 'periodic';
        this.bounds = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
        this.interparticleCollisions = false;
        this.lastCollisionLogTime = 0;
        this.lastDebugLogTime = 0;
        this.showCollisions = true;
        this.useCTRW = false;
        this.collisionRate = 1.0;
        this.jumpLength = 1.0;
        this.speed = 1.0; // current speed used by velocity-jump CTRW
        console.log('[GPU] Initializing GPUParticleManager', { particleCount });
        // Store particle count early
        this.particleCount = particleCount;
        // Log initial boundary conditions
        console.log('[GPU] Initial boundary conditions:', {
            condition: this.boundaryCondition,
            bounds: this.bounds
        });
        // Compute texture grid size for state storage
        const textureSize = Math.ceil(Math.sqrt(particleCount));
        console.log('[GPU] Texture size:', textureSize);
        // Create an internal offscreen canvas to avoid context conflicts with tsParticles (2D canvas)
        const offscreenCanvas = document.createElement('canvas');
        // Minimal but sufficient size; gpu-io renders to this canvas, but we mainly use it for compute
        offscreenCanvas.width = Math.max(1, textureSize);
        offscreenCanvas.height = Math.max(1, textureSize);
        // Acquire WebGL2/WebGL context on the offscreen canvas with compute-friendly attributes
        const contextAttributes = {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            preserveDrawingBuffer: false,
            premultipliedAlpha: false,
            desynchronized: true // not in all TS defs but widely supported
        };
        const gl = offscreenCanvas.getContext('webgl2', contextAttributes)
            || offscreenCanvas.getContext('webgl', contextAttributes);
        if (!gl) {
            throw new Error('WebGL not supported or context unavailable (offscreen)');
        }
        if (gl.isContextLost && gl.isContextLost()) {
            throw new Error('WebGL context is lost (offscreen)');
        }
        console.log('[GPU] Offscreen WebGL context check passed');
        try {
            // Initialize GPUComposer with the offscreen canvas
            this.composer = new GPUComposer({ canvas: offscreenCanvas });
            console.log('[GPU] GPUComposer created successfully (offscreen)');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[GPU] Failed to create GPUComposer:', err);
            throw new Error(`GPU initialization failed: ${msg}`);
        }
        // Use constructors for GPULayer/GPUProgram per gpu-io API
        this.positionLayer = new GPULayer(this.composer, {
            name: 'position',
            dimensions: [textureSize, textureSize],
            type: 'FLOAT',
            filter: 'NEAREST',
            numComponents: 2,
            // Need double buffer to read previous state while writing new
            numBuffers: 2
        });
        this.velocityLayer = new GPULayer(this.composer, {
            name: 'velocity',
            dimensions: [textureSize, textureSize],
            type: 'FLOAT',
            filter: 'NEAREST',
            numComponents: 2,
            // Double buffer so we can use velocity as input while writing to the next buffer
            numBuffers: 2
        });
        this.ctrwStateLayer = new GPULayer(this.composer, {
            name: 'ctrwState',
            dimensions: [textureSize, textureSize],
            type: 'FLOAT',
            filter: 'NEAREST',
            numComponents: 4,
            numBuffers: 2
        });
        // Persistent temp layer for CTRW step output (velocity.xy + state.zw)
        this.ctrwTempLayer = new GPULayer(this.composer, {
            name: 'ctrwTemp',
            dimensions: [textureSize, textureSize],
            type: 'FLOAT',
            filter: 'NEAREST',
            numComponents: 4
        });
        this.positionProgram = new GPUProgram(this.composer, {
            name: 'positionUpdate',
            fragmentShader: POSITION_UPDATE_SHADER
        });
        // Initialize uniforms once: bind sampler inputs and seed u_dt
        // Map u_position -> input[0], u_velocity -> input[1]
        this.positionProgram.setUniform('u_position', 0, INT);
        this.positionProgram.setUniform('u_velocity', 1, INT);
        this.positionProgram.setUniform('u_dt', 0.0, FLOAT);
        this.positionProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
        this.positionProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
        this.positionProgram.setUniform('u_boundary_condition', boundaryConditionMap[this.boundaryCondition], INT);
        // Velocity update program (for reflective flip and absorbing zeroing)
        this.velocityProgram = new GPUProgram(this.composer, {
            name: 'velocityUpdate',
            fragmentShader: VELOCITY_UPDATE_SHADER
        });
        this.velocityProgram.setUniform('u_position', 0, INT);
        this.velocityProgram.setUniform('u_velocity', 1, INT);
        this.velocityProgram.setUniform('u_dt', 0.0, FLOAT);
        this.velocityProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
        this.velocityProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
        this.velocityProgram.setUniform('u_boundary_condition', boundaryConditionMap[this.boundaryCondition], INT);
        // CTRW program
        this.ctrwProgram = new GPUProgram(this.composer, {
            name: 'ctrw',
            fragmentShader: CTRW_SHADER
        });
        this.ctrwProgram.setUniform('u_position', 0, INT);
        this.ctrwProgram.setUniform('u_velocity', 1, INT);
        this.ctrwProgram.setUniform('u_ctrw_state', 2, INT);
        this.ctrwProgram.setUniform('u_dt', 0.0, FLOAT);
        this.ctrwProgram.setUniform('u_collision_rate', this.collisionRate, FLOAT);
        this.ctrwProgram.setUniform('u_jump_length', this.jumpLength, FLOAT);
        this.ctrwProgram.setUniform('u_current_time', 0.0, FLOAT);
        // Velocity-jump model: set speed via uniform, initialize to 0 until UI updates arrive
        this.ctrwProgram.setUniform('u_speed', 1.0, FLOAT);
        this.ctrwProgram.setUniform('u_is1D', 0, INT);
        this.ctrwProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
        this.ctrwProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
        this.ctrwProgram.setUniform('u_boundary_condition', boundaryConditionMap[this.boundaryCondition], INT);
        console.log('[GPU] GPUParticleManager initialized successfully');
        // Initialize collision manager (no-op for now)
        this.collisionManager = new GPUCollisionManager();
    }
    // Allow caller to provide a mapping from physics space -> canvas pixels
    setCanvasMapper(mapper) {
        this.canvasMapper = mapper;
    }
    initializeParticles(particles) {
        console.log('[GPU] Initializing particles', { count: particles.length });
        const textureSize = Math.ceil(Math.sqrt(this.particleCount));
        const posData = new Float32Array(textureSize * textureSize * 2);
        const velData = new Float32Array(textureSize * textureSize * 2);
        const ctrwData = new Float32Array(textureSize * textureSize * 4);
        for (let i = 0; i < particles.length; i++) {
            posData[i * 2] = particles[i].position.x;
            posData[i * 2 + 1] = particles[i].position.y;
            velData[i * 2] = particles[i].velocity.vx;
            velData[i * 2 + 1] = particles[i].velocity.vy;
            // Initialize CTRW state: collision times in future, spread over first few timesteps
            const futureDelay = Math.random() * (5.0 / this.collisionRate); // spread over ~5 mean wait times
            ctrwData[i * 4] = futureDelay; // nextCollisionTime
            ctrwData[i * 4 + 1] = Math.random(); // randomSeed
            ctrwData[i * 4 + 2] = 0; // unused
            ctrwData[i * 4 + 3] = 0; // unused
        }
        // Upload initial data to GPU layers
        this.positionLayer.setFromArray(posData);
        this.velocityLayer.setFromArray(velData);
        this.ctrwStateLayer.setFromArray(ctrwData);
        console.log('[GPU] Particles initialized to GPU textures');
    }
    debugVelocities(count = 10) {
        const velData = this.velocityLayer.getValues();
        console.log('[GPU] Velocity Data:');
        for (let i = 0; i < Math.min(count * 2, velData.length); i += 2) {
            console.log(`Particle ${i / 2}: vx=${velData[i]}, vy=${velData[i + 1]}`);
        }
        return velData;
    }
    step(dt) {
        // console.log('[GPU] Stepping physics', { dt });
        // Set scalar uniform and pass samplers via input array order
        this.positionProgram.setUniform('u_dt', dt, FLOAT);
        this.velocityProgram.setUniform('u_dt', dt, FLOAT);
        // Pass 1: CTRW velocity update (if enabled)
        if (this.useCTRW) {
            // Guard against invalid parameters causing particles to freeze
            const effectiveSpeed = this.speed * this.jumpLength;
            if (effectiveSpeed <= 0) {
                const now = performance.now();
                if (now - this.lastDebugLogTime > 1000) {
                    this.lastDebugLogTime = now;
                    console.warn('[GPU] CTRW enabled but effective speed <= 0; skipping CTRW pass');
                }
            }
            else {
                this.ctrwProgram.setUniform('u_dt', dt, FLOAT);
                this.ctrwProgram.setUniform('u_current_time', 0.0, FLOAT);
                // Single pass updates both velocity and state using persistent temp layer
                this.composer.step({
                    program: this.ctrwProgram,
                    input: [this.positionLayer, this.velocityLayer, this.ctrwStateLayer],
                    output: this.ctrwTempLayer
                });
                // Extract velocity (xy) and state (zw) - fix data extraction bug
                const tempData = this.ctrwTempLayer.getValues();
                const texSize = Math.ceil(Math.sqrt(this.particleCount));
                const velData = new Float32Array(texSize * texSize * 2);
                const stateData = new Float32Array(texSize * texSize * 4);
                // Only process actual particles to avoid zero-filling beyond particleCount
                for (let i = 0; i < this.particleCount; i++) {
                    const texIdx = i; // Direct particle index mapping
                    velData[texIdx * 2] = tempData[texIdx * 4];
                    velData[texIdx * 2 + 1] = tempData[texIdx * 4 + 1];
                    stateData[texIdx * 4] = tempData[texIdx * 4 + 2]; // nextCollisionTime
                    stateData[texIdx * 4 + 1] = tempData[texIdx * 4 + 3]; // randomSeed
                    stateData[texIdx * 4 + 2] = 0; // unused
                    stateData[texIdx * 4 + 3] = 0; // unused
                }
                // Preserve existing velocities for particles beyond particleCount
                const currentVel = this.velocityLayer.getValues();
                for (let i = this.particleCount; i < texSize * texSize; i++) {
                    velData[i * 2] = currentVel[i * 2];
                    velData[i * 2 + 1] = currentVel[i * 2 + 1];
                }
                this.velocityLayer.setFromArray(velData);
                this.ctrwStateLayer.setFromArray(stateData);
            }
        }
        // Pass 2: update positions
        this.composer.step({
            program: this.positionProgram,
            input: [this.positionLayer, this.velocityLayer],
            output: this.positionLayer
        });
        // Pass 3: boundary velocity updates
        this.composer.step({
            program: this.velocityProgram,
            input: [this.positionLayer, this.velocityLayer],
            output: this.velocityLayer
        });
        // Pass 3: Interparticle collisions (can combine with CTRW)
        if (this.interparticleCollisions) {
            try {
                const texSize = Math.ceil(Math.sqrt(this.particleCount));
                this.collisionManager.applyCollisions(this.composer, this.positionLayer, this.velocityLayer, dt, texSize, texSize, this.particleCount, 0.0);
                this.updateCollisionCount();
            }
            catch (error) {
                console.error('[GPU] Collision step failed, disabling collisions:', error);
                this.interparticleCollisions = false;
            }
        }
    }
    updateCollisionCount() {
        try {
            const collisionTimes = this.collisionManager.getCollisionTimes();
            if (!collisionTimes) {
                console.log('[GPU] No collision times available');
                return;
            }
            let currentCollisions = 0;
            const currentTime = 0.0;
            // Debug: check first few collision times
            const debugTimes = [];
            for (let i = 0; i < Math.min(5, collisionTimes.length); i++) {
                debugTimes.push(collisionTimes[i]);
            }
            const now = performance.now();
            if (now - this.lastDebugLogTime > 1000) { // Log every 1 second
                this.lastDebugLogTime = now;
                console.log('[GPU] Debug collision times:', debugTimes, 'currentTime:', currentTime);
            }
            for (let i = 0; i < Math.min(this.particleCount, collisionTimes.length); i++) {
                const lastCollisionTime = collisionTimes[i];
                if (lastCollisionTime > 0 && (currentTime - lastCollisionTime) < 0.02) {
                    currentCollisions++;
                }
            }
            if (currentCollisions > 0) {
                this.collisionCount += Math.floor(currentCollisions / 2);
                // console.log('[GPU] Collision count updated:', {
                //   currentCollisions,
                //   totalCollisionCount: this.collisionCount
                // });
            }
        }
        catch (error) {
            console.error('[GPU] Collision count update failed:', error);
        }
    }
    getParticleData() {
        return this.positionLayer.getValues();
    }
    syncToTsParticles(tsContainer) {
        const data = this.getParticleData();
        const collisionTimes = this.collisionManager.getCollisionTimes();
        syncParticlesToContainer(tsContainer, data, collisionTimes, this.particleCount, this.canvasMapper, this.bounds, 0.0, this.showCollisions);
    }
    reset() {
        console.log('[GPU] Resetting GPU state');
        this.collisionCount = 0;
        const textureSize = Math.ceil(Math.sqrt(this.particleCount));
        const emptyPosData = new Float32Array(textureSize * textureSize * 2);
        const emptyVelData = new Float32Array(textureSize * textureSize * 2);
        const emptyCtrwData = new Float32Array(textureSize * textureSize * 4);
        // Reset CTRW collision times to future
        for (let i = 0; i < textureSize * textureSize; i++) {
            const futureDelay = Math.random() * (5.0 / this.collisionRate);
            emptyCtrwData[i * 4] = futureDelay;
            emptyCtrwData[i * 4 + 1] = Math.random();
        }
        this.positionLayer.setFromArray(emptyPosData);
        this.velocityLayer.setFromArray(emptyVelData);
        this.ctrwStateLayer.setFromArray(emptyCtrwData);
    }
    updateParameters(params) {
        if (params.particleCount && params.particleCount !== this.particleCount) {
            console.log('[GPU] Particle count changed, recreation needed');
            return false; // Indicates recreation is needed
        }
        // Validate and update boundary condition
        if (params.boundaryCondition) {
            this.boundaryCondition = params.boundaryCondition;
            const conditionCode = boundaryConditionMap[this.boundaryCondition];
            if (conditionCode === undefined) {
                console.warn('[GPU] Unsupported boundary condition in GPU mode:', this.boundaryCondition, '- continuing with GPU and defaulting to periodic');
            }
            const code = conditionCode ?? 0;
            this.positionProgram.setUniform('u_boundary_condition', code, INT);
            this.velocityProgram.setUniform('u_boundary_condition', code, INT);
            this.ctrwProgram.setUniform('u_boundary_condition', code, INT);
            console.log('[GPU] Boundary condition updated:', this.boundaryCondition, '-> code:', code);
        }
        // Validate and update boundary bounds
        if (params.bounds) {
            const oldBounds = { ...this.bounds };
            this.bounds = params.bounds;
            this.positionProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
            this.positionProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
            this.velocityProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
            this.velocityProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
            this.ctrwProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
            this.ctrwProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
            console.log('[GPU] Boundary bounds updated:', {
                from: oldBounds,
                to: this.bounds,
                width: this.bounds.xMax - this.bounds.xMin,
                height: this.bounds.yMax - this.bounds.yMin
            });
        }
        // Update collision state
        if (params.interparticleCollisions !== undefined) {
            this.interparticleCollisions = params.interparticleCollisions;
            console.log('[GPU] Interparticle collisions:', this.interparticleCollisions ? 'ENABLED' : 'DISABLED');
        }
        if (typeof params.showCollisions === 'boolean') {
            this.showCollisions = params.showCollisions;
            console.log('[GPU] Show Collisions (flashes):', this.showCollisions ? 'ON' : 'OFF');
        }
        // Update CTRW parameters
        if (params.strategies && Array.isArray(params.strategies)) {
            this.useCTRW = params.strategies.includes('ctrw');
            console.log('[GPU] CTRW Strategy:', this.useCTRW ? 'ENABLED' : 'DISABLED');
        }
        if (typeof params.collisionRate === 'number') {
            this.collisionRate = params.collisionRate;
            this.ctrwProgram.setUniform('u_collision_rate', this.collisionRate, FLOAT);
        }
        if (typeof params.jumpLength === 'number') {
            this.jumpLength = params.jumpLength;
            this.ctrwProgram.setUniform('u_jump_length', this.jumpLength, FLOAT);
        }
        // Velocity for velocity-jump model
        if (typeof params.velocity === 'number') {
            this.speed = params.velocity;
            this.ctrwProgram.setUniform('u_speed', this.speed, FLOAT);
        }
        if (typeof params.dimension === 'string') {
            const is1D = params.dimension === '1D' ? 1 : 0;
            this.ctrwProgram.setUniform('u_is1D', is1D, INT);
        }
        // Allow collision manager to react to parameter changes (radius and bounds supported)
        if (params) {
            const collisionParams = {};
            if (typeof params.radius === 'number') {
                collisionParams.radius = params.radius;
            }
            if (typeof params.alpha === 'number') {
                collisionParams.alpha = params.alpha;
            }
            if (typeof params.dimension === 'string') {
                collisionParams.dimension = params.dimension;
                collisionParams.is1D = (params.dimension === '1D');
            }
            if (params.bounds) {
                collisionParams.bounds = this.bounds;
            }
            const success = this.collisionManager.updateParameters(collisionParams);
            if (!success) {
                console.warn('[GPU] Collision parameter update failed, collisions may not work correctly');
            }
        }
        console.log('[GPU] Parameters update complete:', {
            boundaryCondition: this.boundaryCondition,
            bounds: this.bounds,
            hasValidBounds: this.bounds.xMax > this.bounds.xMin && this.bounds.yMax > this.bounds.yMin
        });
        return true; // Indicates manager can be updated
    }
    getMetrics() {
        return {
            collisionCount: this.collisionCount,
            simulationTime: 0.0
        };
    }
    dispose() {
        console.log('[GPU] Disposing GPUParticleManager');
        if (this.ctrwTempLayer) {
            this.ctrwTempLayer.dispose();
            this.ctrwTempLayer = null;
        }
        this.composer.dispose();
    }
}
