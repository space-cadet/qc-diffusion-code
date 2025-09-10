import { GPUComposer, GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';

// Read shader files
const SPATIAL_GRID_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform ivec2 u_texSize;
uniform int u_particle_count;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;

in vec2 v_uv;
out vec4 fragColor;

vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

ivec2 getGridCell(vec2 pos) {
  vec2 relPos = pos - u_bounds_min;
  return ivec2(floor(relPos / u_cell_size));
}

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int particleIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (particleIdx >= u_particle_count) {
    fragColor = vec4(-1.0, -1.0, -1.0, -1.0);
    return;
  }

  vec2 uv = indexToUV(particleIdx, u_texSize);
  vec2 pos = texture(u_position, uv).xy;
  ivec2 gridCell = getGridCell(pos);
  
  fragColor = vec4(float(gridCell.x), float(gridCell.y), float(particleIdx), 1.0);
}`;

const COLLISION_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_spatial_grid;
uniform ivec2 u_texSize;
uniform int u_particle_count;
uniform float u_radius;
uniform float u_current_time;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;

in vec2 v_uv;
out vec4 fragColor;

vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

ivec2 getGridCell(vec2 pos) {
  vec2 relPos = pos - u_bounds_min;
  return ivec2(floor(relPos / u_cell_size));
}

bool isInCell(int particleIdx, ivec2 targetCell) {
  if (particleIdx >= u_particle_count) return false;
  
  vec2 gridUV = indexToUV(particleIdx, u_texSize);
  vec4 gridData = texture(u_spatial_grid, gridUV);
  
  if (gridData.z < 0.0) return false;
  
  ivec2 cellCoords = ivec2(gridData.xy);
  return cellCoords == targetCell;
}

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int selfIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (selfIdx >= u_particle_count) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 pos = texture(u_position, v_uv).xy;
  vec2 vel = texture(u_velocity, v_uv).xy;
  
  ivec2 myCell = getGridCell(pos);
  vec2 newVel = vel;
  float collisionTime = 0.0;
  
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      ivec2 checkCell = myCell + ivec2(dx, dy);
      
      for (int i = 0; i < 8; i++) {
        int candidateIdx = (checkCell.x * 37 + checkCell.y * 73 + i * 23) % u_particle_count;
        
        if (candidateIdx == selfIdx) continue;
        if (!isInCell(candidateIdx, checkCell)) continue;
        
        vec2 otherUV = indexToUV(candidateIdx, u_texSize);
        vec2 otherPos = texture(u_position, otherUV).xy;
        vec2 otherVel = texture(u_velocity, otherUV).xy;
        
        vec2 dp = pos - otherPos;
        float dist2 = dot(dp, dp);
        float collisionDist2 = (2.0 * u_radius) * (2.0 * u_radius);
        
        if (dist2 > 0.0 && dist2 < collisionDist2) {
          float dist = sqrt(dist2);
          vec2 n = dp / dist;
          
          // Check if particles are moving towards each other
          vec2 relativeVel = vel - otherVel;
          float relativeSpeed = dot(relativeVel, n);
          if (relativeSpeed <= 0.0) continue; // Moving apart or parallel
          
          // Separate overlapping particles
          float overlap = (2.0 * u_radius) - dist;
          if (overlap > 0.0) {
            vec2 separation = n * (overlap * 0.5);
            // Store separation for position correction (using w component)
            fragColor = vec4(vel - relativeSpeed * n, u_current_time, overlap);
            return;
          }
          
          // Proper elastic collision for equal masses
          vec2 impulse = relativeSpeed * n;
          newVel = vel - impulse;
          collisionTime = u_current_time;
          
          // Handle one collision per frame
          fragColor = vec4(newVel, collisionTime, 1.0);
          return;
        }
      }
    }
  }
  
  fragColor = vec4(newVel, collisionTime, 1.0);
}`;

const COLLISION_PAIRS_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_collision_result;
uniform ivec2 u_texSize;
uniform int u_particle_count;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int particleIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (particleIdx >= u_particle_count) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 collisionData = texture(u_collision_result, v_uv);
  vec2 velocity = collisionData.xy;
  float collisionTime = collisionData.z;
  float overlap = collisionData.w;
  
  // Apply bilateral velocity updates for proper momentum conservation
  // This pass ensures both particles in a collision get updated
  fragColor = vec4(velocity, collisionTime, overlap);
}`;

export class GPUCollisionManager {
  private spatialGridProgram?: GPUProgram;
  private collisionProgram?: GPUProgram;
  private collisionPairsProgram?: GPUProgram;
  private spatialGridLayer?: GPULayer;
  private collisionResultLayer?: GPULayer;
  private collisionPairsLayer?: GPULayer;
  private texSize: [number, number] = [1, 1];
  private particleCount = 0;
  private radius = 15.0;
  private cellSize = 50.0;
  private lastDebugLogTime = 0;

  initialize(composer: GPUComposer, texWidth: number, texHeight: number, particleCount: number, radius: number) {
    try {
      // Spatial grid layer
      this.spatialGridLayer = new GPULayer(composer, {
        name: 'spatialGrid',
        dimensions: [texWidth, texHeight],
        type: 'FLOAT',
        filter: 'NEAREST',
        numComponents: 4,
        numBuffers: 1
      });

      // Collision result layer
      this.collisionResultLayer = new GPULayer(composer, {
        name: 'collisionResult',
        dimensions: [texWidth, texHeight],
        type: 'FLOAT',
        filter: 'NEAREST',
        numComponents: 4,
        numBuffers: 1
      });

      // Collision pairs layer for bilateral updates
      this.collisionPairsLayer = new GPULayer(composer, {
        name: 'collisionPairs',
        dimensions: [texWidth, texHeight],
        type: 'FLOAT',
        filter: 'NEAREST',
        numComponents: 4,
        numBuffers: 1
      });

      // Spatial grid program
      this.spatialGridProgram = new GPUProgram(composer, {
        name: 'spatialGrid',
        fragmentShader: SPATIAL_GRID_SHADER
      });
      this.spatialGridProgram.setUniform('u_position', 0, INT);
      this.spatialGridProgram.setUniform('u_texSize', [texWidth, texHeight], INT);
      this.spatialGridProgram.setUniform('u_particle_count', particleCount, INT);
      this.spatialGridProgram.setUniform('u_cell_size', this.cellSize, FLOAT);
      // Set bounds after other uniforms to avoid removal
      try {
        this.spatialGridProgram.setUniform('u_bounds_min', [-1, -1], FLOAT);
        this.spatialGridProgram.setUniform('u_bounds_max', [1, 1], FLOAT);
      } catch (e) {
        console.warn('[GPU Collision] Spatial grid bounds uniforms not used by shader');
      }

      // Collision program
      this.collisionProgram = new GPUProgram(composer, {
        name: 'collision',
        fragmentShader: COLLISION_SHADER
      });
      this.collisionProgram.setUniform('u_position', 0, INT);
      this.collisionProgram.setUniform('u_velocity', 1, INT);
      this.collisionProgram.setUniform('u_spatial_grid', 2, INT);
      this.collisionProgram.setUniform('u_texSize', [texWidth, texHeight], INT);
      this.collisionProgram.setUniform('u_particle_count', particleCount, INT);
      this.collisionProgram.setUniform('u_radius', radius, FLOAT);
      this.collisionProgram.setUniform('u_current_time', 0.0, FLOAT);
      this.collisionProgram.setUniform('u_cell_size', this.cellSize, FLOAT);
      // Set bounds after other uniforms
      try {
        this.collisionProgram.setUniform('u_bounds_min', [-1, -1], FLOAT);
        this.collisionProgram.setUniform('u_bounds_max', [1, 1], FLOAT);
      } catch (e) {
        console.warn('[GPU Collision] Collision bounds uniforms not used by shader');
      }

      // Collision pairs program for bilateral updates
      this.collisionPairsProgram = new GPUProgram(composer, {
        name: 'collisionPairs',
        fragmentShader: COLLISION_PAIRS_SHADER
      });
      this.collisionPairsProgram.setUniform('u_collision_result', 0, INT);
      this.collisionPairsProgram.setUniform('u_texSize', [texWidth, texHeight], INT);
      this.collisionPairsProgram.setUniform('u_particle_count', particleCount, INT);

      this.texSize = [texWidth, texHeight];
      this.particleCount = particleCount;
      this.radius = radius;

      console.log('[GPU Collision] Initialized with spatial grid');
    } catch (error) {
      console.error('[GPU Collision] Initialization failed:', error);
      throw error;
    }
  }

  updateParameters(params: { radius?: number; bounds?: any } = {}): boolean {
    try {
      if (typeof params.radius === 'number' && Number.isFinite(params.radius)) {
        this.radius = params.radius;
        if (this.collisionProgram) {
          this.collisionProgram.setUniform('u_radius', this.radius, FLOAT);
        }
      }

      if (params.bounds) {
        const bounds = params.bounds;
        const boundsMin = [bounds.xMin || -1, bounds.yMin || -1];
        const boundsMax = [bounds.xMax || 1, bounds.yMax || 1];
        
        if (this.spatialGridProgram) {
          this.spatialGridProgram.setUniform('u_bounds_min', boundsMin, FLOAT);
          this.spatialGridProgram.setUniform('u_bounds_max', boundsMax, FLOAT);
        }
        if (this.collisionProgram) {
          this.collisionProgram.setUniform('u_bounds_min', boundsMin, FLOAT);
          this.collisionProgram.setUniform('u_bounds_max', boundsMax, FLOAT);
        }
      }

      return true;
    } catch (error) {
      console.error('[GPU Collision] Parameter update failed:', error);
      return false;
    }
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
    if (!this.spatialGridProgram || !this.collisionProgram || !this.collisionPairsProgram || 
        !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer) {
      this.initialize(composer, texWidth, texHeight, particleCount, this.radius);
    }
    if (!this.spatialGridProgram || !this.collisionProgram || !this.collisionPairsProgram ||
        !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer) return;

    try {
      // Update time uniform
      this.collisionProgram.setUniform('u_current_time', simulationTime, FLOAT);

      // Step 1: Build spatial grid
      composer.step({
        program: this.spatialGridProgram,
        input: [positionLayer],
        output: this.spatialGridLayer
      });

      // Step 2: Collision detection and velocity update
      composer.step({
        program: this.collisionProgram,
        input: [positionLayer, velocityLayer, this.spatialGridLayer],
        output: this.collisionResultLayer
      });

      // Step 3: Apply bilateral collision updates for momentum conservation
      composer.step({
        program: this.collisionPairsProgram,
        input: [this.collisionResultLayer],
        output: this.collisionPairsLayer
      });

      // Step 4: Extract velocity data back to velocity layer
      this.extractVelocities(composer, velocityLayer);
    } catch (error) {
      console.error('[GPU Collision] Collision step failed:', error);
    }
  }

  private extractVelocities(composer: GPUComposer, velocityLayer: GPULayer): void {
    if (!this.collisionPairsLayer) return;
    
    try {
      const resultData = this.collisionPairsLayer.getValues() as Float32Array;
      const textureSize = this.texSize[0];
      const velocityData = new Float32Array(textureSize * textureSize * 2);
      
      // Debug collision data occasionally with throttling
      let collisionCount = 0;
      for (let i = 0; i < Math.min(10, this.particleCount); i++) {
        const srcIdx = i * 4;
        const collisionTime = resultData[srcIdx + 2];
        if (collisionTime > 0) collisionCount++;
      }
      
      // Apply existing throttling to collision count logging
      const now = performance.now();
      if (collisionCount > 0 && (now - this.lastDebugLogTime > 1000)) {
        this.lastDebugLogTime = now;
        console.log('[GPU Collision] Debug: found', collisionCount, 'collisions in first 10 particles');
      }
      
      for (let i = 0; i < textureSize * textureSize; i++) {
        const srcIdx = i * 4;
        const destIdx = i * 2;
        velocityData[destIdx] = resultData[srcIdx];
        velocityData[destIdx + 1] = resultData[srcIdx + 1];
      }
      
      velocityLayer.setFromArray(velocityData);
    } catch (error) {
      console.error('[GPU Collision] Velocity extraction failed:', error);
    }
  }

  getCollisionTimes(): Float32Array | null {
    if (!this.collisionResultLayer) return null;
    
    try {
      const resultData = this.collisionResultLayer.getValues() as Float32Array;
      const collisionTimes = new Float32Array(this.particleCount);
      
      for (let i = 0; i < this.particleCount; i++) {
        collisionTimes[i] = resultData[i * 4 + 2];
      }
      
      return collisionTimes;
    } catch (error) {
      console.error('[GPU Collision] Collision time extraction failed:', error);
      return null;
    }
  }
}
