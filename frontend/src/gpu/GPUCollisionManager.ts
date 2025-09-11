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

// Clamp a grid cell to simulation bounds (explicit int casts for GLES)
ivec2 clampCell(ivec2 cell) {
  vec2 gridSizeF = (u_bounds_max - u_bounds_min) / u_cell_size;
  int gx = int(max(1.0, floor(gridSizeF.x)));
  int gy = int(max(1.0, floor(gridSizeF.y)));
  ivec2 gridSize = ivec2(gx, gy);
  ivec2 minC = ivec2(0, 0);
  ivec2 maxC = gridSize - ivec2(1, 1);
  return ivec2(clamp(cell.x, minC.x, maxC.x), clamp(cell.y, minC.y, maxC.y));
}

// Clamp a grid cell to simulation bounds (explicit int casts for GLES)
ivec2 clampCell(ivec2 cell) {
  vec2 gridSizeF = (u_bounds_max - u_bounds_min) / u_cell_size;
  int gx = int(max(1.0, floor(gridSizeF.x)));
  int gy = int(max(1.0, floor(gridSizeF.y)));
  ivec2 gridSize = ivec2(gx, gy);
  ivec2 minC = ivec2(0, 0);
  ivec2 maxC = gridSize - ivec2(1, 1);
  return ivec2(clamp(cell.x, minC.x, maxC.x), clamp(cell.y, minC.y, maxC.y));
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
  ivec2 gridCell = clampCell(getGridCell(pos));
  
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
      ivec2 checkCell = clampCell(myCell + ivec2(dx, dy));
      
      for (int i = 0; i < 8; i++) {
        int raw = checkCell.x * 37 + checkCell.y * 73 + i * 23;
        int candidateIdx = int(mod(abs(float(raw)), float(u_particle_count)));
        
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
          if (relativeSpeed >= 0.0) continue; // Non-approaching or parallel
          
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
  private composer?: GPUComposer;
  private spatialGridProgram?: GPUProgram;
  private collisionProgram?: GPUProgram;
  private collisionPairsProgram?: GPUProgram;
  private spatialGridLayer?: GPULayer;
  private collisionResultLayer?: GPULayer;
  private collisionPairsLayer?: GPULayer;
  private cellOffsetsLayer?: GPULayer; // 1-channel texture holding prefix sums (size: gridCells+1)
  private particleIndicesLayer?: GPULayer; // 1-channel texture holding compacted particle ids (size: particleCount)
  private texSize: [number, number] = [1, 1];
  private particleCount = 0;
  private radius = 15.0;
  private cellSize = 50.0;
  private gridSize: { width: number; height: number } = { width: 1, height: 1 };
  private alpha = 1.0; // collision threshold scaling
  private is1D = false; // dimension flag for 1D collisions
  private lastDebugLogTime = 0;
  private offsetsTexSide = 1;
  private indicesTexSide = 1;
  private boundsMin: [number, number] = [-1, -1];
  private boundsMax: [number, number] = [1, 1];

  initialize(composer: GPUComposer, texWidth: number, texHeight: number, particleCount: number, radius: number) {
    try {
      this.composer = composer;
      // Spatial grid layer (kept for debug; main path uses CPU-built neighbor buffers)
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

      // Initialize grid and neighbor buffers based on bounds and cell size
      this.updateGridSize([-1, -1], [1, 1]);
      this.offsetsTexSide = Math.max(1, Math.ceil(Math.sqrt(this.gridSize.width * this.gridSize.height + 1)));
      this.indicesTexSide = Math.max(1, Math.ceil(Math.sqrt(particleCount)));

      // Create cellOffsets and particleIndices textures (1 component each)
      this.cellOffsetsLayer = new GPULayer(composer, {
        name: 'cellOffsets',
        dimensions: [this.offsetsTexSide, this.offsetsTexSide],
        type: 'FLOAT',
        filter: 'NEAREST',
        numComponents: 1,
        numBuffers: 1
      });
      this.particleIndicesLayer = new GPULayer(composer, {
        name: 'particleIndices',
        dimensions: [this.indicesTexSide, this.indicesTexSide],
        type: 'FLOAT',
        filter: 'NEAREST',
        numComponents: 1,
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
        fragmentShader: `#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_cell_offsets;     // 1-channel tex (prefix sums), length = gridCells+1
uniform sampler2D u_particle_indices; // 1-channel tex (particle ids), length = particleCount
uniform ivec2 u_texSize;              // state texture size (position/velocity)
uniform ivec2 u_offsetsTexSize;       // cellOffsets texture dims
uniform ivec2 u_indicesTexSize;       // particleIndices texture dims
uniform ivec2 u_gridSize;             // grid width/height
uniform int u_particle_count;
uniform float u_radius;
uniform float u_alpha;
uniform float u_current_time;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;
uniform int u_is1D; // 1 when using 1D collisions (grid height = 1)

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

ivec2 clampCell(ivec2 cell) {
  vec2 gridSizeF = (u_bounds_max - u_bounds_min) / u_cell_size;
  int gx = int(max(1.0, floor(gridSizeF.x)));
  int gy = int(max(1.0, floor(gridSizeF.y)));
  ivec2 gridSize = ivec2(gx, gy);
  ivec2 minC = ivec2(0, 0);
  ivec2 maxC = gridSize - ivec2(1, 1);
  return ivec2(clamp(cell.x, minC.x, maxC.x), clamp(cell.y, minC.y, maxC.y));
}

// Read a 1D float from a packed 2D texture (single-channel)
float tex1D(sampler2D tex, int index, ivec2 texSize) {
  vec2 uv = indexToUV(index, texSize);
  return texture(tex, uv).x;
}

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int selfIdx = texCoords.y * u_texSize.x + texCoords.x;
  if (selfIdx >= u_particle_count) { fragColor = vec4(0.0); return; }

  vec2 pos = texture(u_position, v_uv).xy;
  vec2 vel = texture(u_velocity, v_uv).xy;

  ivec2 myCell = clampCell(getGridCell(pos));
  vec2 newVel = vel;
  float collisionTime = 0.0;

  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      if (u_is1D == 1 && dy != 0) continue; // 1D: only sweep along x
      ivec2 c = clampCell(myCell + ivec2(dx, dy));
      int cellId = c.x + c.y * u_gridSize.x;
      int start = int(tex1D(u_cell_offsets, cellId, u_offsetsTexSize));
      int end   = int(tex1D(u_cell_offsets, cellId + 1, u_offsetsTexSize));

      for (int j = start; j < end; j++) {
        int candidateIdx = int(tex1D(u_particle_indices, j, u_indicesTexSize));
        if (candidateIdx == selfIdx) continue;
        if (candidateIdx < 0 || candidateIdx >= u_particle_count) continue;

        vec2 otherUV = indexToUV(candidateIdx, u_texSize);
        vec2 otherPos = texture(u_position, otherUV).xy;
        vec2 otherVel = texture(u_velocity, otherUV).xy;

        vec2 dp = pos - otherPos;
        float dist2 = dot(dp, dp);
        float thresh = 2.0 * u_radius * u_alpha;
        float collisionDist2 = thresh * thresh;
        if (dist2 > 0.0 && dist2 < collisionDist2) {
          float dist = sqrt(dist2);
          vec2 n = dp / dist;
          vec2 vrel = vel - otherVel;
          float rel = dot(vrel, n);
          if (rel >= 0.0) continue; // not approaching

          // overlap correction path (store time+overlap)
          float overlap = (2.0 * u_radius) - dist;
          if (overlap > 0.0) {
            fragColor = vec4(vel - rel * n, u_current_time, overlap);
            return;
          }

          vec2 impulse = rel * n;
          newVel = vel - impulse;
          collisionTime = u_current_time;
          fragColor = vec4(newVel, collisionTime, 1.0);
          return; // one collision per frame
        }
      }
    }
  }

  fragColor = vec4(newVel, collisionTime, 1.0);
}`
      });
      this.collisionProgram.setUniform('u_position', 0, INT);
      this.collisionProgram.setUniform('u_velocity', 1, INT);
      // Bind new neighbor buffers
      this.collisionProgram.setUniform('u_cell_offsets', 2, INT);
      this.collisionProgram.setUniform('u_particle_indices', 3, INT);
      this.collisionProgram.setUniform('u_texSize', [texWidth, texHeight], INT);
      this.collisionProgram.setUniform('u_offsetsTexSize', [this.offsetsTexSide, this.offsetsTexSide], INT);
      this.collisionProgram.setUniform('u_indicesTexSize', [this.indicesTexSide, this.indicesTexSide], INT);
      this.collisionProgram.setUniform('u_gridSize', [this.gridSize.width, this.gridSize.height], INT);
      this.collisionProgram.setUniform('u_particle_count', particleCount, INT);
      this.collisionProgram.setUniform('u_radius', radius, FLOAT);
      this.collisionProgram.setUniform('u_alpha', this.alpha, FLOAT);
      this.collisionProgram.setUniform('u_current_time', 0.0, FLOAT);
      this.collisionProgram.setUniform('u_cell_size', this.cellSize, FLOAT);
      this.collisionProgram.setUniform('u_is1D', 0, INT);
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

  updateParameters(params: { radius?: number; bounds?: any; alpha?: number; is1D?: boolean; dimension?: '1D' | '2D' } = {}): boolean {
    try {
      if (typeof params.radius === 'number' && Number.isFinite(params.radius)) {
        this.radius = params.radius;
        if (this.collisionProgram) {
          this.collisionProgram.setUniform('u_radius', this.radius, FLOAT);
        }
      }

      if (typeof params.alpha === 'number' && Number.isFinite(params.alpha)) {
        const a = Math.max(0, Math.min(10, params.alpha));
        this.alpha = a;
        if (this.collisionProgram) {
          this.collisionProgram.setUniform('u_alpha', this.alpha, FLOAT);
        }
      }

      if (params.bounds) {
        const bounds = params.bounds;
        const boundsMin: [number, number] = [bounds.xMin || -1, bounds.yMin || -1];
        const boundsMax: [number, number] = [bounds.xMax || 1, bounds.yMax || 1];
        this.boundsMin = boundsMin;
        this.boundsMax = boundsMax;
        
        if (this.spatialGridProgram) {
          this.spatialGridProgram.setUniform('u_bounds_min', boundsMin, FLOAT);
          this.spatialGridProgram.setUniform('u_bounds_max', boundsMax, FLOAT);
        }
        if (this.collisionProgram) {
          this.collisionProgram.setUniform('u_bounds_min', boundsMin, FLOAT);
          this.collisionProgram.setUniform('u_bounds_max', boundsMax, FLOAT);
        }

        // Optionally update grid sizing for neighbor buffers
        const oldGrid = { ...this.gridSize };
        this.updateGridSize(boundsMin, boundsMax);
        const newOffsetsSide = Math.max(1, Math.ceil(Math.sqrt(this.gridSize.width * this.gridSize.height + 1)));
        if (newOffsetsSide !== this.offsetsTexSide && this.cellOffsetsLayer) {
          this.offsetsTexSide = newOffsetsSide;
          this.cellOffsetsLayer = new GPULayer((this as any).composer, {
            name: 'cellOffsets',
            dimensions: [this.offsetsTexSide, this.offsetsTexSide],
            type: 'FLOAT', filter: 'NEAREST', numComponents: 1, numBuffers: 1
          });
          if (this.collisionProgram) {
            this.collisionProgram.setUniform('u_offsetsTexSize', [this.offsetsTexSide, this.offsetsTexSide], INT);
            this.collisionProgram.setUniform('u_gridSize', [this.gridSize.width, this.gridSize.height], INT);
          }
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
        !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer ||
        !this.cellOffsetsLayer || !this.particleIndicesLayer) {
      this.initialize(composer, texWidth, texHeight, particleCount, this.radius);
    }
    if (!this.spatialGridProgram || !this.collisionProgram || !this.collisionPairsProgram ||
        !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer ||
        !this.cellOffsetsLayer || !this.particleIndicesLayer) return;

    try {
      // Update time uniform
      this.collisionProgram.setUniform('u_current_time', simulationTime, FLOAT);

      // Step 1: Build CPU neighbor buffers (cellOffsets, particleIndices)
      this.buildAndUploadNeighborBuffers(positionLayer);

      // Step 2: Collision detection and velocity update
      composer.step({
        program: this.collisionProgram,
        input: [positionLayer, velocityLayer, this.cellOffsetsLayer, this.particleIndicesLayer],
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

  // Compute grid dimensions from bounds and cell size
  private updateGridSize(boundsMin: [number, number], boundsMax: [number, number]) {
    const width = Math.max(1, Math.floor((boundsMax[0] - boundsMin[0]) / this.cellSize));
    const baseHeight = Math.max(1, Math.floor((boundsMax[1] - boundsMin[1]) / this.cellSize));
    const height = this.is1D ? 1 : baseHeight;
    this.gridSize = { width, height };
  }

  // Build per-cell neighbor lists on CPU and upload into textures
  private buildAndUploadNeighborBuffers(positionLayer: GPULayer) {
    if (!this.cellOffsetsLayer || !this.particleIndicesLayer) return;
    const texSide = this.texSize[0];
    const posData = positionLayer.getValues() as Float32Array; // length = texSide*texSide*2

    const n = this.particleCount;
    const gridW = this.gridSize.width;
    const gridH = this.is1D ? 1 : this.gridSize.height;
    const gridCells = gridW * gridH;

    const counts = new Int32Array(gridCells);
    const indices = new Int32Array(n);

    // First pass: count per-cell occupancy
    for (let i = 0; i < n; i++) {
      const x = posData[i * 2];
      const y = posData[i * 2 + 1];
      let cx = Math.floor((x - this.boundsMin[0]) / this.cellSize);
      let cy = this.is1D ? 0 : Math.floor((y - this.boundsMin[1]) / this.cellSize);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      if (cx < 0) cx = 0; else if (cx >= gridW) cx = gridW - 1;
      if (cy < 0) cy = 0; else if (cy >= gridH) cy = gridH - 1;
      const cellId = cx + cy * gridW;
      counts[cellId]++;
    }

    // Prefix sums (offsets)
    const offsets = new Int32Array(gridCells + 1);
    let sum = 0;
    for (let c = 0; c < gridCells; c++) {
      offsets[c] = sum;
      sum += counts[c];
    }
    offsets[gridCells] = sum;

    // Second pass: fill compacted indices using running cursors
    const cursor = new Int32Array(offsets); // copy
    for (let i = 0; i < n; i++) {
      const x = posData[i * 2];
      const y = posData[i * 2 + 1];
      let cx = Math.floor((x - this.boundsMin[0]) / this.cellSize);
      let cy = Math.floor((y - this.boundsMin[1]) / this.cellSize);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;
      if (cx < 0) cx = 0; else if (cx >= gridW) cx = gridW - 1;
      if (cy < 0) cy = 0; else if (cy >= gridH) cy = gridH - 1;
      const cellId = cx + cy * gridW;
      const dst = cursor[cellId]++;
      indices[dst] = i;
    }

    // Upload to 2D textures as single-channel floats
    const offsetsTexElems = this.offsetsTexSide * this.offsetsTexSide;
    const offsetsUpload = new Float32Array(offsetsTexElems);
    for (let i = 0; i < Math.min(offsets.length, offsetsTexElems); i++) offsetsUpload[i] = offsets[i];
    this.cellOffsetsLayer.setFromArray(offsetsUpload);

    const indicesTexElems = this.indicesTexSide * this.indicesTexSide;
    const indicesUpload = new Float32Array(indicesTexElems);
    for (let i = 0; i < indicesTexElems; i++) indicesUpload[i] = -1;
    for (let i = 0; i < Math.min(indices.length, indicesTexElems); i++) indicesUpload[i] = indices[i];
    this.particleIndicesLayer.setFromArray(indicesUpload);
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
