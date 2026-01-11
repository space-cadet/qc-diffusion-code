export function validateBoundaryConfig(config) {
    if (config.xMin >= config.xMax) {
        throw new Error(`Invalid boundary: xMin (${config.xMin}) must be less than xMax (${config.xMax})`);
    }
    if (config.yMin >= config.yMax) {
        throw new Error(`Invalid boundary: yMin (${config.yMin}) must be less than yMax (${config.yMax})`);
    }
    if (!['periodic', 'reflective', 'absorbing'].includes(config.type)) {
        throw new Error(`Invalid boundary type: ${config.type}`);
    }
}
