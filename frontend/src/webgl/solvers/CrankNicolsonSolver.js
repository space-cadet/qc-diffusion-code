// CrankNicolsonSolver.ts - Crank-Nicolson implicit solver strategy
import { RDShaderTop, RDShaderMain, RDShaderBot } from '../simulation_shaders.js';
import { auxiliary_GLSL_funs } from '../auxiliary_GLSL_funs.js';
export class CrankNicolsonSolver {
    constructor() {
        this.iterativeTextures = [];
        this.iterativeFramebuffers = [];
        this.iterativeProgram = null;
        this.initialized = false;
    }
    getName() {
        return 'crank_nicolson';
    }
    getTextureCount() {
        return 4; // u^n, u^{n+1}, temp, residual for iterative solving
    }
    isStable(dt, dx, parameters) {
        // Crank-Nicolson is unconditionally stable
        return true;
    }
    getShaderSource(equationType) {
        let equationCode = '';
        if (equationType === 'telegraph') {
            // For telegraph equation, fall back to explicit (CN is complex for hyperbolic)
            equationCode = `
        float u = uvwq.r;
        float w = uvwq.g;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0);
      }`;
        }
        else if (equationType === 'diffusion') {
            // Standalone CN Jacobi iteration shader: writes u^{n+1,(m+1)} directly to fragColor
            return `#version 300 es\n
precision highp float; precision highp sampler2D;\n
in vec2 textureCoords;\n
uniform sampler2D textureSource;   // u^n\n
uniform sampler2D textureSource1;  // u^{n+1,(m)} (current iterate)\n
uniform float dt;\n
uniform float dx;\n
uniform float dy;\n
uniform float k;\n
out vec4 fragColor;\n
\n
void main() {\n
  // u^n and its neighbors for RHS
  vec2 texelOld = 1.0 / vec2(textureSize(textureSource, 0));\n
  float u_old  = texture(textureSource, textureCoords).r;\n
  float u_old_r = texture(textureSource, textureCoords + vec2(texelOld.x, 0.0)).r;\n
  float u_old_l = texture(textureSource, textureCoords - vec2(texelOld.x, 0.0)).r;\n
  float u_old_t = texture(textureSource, textureCoords + vec2(0.0, texelOld.y)).r;\n
  float u_old_b = texture(textureSource, textureCoords - vec2(0.0, texelOld.y)).r;\n
\n
  // Explicit RHS (1D): (I + 0.5 * dt * k * Lx) u^n
  float lap_old = (u_old_r + u_old_l - 2.0 * u_old) / (dx * dx);\n
  float rhs = u_old + 0.5 * dt * k * lap_old;\n
\n
  // Implicit Jacobi uses current iterate neighbors (1D)
  vec2 texelIter = 1.0 / vec2(textureSize(textureSource1, 0));
  float u_r = texture(textureSource1, textureCoords + vec2(texelIter.x, 0.0)).r;
  float u_l = texture(textureSource1, textureCoords - vec2(texelIter.x, 0.0)).r;

  float coeff_x = 1.0 / (dx * dx);
  float diagonal = 1.0 + 0.5 * dt * k * (2.0 * coeff_x);
  float neighbors = coeff_x * (u_r + u_l);\n
  float u_updated = (rhs + 0.5 * dt * k * neighbors) / diagonal;\n
\n
  fragColor = vec4(u_updated, 0.0, 0.0, 0.0);\n
}`;
        }
        return RDShaderTop("FE")
            .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
            .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)")
            + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
    }
    initializeIterativeSolver(gl, width, height) {
        if (this.initialized)
            return;
        // Create additional textures for iterative solving
        for (let i = 0; i < 2; i++) {
            const texture = gl.createTexture();
            if (!texture)
                throw new Error('Failed to create iterative texture');
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            this.iterativeTextures.push(texture);
            const framebuffer = gl.createFramebuffer();
            if (!framebuffer)
                throw new Error('Failed to create iterative framebuffer');
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            this.iterativeFramebuffers.push(framebuffer);
        }
        this.initialized = true;
    }
    step(gl, textures, framebuffers, program, uniforms, dt, dx, dy, parameters, currentTexture) {
        const canvas = gl.canvas;
        this.initializeIterativeSolver(gl, canvas.width, canvas.height);
        const readTexture = textures[currentTexture];
        const writeTexture = textures[1 - currentTexture];
        const writeFramebuffer = framebuffers[1 - currentTexture];
        // For diffusion equation (presence of k), perform iterative solve
        if (parameters.k !== undefined) {
            const maxIterations = parameters.max_iter || 100;
            const tolerance = parameters.tolerance || 1e-6;
            const theta = parameters.theta || 0.5; // retained but not used in dt
            // Perform Jacobi iterations
            let currentIterTexture = 0;
            for (let iter = 0; iter < maxIterations; iter++) {
                const readIterTexture = (iter === 0)
                    ? readTexture // first iterate uses u^n as initial guess
                    : this.iterativeTextures[currentIterTexture];
                const writeIterTexture = this.iterativeTextures[1 - currentIterTexture];
                const isLast = (iter === maxIterations - 1);
                const writeIterFramebuffer = isLast ? writeFramebuffer : this.iterativeFramebuffers[1 - currentIterTexture];
                gl.bindFramebuffer(gl.FRAMEBUFFER, writeIterFramebuffer);
                gl.useProgram(program);
                // Set uniforms
                if (uniforms.dt)
                    gl.uniform1f(uniforms.dt, dt);
                if (uniforms.dx)
                    gl.uniform1f(uniforms.dx, dx);
                if (uniforms.dy)
                    gl.uniform1f(uniforms.dy, dy);
                Object.keys(parameters).forEach(key => {
                    if (uniforms[key] && key !== 'equationType') {
                        gl.uniform1f(uniforms[key], parameters[key]);
                    }
                });
                // Bind textures
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, readTexture);
                if (uniforms.textureSource)
                    gl.uniform1i(uniforms.textureSource, 0);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, readIterTexture);
                if (uniforms.textureSource1)
                    gl.uniform1i(uniforms.textureSource1, 1);
                // Draw
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                if (!isLast)
                    currentIterTexture = 1 - currentIterTexture;
            }
            // Final result already rendered to writeFramebuffer in last iteration
        }
        else {
            // For non-diffusion equations, fall back to explicit method
            gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
            gl.useProgram(program);
            // Set uniforms
            if (uniforms.dt)
                gl.uniform1f(uniforms.dt, dt);
            if (uniforms.dx)
                gl.uniform1f(uniforms.dx, dx);
            if (uniforms.dy)
                gl.uniform1f(uniforms.dy, dy);
            Object.keys(parameters).forEach(key => {
                if (uniforms[key] && key !== 'equationType') {
                    gl.uniform1f(uniforms[key], parameters[key]);
                }
            });
            // Bind input texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, readTexture);
            if (uniforms.textureSource)
                gl.uniform1i(uniforms.textureSource, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        return 1 - currentTexture;
    }
    cleanup(gl) {
        this.iterativeTextures.forEach(texture => gl.deleteTexture(texture));
        this.iterativeFramebuffers.forEach(fb => gl.deleteFramebuffer(fb));
        if (this.iterativeProgram)
            gl.deleteProgram(this.iterativeProgram);
        this.iterativeTextures = [];
        this.iterativeFramebuffers = [];
        this.iterativeProgram = null;
        this.initialized = false;
    }
}
