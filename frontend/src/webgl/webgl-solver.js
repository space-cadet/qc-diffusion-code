// webgl-solver.js - Minimal WebGL PDE solver wrapper

import { RDShaderTop, RDShaderMain, RDShaderBot } from './simulation_shaders.js';
import { auxiliary_GLSL_funs } from './auxiliary_GLSL_funs.js';
import { genericVertexShader } from './generic_shaders.js';
import { ForwardEulerSolver } from './solvers/ForwardEulerSolver.ts';
import { CrankNicolsonSolver } from './solvers/CrankNicolsonSolver.ts';
import { NeumannBC } from './boundary-conditions/NeumannBC.ts';

/** @typedef {import('./solvers/BaseSolver').SolverStrategy} SolverStrategy */

/**
 * @typedef {'forward-euler' | 'crank-nicolson' | 'rk4'} SolverType
 */

export class WebGLSolver {
  /**
   * @param {SolverType} solverType
   * @returns {SolverStrategy}
   */
  static createSolver(solverType) {
    switch (solverType) {
      case 'forward-euler':
        return new ForwardEulerSolver();
      case 'crank-nicolson':
        return new CrankNicolsonSolver();
      default:
        console.warn(`Unknown solver type: ${solverType}, using forward-euler`);
        return new ForwardEulerSolver();
    }
  }
  constructor(canvas) {
    this.solverStrategy = new ForwardEulerSolver();
    this.boundaryCondition = new NeumannBC();
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', {
      powerPreference: 'high-performance',
    });
    
    if (!this.gl) {
      throw new Error('WebGL2 not supported');
    }
    
    // Check and enable required extensions
    const ext = this.gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
      console.warn('EXT_color_buffer_float not supported - falling back to RGBA');
      this.floatTextureSupported = false;
    } else {
      this.floatTextureSupported = true;
    }
    
    this.textures = [];
    this.framebuffers = [];
    this.currentTexture = 0;
    this.program = null;
    this.uniforms = {};
    this.initialized = false;
    this.solverStrategy = new ForwardEulerSolver();
    this.currentEquationType = null;
    
    // Inject boundary condition into solver
    this.solverStrategy.setBoundaryCondition(this.boundaryCondition);
  }

  /**
   * Update the active boundary condition and inject into current solver strategy.
   * @param {import('./boundary-conditions/BaseBoundaryCondition').BaseBoundaryCondition} bc
   */
  setBoundaryCondition(bc) {
    this.boundaryCondition = bc;
    if (this.solverStrategy && typeof this.solverStrategy.setBoundaryCondition === 'function') {
      this.solverStrategy.setBoundaryCondition(bc);
    }
  }

  /** @param {SolverStrategy} solverStrategy */
  setSolver(solverStrategy) {
    this.solverStrategy = solverStrategy;
    // Inject current boundary condition into new solver
    this.solverStrategy.setBoundaryCondition(this.boundaryCondition);
    // Re-setup equation if already initialized
    if (this.currentEquationType) {
      this.setupEquation(this.currentEquationType, this.currentParameters || {});
    }
  }

  static createSolver(solverType) {
    switch (solverType) {
      case 'forward-euler':
        return new ForwardEulerSolver();
      case 'crank-nicolson':
        return new CrankNicolsonSolver();
      default:
        console.warn(`Unknown solver type: ${solverType}, using forward-euler`);
        return new ForwardEulerSolver();
    }
  }

  init(width, height) {
    this.width = width;
    this.height = height;

    // Prepare full-screen quad buffer once so compute passes can render
    if (!this.quadBuffer) {
      const gl = this.gl;
      const vertices = new Float32Array([
        -1, -1, 0, 0,
         1, -1, 1, 0,
        -1,  1, 0, 1,
         1,  1, 1, 1
      ]);
      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Create VAO to capture vertex attrib state (positions at loc 0, uvs at loc 1)
      this.quadVao = gl.createVertexArray();
      gl.bindVertexArray(this.quadVao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
      gl.bindVertexArray(null);
    }
    
    // Create textures for double buffering
    this._createTextures();
    this.createFramebuffers();
    
    this.initialized = true;
  }

  _createTextures() {
    const { gl, width, height } = this;
    
    this.textures = [
      this._createTexture(width, height),
      this._createTexture(width, height)
    ];
  }

  _createTexture(width, height) {
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    
    // Set basic texture parameters without wrapping mode
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    
    // Initialize with empty data
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA32F,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.FLOAT,
      null
    );
    
    return texture;
  }

  createFramebuffers() {
    const gl = this.gl;
    
    for (let i = 0; i < 2; i++) {
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);
      
      if (!this.floatTextureSupported) {
        // For non-float textures, we need to clear to ensure proper rendering
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      
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

  step(dt, parameters, xMin = -5, xMax = 5) {
    if (!this.initialized) {
      throw new Error('Solver not initialized');
    }
    
    const gl = this.gl;
    const dx = (xMax - xMin) / Math.max(1, this.width - 1);
    const dy = (xMax - xMin) / Math.max(1, this.height - 1);
    
    // Set viewport and common uniforms
    gl.viewport(0, 0, this.width, this.height);
    if (this.uniforms.L_x) gl.uniform1f(this.uniforms.L_x, xMax - xMin);
    if (this.uniforms.L_y) gl.uniform1f(this.uniforms.L_y, xMax - xMin);
    if (this.uniforms.MINX) gl.uniform1f(this.uniforms.MINX, xMin);
    if (this.uniforms.MINY) gl.uniform1f(this.uniforms.MINY, xMin);
    // Bind VAO so solver draw calls have valid vertex attributes
    if (this.quadVao) gl.bindVertexArray(this.quadVao);

    // Delegate to solver strategy
    this.currentTexture = this.solverStrategy.step(
      gl, this.textures, this.framebuffers, this.program, this.uniforms,
      dt, dx, dy, parameters, this.currentTexture
    );
    
    // Render quad
    this.renderQuad();
  }

  renderQuad() {
    const gl = this.gl;
    // Bind VAO for onscreen draw
    if (this.quadVao) gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  generateTelegraphShader() {
    const equationCode = `
      float u = uvwq.r;
      float w = uvwq.g;  // du/dt
      float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
      
      // Telegraph equation as first-order system:
      // du/dt = w
      // dw/dt = v²∇²u - 2aw
      result = vec4(w, v*v*laplacian - 2.0*a*w, 0.0, 0.0);
    }`;
    
    const result = RDShaderTop("FE")
      .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
      .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)")
      + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
      
    return result;
  }

  generateDiffusionShader() {
    const equationCode = `
      float u = uvwq.r;
      float laplacian = (uvwqR.r + uvwqL.r + uvwqT.r + uvwqB.r - 4.0*uvwq.r) / (dx*dx);
      
      result = vec4(k*laplacian, 0.0, 0.0, 0.0);
    }`;
    
    return RDShaderTop("FE")
      .replace("AUXILIARY_GLSL_FUNS", auxiliary_GLSL_funs())
      .replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)")
      + equationCode + RDShaderMain("FE").replace(/TIMESCALES/g, "vec4(1.0, 1.0, 1.0, 1.0)") + RDShaderBot();
  }

  setupEquation(equationType, parameters) {
    this.currentEquationType = equationType;
    this.currentParameters = parameters;
    
    const shaderSource = this.solverStrategy.getShaderSource(equationType);
    
    this.program = this.createProgram(shaderSource);
    this.uniforms = {
      dt: this.gl.getUniformLocation(this.program, 'dt'),
      dx: this.gl.getUniformLocation(this.program, 'dx'),
      dy: this.gl.getUniformLocation(this.program, 'dy'),
      L_x: this.gl.getUniformLocation(this.program, 'L_x'),
      L_y: this.gl.getUniformLocation(this.program, 'L_y'),
      MINX: this.gl.getUniformLocation(this.program, 'MINX'),
      MINY: this.gl.getUniformLocation(this.program, 'MINY'),
      textureSource: this.gl.getUniformLocation(this.program, 'textureSource'),
      textureSource1: this.gl.getUniformLocation(this.program, 'textureSource1')
    };
    
    Object.keys(parameters).forEach(key => {
      this.uniforms[key] = this.gl.getUniformLocation(this.program, key);
    });
  }

  getShaderForEquation(equationType) {
    switch (equationType) {
      case 'telegraph':
        return this.generateTelegraphShader();
      case 'diffusion':
        return this.generateDiffusionShader();
      default:
        throw new Error(`Unknown equation type: ${equationType}`);
    }
  }

  getTexture() {
    return this.textures[this.currentTexture];
  }

  // Upload a 1D initial profile (u) into the red channel of texture 0
  setInitialProfile(uArray) {
    const gl = this.gl;
    const data = new Float32Array(this.width * this.height * 4);
    // write on middle row
    const row = Math.floor(this.height / 2);
    for (let j = 0; j < this.width; j++) {
      const idx = (row * this.width + j) * 4;
      const u = j < uArray.length ? uArray[j] : 0;
      data[idx] = u;         // u → R
      data[idx + 1] = 0;     // w → G
      data[idx + 2] = 0;
      data[idx + 3] = 0;
    }
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    if (this.floatTextureSupported) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
    } else {
      const uintData = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) uintData[i] = Math.min(255, Math.max(0, data[i] * 255));
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, uintData);
    }
    // reset ping-pong to read from texture 0 first
    this.currentTexture = 0;
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
        } else if (distribution === 'delta') {
          value = Math.abs(x) < 0.1 ? 1 : 0;
        } else if (distribution === 'sine') {
          value = Math.sin(x * Math.PI * 2) * 0.5 + 0.5;
        }
        
        data[idx] = value;     // u
        data[idx + 1] = 0;     // v
        data[idx + 2] = 0;
        data[idx + 3] = 0;
      }
    }
    
    gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
    if (this.floatTextureSupported) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, data);
    } else {
      // Convert to Uint8Array for non-float textures
      const uintData = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        uintData[i] = Math.min(255, Math.max(0, data[i] * 255));
      }
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, uintData);
    }
  }

  extractPlotData(xMin, xMax) {
    const pixels = this.readPixels();
    const x = [], u = [], w = [];
    
    const denom = Math.max(1, this.width - 1);
    for (let j = 0; j < this.width; j++) {
      const xVal = xMin + (j / denom) * (xMax - xMin);
      const idx = (Math.floor(this.height/2) * this.width + j) * 4;
      x.push(xVal);
      u.push(pixels[idx]);     // Red channel: u
      w.push(pixels[idx + 1]); // Green channel: w = du/dt
    }
    
    return { x, u, w };
  }

  readPixels() {
    const gl = this.gl;
    const pixels = new Float32Array(this.width * this.height * 4);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[this.currentTexture]);
    gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, pixels);
    
    return pixels;
  }
}
