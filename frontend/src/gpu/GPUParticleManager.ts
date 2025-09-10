import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';

const POSITION_UPDATE_SHADER = `#version 300 es
precision highp float;

uniform float u_dt;
uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform int u_boundary_condition; // 0: periodic, 1: reflective

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 position = texture(u_position, v_uv).xy;
  vec2 velocity = texture(u_velocity, v_uv).xy;
  
  vec2 newPosition = position + velocity * u_dt;

  // Boundary Conditions
  if (u_boundary_condition == 0) { // Periodic
    if (newPosition.x < u_bounds_min.x) { newPosition.x += (u_bounds_max.x - u_bounds_min.x); }
    if (newPosition.x > u_bounds_max.x) { newPosition.x -= (u_bounds_max.x - u_bounds_min.x); }
    if (newPosition.y < u_bounds_min.y) { newPosition.y += (u_bounds_max.y - u_bounds_min.y); }
    if (newPosition.y > u_bounds_max.y) { newPosition.y -= (u_bounds_max.y - u_bounds_min.y); }
  } else if (u_boundary_condition == 1) { // Reflective
    // This is a temporary implementation. Proper reflection requires flipping velocity,
    // which should be handled in a separate velocity-update shader pass.
    // For now, we clamp the position to keep particles within bounds.
    newPosition.x = clamp(newPosition.x, u_bounds_min.x, u_bounds_max.x);
    newPosition.y = clamp(newPosition.y, u_bounds_min.y, u_bounds_max.y);
  }
  
  fragColor = vec4(newPosition, 0.0, 1.0);
}`;

const boundaryConditionMap: { [key: string]: number } = {
  'periodic': 0,
  'reflective': 1,
};

export class GPUParticleManager {
  private composer: GPUComposer;
  private positionLayer: GPULayer;
  private velocityLayer: GPULayer;
  private positionProgram: GPUProgram;
  private particleCount: number;
  private canvasMapper?: (pos: { x: number; y: number }) => { x: number; y: number };
  private collisionCount: number = 0;
  private simulationTime: number = 0;
  private boundaryCondition: string = 'periodic';
  private bounds = { xMin: -1, xMax: 1, yMin: -1, yMax: 1 };

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
      numComponents: 2
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
    
    console.log('[GPU] GPUParticleManager initialized successfully');
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
    this.composer.step({
      program: this.positionProgram,
      input: [this.positionLayer, this.velocityLayer],
      output: this.positionLayer
    });
  }

  getParticleData(): Float32Array {
    return this.positionLayer.getValues() as Float32Array;
  }

  syncToTsParticles(tsContainer: any) {
    if (!tsContainer || typeof tsContainer !== 'object') {
      console.error('[GPU] Invalid tsParticles container:', tsContainer);
      return;
    }

    const particlesContainer: any = (tsContainer as any).particles;
    if (!particlesContainer) {
      console.error('[GPU] No particles container on tsParticles');
      return;
    }

    // Determine count using public API; fall back to internal array length if needed
    const tsCount: number = Number(
      particlesContainer?.count ?? (particlesContainer?._array?.length ?? 0)
    );
    if (!Number.isFinite(tsCount) || tsCount <= 0) {
      // Throttled warning
      (this as any)._syncWarnCounter = ((this as any)._syncWarnCounter ?? 0) + 1;
      if ((this as any)._syncWarnCounter % 60 === 0) {
        console.warn('[GPU] Skipping sync - container has no particles yet');
      }
      return;
    }

    const data = this.getParticleData();
    const syncCount = Math.min(tsCount, this.particleCount);

    // Throttled diagnostic
    (this as any)._syncLogCounter = ((this as any)._syncLogCounter ?? 0) + 1;
    if ((this as any)._syncLogCounter % 120 === 0) {
      console.log('[GPU] Syncing to tsParticles', {
        gpuParticles: this.particleCount,
        tsParticles: tsCount,
        syncing: syncCount,
      });
    }

    // Sync positions
    for (let i = 0; i < syncCount; i++) {
      const tsParticle = particlesContainer.get ? particlesContainer.get(i) : particlesContainer?._array?.[i];
      if (!tsParticle) continue;

      // Physics positions from GPU textures
      const px = data[i * 2];
      const py = data[i * 2 + 1];

      if (this.canvasMapper) {
        const mapped = this.canvasMapper({ x: px, y: py });
        // Clamp to canvas bounds defensively if available
        const w = tsContainer?.canvas?.size?.width ?? undefined;
        const h = tsContainer?.canvas?.size?.height ?? undefined;
        const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
        tsParticle.position.x = (w && Number.isFinite(mapped.x)) ? clamp(mapped.x, 0, w) : mapped.x ?? 0;
        tsParticle.position.y = (h && Number.isFinite(mapped.y)) ? clamp(mapped.y, 0, h) : mapped.y ?? 0;
      } else {
        // Fallback: write raw physics values
        tsParticle.position.x = px;
        tsParticle.position.y = py;
      }
    }

    // Verify sync for first particle occasionally
    if ((this as any)._syncLogCounter % 240 === 0) {
      const ts0 = particlesContainer.get ? particlesContainer.get(0) : particlesContainer?._array?.[0];
      if (ts0) {
        console.log('[GPU] Sample p0 after sync', { x: ts0.position.x, y: ts0.position.y, gpuX: data[0], gpuY: data[1], mapped: !!this.canvasMapper });
      }
    }
  }

  reset() {
    console.log('[GPU] Resetting GPU state');
    // This should also reset simulationTime and collisionCount if they are added back
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
      const conditionCode = boundaryConditionMap[this.boundaryCondition] ?? 0;
      this.positionProgram.setUniform('u_boundary_condition', conditionCode, INT);
      console.log('[GPU] Boundary condition updated:', this.boundaryCondition, '-> code:', conditionCode);
    }
    
    // Validate and update boundary bounds
    if (params.bounds) {
      const oldBounds = { ...this.bounds };
      this.bounds = params.bounds;
      this.positionProgram.setUniform('u_bounds_min', [this.bounds.xMin, this.bounds.yMin], FLOAT);
      this.positionProgram.setUniform('u_bounds_max', [this.bounds.xMax, this.bounds.yMax], FLOAT);
      console.log('[GPU] Boundary bounds updated:', { 
        from: oldBounds, 
        to: this.bounds,
        width: this.bounds.xMax - this.bounds.xMin,
        height: this.bounds.yMax - this.bounds.yMin
      });
    }

    console.log('[GPU] Parameters update complete:', {
      boundaryCondition: this.boundaryCondition,
      bounds: this.bounds,
      hasValidBounds: this.bounds.xMax > this.bounds.xMin && this.bounds.yMax > this.bounds.yMin
    });

    return true; // Indicates manager can be updated
  }

  getMetrics() {
    // Placeholder for metrics like collision count
    return {
      collisionCount: 0, // This is a placeholder, collision detection is not implemented on GPU yet
      simulationTime: this.simulationTime
    };
  }

  dispose() {
    console.log('[GPU] Disposing GPUParticleManager');
    this.composer.dispose();
  }
}
