// Utility functions for lightweight collision diagnostics on GPU results
// Returns a small sample collision count by checking the first N particles' collisionTime field
export function sampleCollisionCount(resultData, particleCount, sample = 10) {
    const s = Math.max(0, Math.min(sample, particleCount));
    let count = 0;
    for (let i = 0; i < s; i++) {
        const base = i * 4;
        const collisionTime = resultData[base + 2];
        if (collisionTime > 0)
            count++;
    }
    return count;
}
