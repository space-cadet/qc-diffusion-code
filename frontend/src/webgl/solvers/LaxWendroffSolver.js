export class LaxWendroffSolver {
    getName() {
        return 'lax_wendroff';
    }
    getTextureCount() {
        return 2; // Standard ping-pong textures
    }
    isStable(dt, dx, parameters) {
        const v = parameters.v || 1.0;
        return dt <= dx / v; // CFL condition for hyperbolic
    }
    getShaderSource(equationType) {
        if (equationType === 'telegraph') {
            return `#version 300 es
precision highp float;
in vec2 textureCoords;
uniform sampler2D textureSource;
uniform float dt;
uniform float dx;
uniform float a; // collision rate
uniform float v; // velocity
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / vec2(textureSize(textureSource, 0));
  
  // Current values
  vec4 uvwq = texture(textureSource, textureCoords);
  vec4 uvwqL = texture(textureSource, textureCoords - vec2(texel.x, 0.0));
  vec4 uvwqR = texture(textureSource, textureCoords + vec2(texel.x, 0.0));
  
  float u = uvwq.r;
  float w = uvwq.g;
  float uL = uvwqL.r;
  float uR = uvwqR.r;
  float wL = uvwqL.g;
  float wR = uvwqR.g;
  
  // Lax-Wendroff for telegraph system
  // Step 1: Half-step predictor at cell interfaces
  float u_half_L = 0.5 * (u + uL) + 0.5 * (dt/dx) * (wL - w);
  float w_half_L = 0.5 * (w + wL) + 0.5 * (dt/dx) * (v*v*(uL - u)/dx - a*(w + wL));
  
  float u_half_R = 0.5 * (uR + u) + 0.5 * (dt/dx) * (w - wR);
  float w_half_R = 0.5 * (wR + w) + 0.5 * (dt/dx) * (v*v*(u - uR)/dx - a*(wR + w));
  
  // Step 2: Full step corrector
  float u_new = u + (dt/dx) * (w_half_L - w_half_R);
  float w_new = w + (dt/dx) * (v*v*(u_half_L - u_half_R)/dx - a*dt*(w_half_L + w_half_R));
  
  fragColor = vec4(u_new, w_new, 0.0, 0.0);
}`;
        }
        // Fallback for other equations
        return `#version 300 es
precision highp float;
in vec2 textureCoords;
uniform sampler2D textureSource;
uniform float dt;
uniform float dx;
out vec4 fragColor;
void main() {
  fragColor = texture(textureSource, textureCoords);
}`;
    }
    step(gl, textures, framebuffers, program, uniforms, dt, dx, dy, parameters, currentTexture) {
        const readTexture = textures[currentTexture];
        const writeTexture = textures[1 - currentTexture];
        const writeFramebuffer = framebuffers[1 - currentTexture];
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
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTexture);
        if (uniforms.textureSource)
            gl.uniform1i(uniforms.textureSource, 0);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return 1 - currentTexture;
    }
    cleanup(gl) {
        // No additional cleanup needed
    }
}
