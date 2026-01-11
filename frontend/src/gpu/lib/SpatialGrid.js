// GPU Spatial Grid helpers (CPU-side computations only)
// Provides grid sizing and neighbor buffer construction for GPU collision pipeline
export function computeGridSize(boundsMin, boundsMax, cellSize, is1D) {
    const width = Math.max(1, Math.floor((boundsMax[0] - boundsMin[0]) / cellSize));
    const baseHeight = Math.max(1, Math.floor((boundsMax[1] - boundsMin[1]) / cellSize));
    const height = is1D ? 1 : baseHeight;
    return { width, height };
}
// Build per-cell neighbor lists on CPU and return compact arrays ready for texture upload
export function buildNeighborBuffers(posData, particleCount, gridSize, boundsMin, cellSize, is1D) {
    const n = particleCount;
    const gridW = gridSize.width;
    const gridH = is1D ? 1 : gridSize.height;
    const gridCells = gridW * gridH;
    const counts = new Int32Array(gridCells);
    const indices = new Int32Array(n);
    // First pass: count per-cell occupancy
    for (let i = 0; i < n; i++) {
        const x = posData[i * 2];
        const y = posData[i * 2 + 1];
        let cx = Math.floor((x - boundsMin[0]) / cellSize);
        let cy = is1D ? 0 : Math.floor((y - boundsMin[1]) / cellSize);
        if (!Number.isFinite(cx) || !Number.isFinite(cy))
            continue;
        if (cx < 0)
            cx = 0;
        else if (cx >= gridW)
            cx = gridW - 1;
        if (cy < 0)
            cy = 0;
        else if (cy >= gridH)
            cy = gridH - 1;
        const cellId = cx + cy * gridW;
        counts[cellId]++;
    }
    // Prefix sums (offsets)
    const offsetsI32 = new Int32Array(gridCells + 1);
    let sum = 0;
    for (let c = 0; c < gridCells; c++) {
        offsetsI32[c] = sum;
        sum += counts[c];
    }
    offsetsI32[gridCells] = sum;
    // Second pass: fill compacted indices using running cursors
    const cursor = new Int32Array(offsetsI32); // copy
    for (let i = 0; i < n; i++) {
        const x = posData[i * 2];
        const y = posData[i * 2 + 1];
        let cx = Math.floor((x - boundsMin[0]) / cellSize);
        let cy = is1D ? 0 : Math.floor((y - boundsMin[1]) / cellSize);
        if (!Number.isFinite(cx) || !Number.isFinite(cy))
            continue;
        if (cx < 0)
            cx = 0;
        else if (cx >= gridW)
            cx = gridW - 1;
        if (cy < 0)
            cy = 0;
        else if (cy >= gridH)
            cy = gridH - 1;
        const cellId = cx + cy * gridW;
        const dst = cursor[cellId]++;
        indices[dst] = i;
    }
    // Convert to Float32Array for texture upload consumers
    const offsets = new Float32Array(offsetsI32.length);
    for (let i = 0; i < offsetsI32.length; i++)
        offsets[i] = offsetsI32[i];
    const indicesF32 = new Float32Array(indices.length);
    for (let i = 0; i < indices.length; i++)
        indicesF32[i] = indices[i];
    return { offsets, indices: indicesF32 };
}
