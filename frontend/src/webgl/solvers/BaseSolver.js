export const DEFAULT_SOLVER_CONFIG = {
    telegraph: 'forward-euler',
    diffusion: 'forward-euler'
};
// Centralized boundary condition texture setup
export function createBoundaryTextures(gl, width, height, bcType, dirichletValue = 0.0) {
    const textures = [];
    for (let i = 0; i < 2; i++) {
        const texture = gl.createTexture();
        if (!texture)
            throw new Error(`Failed to create texture ${i}`);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // Set texture wrapping based on boundary condition type
        if (bcType === 'neumann') {
            // Zero gradient: clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        else if (bcType === 'dirichlet') {
            // Fixed values: will handle in shader, but use CLAMP_TO_EDGE for sampling
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // Initialize texture data
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, width, height, 0, gl.RG, gl.FLOAT, null);
        textures.push(texture);
    }
    return textures;
}
