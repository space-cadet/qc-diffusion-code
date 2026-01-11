// ForwardEulerSolver.ts - Forward Euler solver strategy
import { RDShaderTop, RDShaderMain, RDShaderBot } from '../simulation_shaders.js';
import { auxiliary_GLSL_funs } from '../auxiliary_GLSL_funs.js';
export class ForwardEulerSolver {
    getName() {
        return 'forward_euler';
    }
    getTextureCount() {
        return 2; // Ping-pong buffers
    }
    isStable(dt, dx, parameters) {
        // Combined CFL-style checks for explicit methods
        // Parabolic (diffusion): dt <= 0.5 * dx^2 / k
        // Hyperbolic (telegraph/advection-like): dt <= dx / v
        const k = parameters.k || 0;
        const v = parameters.v || 0;
        const eps = 1e-12;
        let dtMax = Number.POSITIVE_INFINITY;
        if (k > 0)
            dtMax = Math.min(dtMax, 0.5 * dx * dx / k);
        if (v > 0)
            dtMax = Math.min(dtMax, dx / Math.max(v, eps));
        if (!isFinite(dtMax))
            return true; // no constraints known
        return dt <= dtMax;
    }
    getShaderSource(equationType) {
        let equationCode = '';
        if (equationType === 'telegraph') {
            equationCode = `
        float u = uvwq.r;
        float w = uvwq.g;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0);
      }`;
        }
        else if (equationType === 'diffusion') {
            equationCode = `
        float u = uvwq.r;
        float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
        result = vec4(k*laplacian, 0.0, 0.0, 0.0);
      }`;
        }
        return RDShaderTop("FE")
            .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
            .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)")
            + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
    }
    step(gl, textures, framebuffers, program, uniforms, dt, dx, dy, parameters, currentTexture) {
        const readTexture = textures[currentTexture];
        const writeTexture = textures[1 - currentTexture];
        const writeFramebuffer = framebuffers[1 - currentTexture];
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
        gl.useProgram(program);
        // Auto dt guard (CFL-style)
        const k = parameters.k || 0;
        const v = parameters.v || 0;
        const safety = 0.9; // conservative factor
        let dtLocal = dt;
        if (k > 0) {
            dtLocal = Math.min(dtLocal, safety * 0.5 * dx * dx / k);
        }
        if (v > 0) {
            dtLocal = Math.min(dtLocal, safety * dx / v);
        }
        // Set uniforms
        if (uniforms.dt)
            gl.uniform1f(uniforms.dt, dtLocal);
        if (uniforms.dx)
            gl.uniform1f(uniforms.dx, dx);
        if (uniforms.dy)
            gl.uniform1f(uniforms.dy, dy);
        Object.keys(parameters).forEach(key => {
            if (uniforms[key])
                gl.uniform1f(uniforms[key], parameters[key]);
        });
        // Bind input texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        if (uniforms.textureSource)
            gl.uniform1i(uniforms.textureSource, 0);
        // Draw full-screen quad to write the updated field
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return 1 - currentTexture;
    }
}
