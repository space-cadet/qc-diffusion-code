// webgl-solver.js - Minimal WebGL PDE solver wrapper

import { RDShaderTop, RDShaderMain, RDShaderBot } from './simulation_shaders.js';
import { auxiliary_GLSL_funs } from './auxiliary_GLSL_funs.js';
import { genericVertexShader } from './generic_shaders.js';

export class WebGLSolver {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
    
    this.textures = [];
    this.framebuffers = [];
    this.currentTexture = 0;
    this.program = null;
    this.uniforms = {};
    this.initialized = false;
  }

  init(width, height) {
    this.width = width;
    this.height = height;
    
    // Create textures for double buffering
    this.createTextures();
    this.createFramebuffers();
    
    this.initialized = true;
  }

  createTextures() {
    const gl = this.gl;
    
    for (let i = 0; i < 2; i++) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.textures.push(texture);
    }
  }

  createFramebuffers() {
    const gl = this.gl;
    
    for (let i = 0; i < 2; i++) {
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
      this.framebuffers.push(framebuffer);
    }
  }

  createProgram(fragmentShaderSource) {
    const gl = this.gl;
    
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, genericVertexShader());
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }
    
    return program;
  }

  compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
    }
    
    return shader;
  }

  step(dt, parameters) {
    if (!this.initialized) {
      throw new Error('Solver not initialized');
    }
    
    const gl = this.gl;
    const readTexture = this.textures[this.currentTexture];
    const writeTexture = this.textures[1 - this.currentTexture];
    const writeFramebuffer = this.framebuffers[1 - this.currentTexture];
    
    // Bind framebuffer for rendering
    gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
    gl.viewport(0, 0, this.width, this.height);
    
    // Use shader program
    gl.useProgram(this.program);
    
    // Set uniforms
    gl.uniform1f(this.uniforms.dt, dt);
    Object.keys(parameters).forEach(key => {
      if (this.uniforms[key] !== undefined) {
        gl.uniform1f(this.uniforms[key], parameters[key]);
      }
    });
    
    // Bind input texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTexture);
    gl.uniform1i(this.uniforms.textureSource, 0);
    
    // Render quad
    this.renderQuad();
    
    // Swap textures
    this.currentTexture = 1 - this.currentTexture;
  }

  renderQuad() {
    const gl = this.gl;
    
    // Create quad geometry if not exists
    if (!this.quadBuffer) {
      const vertices = new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1
      ]);
      
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  generateTelegraphShader() {
    const equationCode = `
      float u = uvwq.r;
      float v = uvwq.g;
      float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
      
      result = vec4(v, v*v*laplacian - 2.0*a*v, 0.0, 0.0);
    `;
    
    return RDShaderTop("FE")
      .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
      .replace("TIMESCALES", "vec4(1.0, 1.0, 1.0, 1.0)")
      + equationCode + RDShaderMain("FE") + RDShaderBot();
  }

  generateDiffusionShader() {
    const equationCode = `
      float u = uvwq.r;
      float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
      
      result = vec4(k*laplacian, 0.0, 0.0, 0.0);
    `;
    
    return RDShaderTop("FE")
      .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
      .replace("TIMESCALES", "vec4(1.0, 1.0, 1.0, 1.0)")
      + equationCode + RDShaderMain("FE") + RDShaderBot();
  }

  setupEquation(equationType, parameters) {
    const shaderSource = equationType === 'telegraph' 
      ? this.generateTelegraphShader() 
      : this.generateDiffusionShader();
    
    this.program = this.createProgram(shaderSource);
    this.uniforms = {
      dt: this.gl.getUniformLocation(this.program, 'dt'),
      dx: this.gl.getUniformLocation(this.program, 'dx'),
      textureSource: this.gl.getUniformLocation(this.program, 'textureSource')
    };
    
    Object.keys(parameters).forEach(key => {
      this.uniforms[key] = this.gl.getUniformLocation(this.program, key);
    });
  }

  getTexture() {
    return this.textures[this.currentTexture];
  }

  setInitialConditions(distribution, xMin, xMax) {
    const gl = this.gl;
    const data = new Float32Array(this.width * this.height * 4);
    
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        const x = xMin + (j / this.width) * (xMax - xMin);
        const idx = (i * this.width + j) * 4;
        
        let value = 0;
        if (distribution === 'gaussian') {
          value = Math.exp(-((x) ** 2) / 0.5);
        } else if (distribution === 'step') {
          value = Math.abs(x) < 1 ? 1 : 0;
        }
        
        data[idx] = value;     // u
        data[idx + 1] = 0;     // v
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
  }

  extractPlotData(xMin, xMax) {
    const pixels = this.readPixels();
    const x = [], u = [];
    
    for (let j = 0; j < this.width; j++) {
      const xVal = xMin + (j / this.width) * (xMax - xMin);
      const idx = (Math.floor(this.height/2) * this.width + j) * 4;
      x.push(xVal);
      u.push(pixels[idx]);
    }
    
    return { x, u };
  }

  readPixels() {
    const gl = this.gl;
    const pixels = new Float32Array(this.width * this.height * 4);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, pixels);
    
    return pixels;
  }
}
