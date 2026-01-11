/**
 * Generate x-coordinates for the simulation domain
 */
export function generateMesh(x_min, x_max, mesh_size) {
    const dx = (x_max - x_min) / (mesh_size - 1);
    return Array.from({ length: mesh_size }, (_, i) => x_min + i * dx);
}
/**
 * Gaussian distribution
 */
function gaussianDistribution(x, center = 0, sigma = 1) {
    return x.map(xi => Math.exp(-0.5 * Math.pow((xi - center) / sigma, 2)));
}
function doubleGaussian(x, c1, s1, c2, s2, w) {
    const g1 = gaussianDistribution(x, c1, s1);
    const g2 = gaussianDistribution(x, c2, s2);
    return g1.map((v, i) => w * v + (1 - w) * g2[i]);
}
/**
 * Step function distribution
 */
function stepDistribution(x, left = -1, right = 1, height = 1) {
    return x.map(xi => (xi >= left && xi <= right) ? height : 0.0);
}
/**
 * Delta function approximation (narrow Gaussian)
 */
function deltaDistribution(x, center = 0, sigma = 0.1) {
    const values = x.map(xi => Math.exp(-0.5 * Math.pow((xi - center) / sigma, 2)));
    // Normalize to approximate delta function
    const sum = values.reduce((acc, val) => acc + val, 0);
    const dx = (x[1] - x[0]);
    return values.map(val => val / (sum * dx));
}
/**
 * Sine wave distribution
 */
function sineDistribution(x, frequency = 1, amplitude = 1) {
    return x.map(xi => amplitude * Math.sin(frequency * Math.PI * xi));
}
function cosineDistribution(x, frequency = 1, amplitude = 1) {
    return x.map(xi => amplitude * Math.cos(frequency * Math.PI * xi));
}
/**
 * Generate initial conditions based on distribution type
 */
export function generateInitialConditions(params) {
    const { distribution, x_min, x_max, mesh_size } = params;
    const selectedEquations = params.selectedEquations || ['telegraph', 'diffusion'];
    // Generate mesh
    const x = generateMesh(x_min, x_max, mesh_size);
    // Generate initial distribution
    let u;
    const c = params.dist_center ?? 0;
    const s = params.dist_sigma ?? 1;
    const sl = params.step_left ?? -1;
    const sr = params.step_right ?? 1;
    const sh = params.step_height ?? 1;
    const sf = params.sine_freq ?? 1;
    const sa = params.sine_amp ?? 1;
    const cf = params.cos_freq ?? 1;
    const ca = params.cos_amp ?? 1;
    const c1 = params.dg_center1 ?? -1;
    const s1 = params.dg_sigma1 ?? 0.5;
    const c2 = params.dg_center2 ?? 1;
    const s2 = params.dg_sigma2 ?? 0.5;
    const w = Math.min(Math.max(params.dg_weight ?? 0.5, 0), 1);
    switch (distribution) {
        case 'gaussian':
            u = gaussianDistribution(x, c, s);
            break;
        case 'double_gaussian':
            u = doubleGaussian(x, c1, s1, c2, s2, w);
            break;
        case 'step':
            u = stepDistribution(x, sl, sr, sh);
            break;
        case 'delta':
            u = deltaDistribution(x, c, s || 0.1);
            break;
        case 'sine':
            u = sineDistribution(x, sf, sa);
            break;
        case 'cosine':
            u = cosineDistribution(x, cf, ca);
            break;
        default:
            u = gaussianDistribution(x, c, s);
    }
    // Create result with only selected equations
    const result = { time: 0.0 };
    selectedEquations.forEach(equationType => {
        result[equationType] = { x, u: [...u] };
    });
    return result;
}
/**
 * Normalize distribution to have unit integral (for probability distributions)
 */
export function normalizeDistribution(x, u) {
    const dx = x.length > 1 ? x[1] - x[0] : 1;
    const integral = u.reduce((sum, val) => sum + val, 0) * dx;
    if (integral === 0)
        return u;
    return u.map(val => val / integral);
}
/**
 * Get distribution parameters for display/debugging
 */
export function getDistributionInfo(params) {
    switch (params.distribution) {
        case 'gaussian':
            return {
                name: 'Gaussian',
                description: 'Normal distribution exp(-x²/2σ²)',
                parameters: { center: 0, sigma: 1 }
            };
        case 'step':
            return {
                name: 'Step Function',
                description: 'Uniform distribution over interval',
                parameters: { left: -1, right: 1 }
            };
        case 'delta':
            return {
                name: 'Delta Function',
                description: 'Narrow Gaussian approximation',
                parameters: { center: 0, sigma: 0.1 }
            };
        case 'sine':
            return {
                name: 'Sine Wave',
                description: 'Sinusoidal distribution',
                parameters: { frequency: 1, amplitude: 1 }
            };
        default:
            return {
                name: 'Unknown',
                description: 'Unknown distribution type',
                parameters: {}
            };
    }
}
