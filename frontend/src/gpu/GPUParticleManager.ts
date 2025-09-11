import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';
import { GPUCollisionManager } from './GPUCollisionManager';
import POSITION_UPDATE_SHADER from './shaders/positionUpdate.glsl?raw';
import VELOCITY_UPDATE_SHADER from './shaders/velocityUpdate.glsl?raw';
import { hexToHsl } from './lib/ColorUtils';
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
  private composer: GPUComposer;
  private positionLayer: GPULayer;
  private velocityLayer: GPULayer;
  private positionProgram: GPUProgram;
  private velocityProgram: GPUProgram;
  private particleCount: number;
  private canvasMapper?: (pos: { x: number; y: number }) => { x: number; y: number };
  private collisionCount: number = 0;
  private simulationTime: number = 0;
  private boundaryCondition: string = 'periodic';
  private bounds = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };
  private collisionManager: GPUCollisionManager;
  private interparticleCollisions: boolean = false;
  private lastCollisionLogTime: number = 0;
  private lastDebugLogTime: number = 0;
  private showCollisions: boolean = true;

  constructor(canvas: HTMLCanvasElement, particleCount: number) {
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
    const contextAttributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      desynchronized: true as any // not in all TS defs but widely supported
    };

    const gl = (offscreenCanvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext | null)
           || (offscreenCanvas.getContext('webgl', contextAttributes) as WebGLRenderingContext | null);

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
    } catch (err) {
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
    
    console.log('[GPU] GPUParticleManager initialized successfully');

    // Initialize collision manager (no-op for now)
    this.collisionManager = new GPUCollisionManager();
  }

  // Allow caller to provide a mapping from physics space -> canvas pixels
  setCanvasMapper(mapper: (pos: { x: number; y: number }) => { x: number; y: number }) {
    this.canvasMapper = mapper;
  }

  initializeParticles(particles: Array<{position: {x: number, y: number}, velocity: {vx: number, vy: number}}>) {
    console.log('[GPU] Initializing particles', { count: particles.length });
    
    const textureSize = Math.ceil(Math.sqrt(this.particleCount));
    const posData = new Float32Array(textureSize * textureSize * 2);
    const velData = new Float32Array(textureSize * textureSize * 2);
    
    for (let i = 0; i < particles.length; i++) {
      posData[i * 2] = particles[i].position.x;
      posData[i * 2 + 1] = particles[i].position.y;
      velData[i * 2] = particles[i].velocity.vx;
      velData[i * 2 + 1] = particles[i].velocity.vy;
    }
    
    // Upload initial data to GPU layers
    this.positionLayer.setFromArray(posData);
    this.velocityLayer.setFromArray(velData);
    
    console.log('[GPU] Particles initialized to GPU textures');
  }

  debugVelocities(count = 10) {
    const velData = this.velocityLayer.getValues();
    console.log('[GPU] Velocity Data:');
    for (let i = 0; i < Math.min(count*2, velData.length); i += 2) {
      console.log(`Particle ${i/2}: vx=${velData[i]}, vy=${velData[i+1]}`);
    }
    return velData;
  }

  step(dt: number) {
    // console.log('[GPU] Stepping physics', { dt });
    this.simulationTime += dt;
    
    // Set scalar uniform and pass samplers via input array order
    // gpu-io requires the uniform type on first set; use FLOAT for GLSL float
    this.positionProgram.setUniform('u_dt', dt, FLOAT);
    this.velocityProgram.setUniform('u_dt', dt, FLOAT);
    // Pass 1: update positions (handles wrap/reflect clamp/absorbing mark)
    this.composer.step({
      program: this.positionProgram,
      input: [this.positionLayer, this.velocityLayer],
      output: this.positionLayer
    });
    // Pass 2: update velocities (reflect flip, absorbing zero)
    this.composer.step({
      program: this.velocityProgram,
      input: [this.positionLayer, this.velocityLayer],
      output: this.velocityLayer
    });

    // Pass 3: collision detection only if enabled (match CPU behavior)
    if (this.interparticleCollisions) {
      try {
        const texSize = Math.ceil(Math.sqrt(this.particleCount));
        // console.log('[GPU] Running collision detection step', { 
        //   texSize, 
        //   particleCount: this.particleCount, 
        //   simulationTime: this.simulationTime 
        // });
        this.collisionManager.applyCollisions(
          this.composer,
          this.positionLayer,
          this.velocityLayer,
          dt,
          texSize,
          texSize,
          this.particleCount,
          this.simulationTime
        );
        this.updateCollisionCount();
      } catch (error) {
        console.error('[GPU] Collision step failed, disabling collisions:', error);
        this.interparticleCollisions = false;
      }
    }
  }

  private updateCollisionCount(): void {
    try {
      const collisionTimes = this.collisionManager.getCollisionTimes();
      if (!collisionTimes) {
        console.log('[GPU] No collision times available');
        return;
      }

      let currentCollisions = 0;
      const currentTime = this.simulationTime;
      
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
    } catch (error) {
      console.error('[GPU] Collision count update failed:', error);
    }
  }

  getParticleData(): Float32Array {
    return this.positionLayer.getValues() as Float32Array;
  }

  syncToTsParticles(tsContainer: any) {
    const data = this.getParticleData();
    const collisionTimes = this.collisionManager.getCollisionTimes();
    syncParticlesToContainer(
      tsContainer,
      data,
      collisionTimes,
      this.particleCount,
      this.canvasMapper,
      this.bounds,
      this.simulationTime,
      this.showCollisions
    );
  }

  reset() {
    console.log('[GPU] Resetting GPU state');
    this.collisionCount = 0;
    this.simulationTime = 0;
    const textureSize = Math.ceil(Math.sqrt(this.particleCount));
    const emptyData = new Float32Array(textureSize * textureSize * 2);
    this.positionLayer.setFromArray(emptyData);
    this.velocityLayer.setFromArray(emptyData);
  }

  updateParameters(params: any) {
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

    // Allow collision manager to react to parameter changes (radius and bounds supported)
    if (params) {
      const collisionParams: any = {};
      if (typeof params.radius === 'number') {
        collisionParams.radius = params.radius;
      }
      if (typeof (params as any).alpha === 'number') {
        collisionParams.alpha = (params as any).alpha;
      }
      if (typeof (params as any).dimension === 'string') {
        collisionParams.dimension = (params as any).dimension;
        collisionParams.is1D = ((params as any).dimension === '1D');
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
      simulationTime: this.simulationTime
    };
  }

  dispose() {
    console.log('[GPU] Disposing GPUParticleManager');
    this.composer.dispose();
  }
}
