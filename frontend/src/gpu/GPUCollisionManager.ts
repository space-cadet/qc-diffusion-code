import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';

// C16 Phase 2: Minimal GPU collision pass using hashed neighbor sampling (no grid)
// Notes:
// - For each particle, sample up to M candidate neighbors via deterministic hashing
// - Check actual spatial distance using positions texture; resolve at most 1 collision
// - Equal-mass collision using normal/tangent projection
// - Keeps cost ~O(1) per particle and avoids complex grid construction in WebGL2
// - This is an MVP and may miss some collisions compared to a true spatial grid
const COLLISION_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_collision_time;   // collision timestamp texture
uniform ivec2 u_texSize;              // texture dimensions (width, height)
uniform int u_particle_count;         // total logical particles
uniform float u_radius;               // per-particle radius (uniform for MVP)
uniform float u_dt;                   // timestep (may be used later for impulse limits)
uniform float u_current_time;         // current simulation time

in vec2 v_uv;
out vec4 fragColor;

// Convert 1D index to UV
vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  // center of texel
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

// Simple LCG hash based on integer index
uint lcg(inout uint state) {
  state = 1664525u * state + 1013904223u;
  return state;
}

void main() {
  // Current particle state
  vec2 p = texture(u_position, v_uv).xy;
  vec2 v = texture(u_velocity, v_uv).xy;
  float lastCollisionTime = texture(u_collision_time, v_uv).x;

  // Derive current 1D index from UV
  ivec2 texSize = u_texSize;
  ivec2 xy = ivec2(floor(v_uv * vec2(texSize)));
  int selfIdx = xy.y * texSize.x + xy.x;

  // Parameters
  float r = u_radius; // MVP: uniform radius
  float r2 = (2.0 * r) * (2.0 * r); // sum radii squared for equal radii

  // Deterministic hash seed
  uint seed = uint(selfIdx) ^ 0x9e3779b9u;

  // Try a few hashed candidates (M=2)
  const int M = 2;
  bool collided = false;
  vec2 vOut = v;
  float newCollisionTime = lastCollisionTime; // default: keep existing time

  for (int m = 0; m < M; m++) {
    if (collided) break;
    uint rnd = lcg(seed);
    // candidate index in [0, u_particle_count)
    int cand = int(rnd % uint(u_particle_count));
    if (cand == selfIdx) { continue; }
    vec2 uvCand = indexToUV(cand, texSize);
    vec2 p2 = texture(u_position, uvCand).xy;
    vec2 v2 = texture(u_velocity, uvCand).xy;

    vec2 dp = p - p2;
    float d2 = dot(dp, dp);
    if (d2 > 0.0 && d2 < r2) {
      float d = sqrt(d2);
      vec2 n = dp / d;        // unit normal
      vec2 t = vec2(-n.y, n.x); // unit tangent

      float v1n = dot(v, n);
      float v1t = dot(v, t);
      float v2n = dot(v2, n);
      float v2t = dot(v2, t);

      // Equal masses: swap normal components, keep tangential
      float v1nAfter = v2n;
      float v1tAfter = v1t;

      vOut = v1nAfter * n + v1tAfter * t;
      collided = true;
      newCollisionTime = u_current_time; // record collision time
    }
  }

  // Output format: velocity.xy in .xy channels, collision time in .z channel
  fragColor = vec4(vOut, newCollisionTime, 1.0);
}`;

const COLLISION_TIME_UPDATE_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_collision_data; // velocity + collision time from collision shader

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 collisionData = texture(u_collision_data, v_uv);
  float collisionTime = collisionData.z;
  
  // Output collision time to collision time texture
  fragColor = vec4(collisionTime, 0.0, 0.0, 1.0);
}`;

export class GPUCollisionManager {
  private collisionProgram?: GPUProgram;
  private timeUpdateProgram?: GPUProgram;
  private collisionTimeLayer?: GPULayer;
  private collisionDataLayer?: GPULayer; // temporary layer for collision results
  private texSize: [number, number] = [1, 1];
  private particleCount = 0;
  private radius = 3.0;

  constructor() {}

  initialize(composer: GPUComposer, texWidth: number, texHeight: number, particleCount: number, radius: number) {
    // Create collision time tracking layer
    this.collisionTimeLayer = new GPULayer(composer, {
      name: 'collisionTime',
      dimensions: [texWidth, texHeight],
      type: 'FLOAT',
      filter: 'NEAREST',
      numComponents: 1,
      numBuffers: 2
    });

    // Temporary layer to hold collision results (velocity + time)
    this.collisionDataLayer = new GPULayer(composer, {
      name: 'collisionData',
      dimensions: [texWidth, texHeight],
      type: 'FLOAT',
      filter: 'NEAREST',
      numComponents: 4, // vx, vy, collision_time, padding
      numBuffers: 1
    });

    // Main collision detection and response shader
    this.collisionProgram = new GPUProgram(composer, {
      name: 'collisionUpdate',
      fragmentShader: COLLISION_SHADER
    });
    this.collisionProgram.setUniform('u_position', 0, INT);
    this.collisionProgram.setUniform('u_velocity', 1, INT);
    this.collisionProgram.setUniform('u_collision_time', 2, INT);
    this.collisionProgram.setUniform('u_texSize', [texWidth, texHeight], INT);
    this.collisionProgram.setUniform('u_particle_count', particleCount, INT);
    this.collisionProgram.setUniform('u_radius', radius, FLOAT);
    this.collisionProgram.setUniform('u_dt', 0.0, FLOAT);
    this.collisionProgram.setUniform('u_current_time', 0.0, FLOAT);

    // Shader to extract collision times back to dedicated texture
    this.timeUpdateProgram = new GPUProgram(composer, {
      name: 'timeUpdate',
      fragmentShader: COLLISION_TIME_UPDATE_SHADER
    });
    this.timeUpdateProgram.setUniform('u_collision_data', 0, INT);

    this.texSize = [texWidth, texHeight];
    this.particleCount = particleCount;
    this.radius = radius;

    console.log('[GPU Collision] Initialized with collision time tracking');
  }

  updateParameters(params: { radius?: number } = {}): boolean {
    if (typeof params.radius === 'number' && Number.isFinite(params.radius)) {
      this.radius = params.radius;
      if (this.collisionProgram) {
        this.collisionProgram.setUniform('u_radius', this.radius, FLOAT);
      }
    }
    return true;
  }

  applyCollisions(
    composer: GPUComposer,
    positionLayer: GPULayer,
    velocityLayer: GPULayer,
    dt: number,
    texWidth: number,
    texHeight: number,
    particleCount: number,
    simulationTime: number
  ): void {
    if (!this.collisionProgram || !this.timeUpdateProgram || !this.collisionTimeLayer || !this.collisionDataLayer) {
      // Initialize lazily if not constructed yet using provided dimensions
      this.initialize(composer, texWidth, texHeight, particleCount, this.radius);
    }
    if (!this.collisionProgram || !this.timeUpdateProgram || !this.collisionTimeLayer || !this.collisionDataLayer) return;

    // Update per-step uniforms
    this.collisionProgram.setUniform('u_dt', dt, FLOAT);
    this.collisionProgram.setUniform('u_current_time', simulationTime, FLOAT);

    // Step 1: Apply collision detection and response, output velocity + collision time
    composer.step({
      program: this.collisionProgram,
      input: [positionLayer, velocityLayer, this.collisionTimeLayer],
      output: this.collisionDataLayer
    });

    // Step 2: Extract velocities back to velocity layer (take xy components)
    // Note: This requires a simple passthrough shader or we modify the main collision shader
    // For now, we'll extract the velocity components in the main velocity update pass
    
    // Step 3: Extract collision times back to collision time layer
    composer.step({
      program: this.timeUpdateProgram,
      input: [this.collisionDataLayer],
      output: this.collisionTimeLayer
    });

    // Step 4: Copy velocity data back to velocity layer
    // We need to extract vx, vy from collisionDataLayer back to velocityLayer
    // This is a limitation of the current approach - we need a velocity extraction pass
    this.copyVelocityData(composer, velocityLayer);
  }

  private copyVelocityData(composer: GPUComposer, velocityLayer: GPULayer): void {
    // For MVP: read collision data and manually update velocity layer
    if (!this.collisionDataLayer) return;
    
    const collisionData = this.collisionDataLayer.getValues() as Float32Array;
    const velocityData = new Float32Array(collisionData.length / 2); // vx, vy only
    
    for (let i = 0; i < velocityData.length; i += 2) {
      const srcIdx = (i / 2) * 4; // collision data has 4 components per particle
      velocityData[i] = collisionData[srcIdx];     // vx
      velocityData[i + 1] = collisionData[srcIdx + 1]; // vy
    }
    
    velocityLayer.setFromArray(velocityData);
  }

  getCollisionTimes(): Float32Array | null {
    if (!this.collisionTimeLayer) return null;
    return this.collisionTimeLayer.getValues() as Float32Array;
  }
}
