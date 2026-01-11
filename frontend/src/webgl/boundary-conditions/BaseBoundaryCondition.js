export class BaseBoundaryCondition {
    constructor(config) {
        this.config = config;
    }
    getType() {
        return this.config.type;
    }
    // Optional post-processing pass that writes boundary texels directly.
    // Default is no-op; specific BCs (e.g., Dirichlet) can override.
    // The target framebuffer should already be bound by the caller.
    // Width/height are pixel dimensions of the target texture.
    // This enables true plug-and-play BCs without modifying solver shaders.
    applyPostPass(_gl, _targetFramebuffer, _width, _height) {
        // no-op by default
    }
    setUniform(gl, program, name, value) {
        const location = gl.getUniformLocation(program, name);
        if (location !== null) {
            if (typeof value === 'number') {
                gl.uniform1f(location, value);
            }
            else if (value.length === 2) {
                gl.uniform2fv(location, value);
            }
            else if (value.length === 3) {
                gl.uniform3fv(location, value);
            }
            else if (value.length === 4) {
                gl.uniform4fv(location, value);
            }
        }
    }
}
