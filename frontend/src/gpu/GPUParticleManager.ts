import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';

const POSITION_UPDATE_SHADER = `#version 300 es
precision highp float;

uniform float u_dt;
uniform sampler2D u_position;
uniform sampler2D u_velocity;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 position = texture(u_position, v_uv).xy;
  vec2 velocity = texture(u_velocity, v_uv).xy;
  
  vec2 newPosition = position + velocity * u_dt;
  
  fragColor = vec4(newPosition, 0.0, 1.0);
}`;

export class GPUParticleManager {
  private composer: GPUComposer;
  private positionLayer: GPULayer;
  private velocityLayer: GPULayer;
  private positionProgram: GPUProgram;
  private particleCount: number;

  constructor(canvas: HTMLCanvasElement, particleCount: number) {
    console.log('[GPU] Initializing GPUParticleManager', { particleCount });

    // Store particle count early
    this.particleCount = particleCount;

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
    
    console.log('[GPU] GPUParticleManager initialized successfully');
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
    const data = this.getParticleData();
    const particles = tsContainer.particles;
    const syncCount = Math.min(particles.length, this.particleCount);
    
    // console.log('[GPU] Syncing to tsParticles', { 
    //   gpuParticles: this.particleCount, 
    //   tsParticles: particles.length,
    //   syncing: syncCount
    // });
    
    for (let i = 0; i < syncCount; i++) {
      particles[i].position.x = data[i * 2];
      particles[i].position.y = data[i * 2 + 1];
    }
  }

  dispose() {
    console.log('[GPU] Disposing GPUParticleManager');
    this.composer.dispose();
  }
}
