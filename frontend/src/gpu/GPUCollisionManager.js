import { GPULayer, GPUProgram, FLOAT, INT } from 'gpu-io';
import { computeGridSize, buildNeighborBuffers } from './lib/SpatialGrid';
import COLLISION_PAIRS_GLSL from './shaders/collision_pairs.glsl?raw';
import SPATIAL_GRID_GLSL from './shaders/spatialGrid.glsl?raw';
import COLLISION_DETECTION_GLSL from './shaders/collision_detection.glsl?raw';
// Read shader files
const SPATIAL_GRID_SHADER = SPATIAL_GRID_GLSL;
// Externalized collision pairs shader
const COLLISION_PAIRS_SHADER = COLLISION_PAIRS_GLSL;
export class GPUCollisionManager {
    constructor() {
        this.texSize = [1, 1];
        this.particleCount = 0;
        this.radius = 15.0;
        this.cellSize = 50.0;
        this.gridSize = { width: 1, height: 1 };
        this.alpha = 1.0; // collision threshold scaling
        this.is1D = false; // dimension flag for 1D collisions
        this.lastDebugLogTime = 0;
        this.offsetsTexSide = 1;
        this.indicesTexSide = 1;
        this.boundsMin = [-1, -1];
        this.boundsMax = [1, 1];
    }
    initialize(composer, texWidth, texHeight, particleCount, radius) {
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
            }
            catch (e) {
                console.warn('[GPU Collision] Spatial grid bounds uniforms not used by shader');
            }
            // Collision program
            this.collisionProgram = new GPUProgram(composer, {
                name: 'collision',
                fragmentShader: COLLISION_DETECTION_GLSL
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
            }
            catch (e) {
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
        }
        catch (error) {
            console.error('[GPU Collision] Initialization failed:', error);
            throw error;
        }
    }
    updateParameters(params = {}) {
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
                const boundsMin = [bounds.xMin || -1, bounds.yMin || -1];
                const boundsMax = [bounds.xMax || 1, bounds.yMax || 1];
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
                    this.cellOffsetsLayer = new GPULayer(this.composer, {
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
        }
        catch (error) {
            console.error('[GPU Collision] Parameter update failed:', error);
            return false;
        }
    }
    applyCollisions(composer, positionLayer, velocityLayer, dt, texWidth, texHeight, particleCount, simulationTime) {
        if (!this.spatialGridProgram || !this.collisionProgram || !this.collisionPairsProgram ||
            !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer ||
            !this.cellOffsetsLayer || !this.particleIndicesLayer) {
            this.initialize(composer, texWidth, texHeight, particleCount, this.radius);
        }
        if (!this.spatialGridProgram || !this.collisionProgram || !this.collisionPairsProgram ||
            !this.spatialGridLayer || !this.collisionResultLayer || !this.collisionPairsLayer ||
            !this.cellOffsetsLayer || !this.particleIndicesLayer)
            return;
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
        }
        catch (error) {
            console.error('[GPU Collision] Collision step failed:', error);
        }
    }
    // Compute grid dimensions from bounds and cell size
    updateGridSize(boundsMin, boundsMax) {
        const gs = computeGridSize(boundsMin, boundsMax, this.cellSize, this.is1D);
        this.gridSize = { width: gs.width, height: gs.height };
    }
    // Build per-cell neighbor lists on CPU and upload into textures
    buildAndUploadNeighborBuffers(positionLayer) {
        if (!this.cellOffsetsLayer || !this.particleIndicesLayer)
            return;
        const posData = positionLayer.getValues();
        const { offsets, indices } = buildNeighborBuffers(posData, this.particleCount, { width: this.gridSize.width, height: this.gridSize.height }, this.boundsMin, this.cellSize, this.is1D);
        // Upload to 2D textures as single-channel floats (pad to texture size)
        const offsetsTexElems = this.offsetsTexSide * this.offsetsTexSide;
        const offsetsUpload = new Float32Array(offsetsTexElems);
        for (let i = 0; i < Math.min(offsets.length, offsetsTexElems); i++)
            offsetsUpload[i] = offsets[i];
        this.cellOffsetsLayer.setFromArray(offsetsUpload);
        const indicesTexElems = this.indicesTexSide * this.indicesTexSide;
        const indicesUpload = new Float32Array(indicesTexElems);
        for (let i = 0; i < indicesTexElems; i++)
            indicesUpload[i] = -1;
        for (let i = 0; i < Math.min(indices.length, indicesTexElems); i++)
            indicesUpload[i] = indices[i];
        this.particleIndicesLayer.setFromArray(indicesUpload);
    }
    extractVelocities(composer, velocityLayer) {
        if (!this.collisionPairsLayer)
            return;
        try {
            const resultData = this.collisionPairsLayer.getValues();
            const textureSize = this.texSize[0];
            const velocityData = new Float32Array(textureSize * textureSize * 2);
            // Debug collision data occasionally with throttling
            let collisionCount = 0;
            for (let i = 0; i < Math.min(10, this.particleCount); i++) {
                const srcIdx = i * 4;
                const collisionTime = resultData[srcIdx + 2];
                if (collisionTime > 0)
                    collisionCount++;
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
        }
        catch (error) {
            console.error('[GPU Collision] Velocity extraction failed:', error);
        }
    }
    getCollisionTimes() {
        if (!this.collisionResultLayer)
            return null;
        try {
            const resultData = this.collisionResultLayer.getValues();
            const collisionTimes = new Float32Array(this.particleCount);
            for (let i = 0; i < this.particleCount; i++) {
                collisionTimes[i] = resultData[i * 4 + 2];
            }
            return collisionTimes;
        }
        catch (error) {
            console.error('[GPU Collision] Collision time extraction failed:', error);
            return null;
        }
    }
}
