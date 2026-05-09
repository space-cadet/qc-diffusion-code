import type { ParticleV2 } from "../physics/PhysicsEngineV2";

interface ShaderProgram {
  program: WebGLProgram;
  attributes: {
    position: number;
    color: number;
    size: number;
  };
  uniforms: {
    resolution: WebGLUniformLocation | null;
    pointSize: WebGLUniformLocation | null;
  };
}

interface WebGLBuffers {
  position: WebGLBuffer | null;
  color: WebGLBuffer | null;
  size: WebGLBuffer | null;
}

export class WebGLRendererV2 {
  private gl: WebGLRenderingContext;
  private program: ShaderProgram;
  private buffers: WebGLBuffers;
  private maxParticles: number;
  private currentCount: number = 0;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(gl: WebGLRenderingContext, maxParticles: number = 10000) {
    this.gl = gl;
    this.maxParticles = maxParticles;
    this.buffers = { position: null, color: null, size: null };
    this.program = this.createShaderProgram();
    this.initBuffers();
    this.setupGL();
  }

  private createShaderProgram(): ShaderProgram {
    const gl = this.gl;

    const vsSource = `
      attribute vec2 a_position;
      attribute vec4 a_color;
      attribute float a_size;

      uniform vec2 u_resolution;
      uniform float u_pointSize;

      varying vec4 v_color;

      void main() {
        vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = a_size * u_pointSize;
        v_color = a_color;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec4 v_color;

      void main() {
        float dist = length(gl_PointCoord - vec2(0.5, 0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
        gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
      }
    `;

    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`);
    }

    return {
      program,
      attributes: {
        position: gl.getAttribLocation(program, "a_position"),
        color: gl.getAttribLocation(program, "a_color"),
        size: gl.getAttribLocation(program, "a_size"),
      },
      uniforms: {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        pointSize: gl.getUniformLocation(program, "u_pointSize"),
      },
    };
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${error}`);
    }

    return shader;
  }

  private initBuffers(): void {
    const gl = this.gl;

    this.buffers.position = gl.createBuffer();
    this.buffers.color = gl.createBuffer();
    this.buffers.size = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 2 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 4 * 4, gl.DYNAMIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 4, gl.DYNAMIC_DRAW);
  }

  private setupGL(): void {
    const gl = this.gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.gl.viewport(0, 0, width, height);
  }

  updateParticles(particles: ParticleV2[]): void {
    const count = Math.min(particles.length, this.maxParticles);
    this.currentCount = count;

    if (count === 0) return;

    const positions = new Float32Array(count * 2);
    const colors = new Float32Array(count * 4);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      positions[i * 2] = p.x;
      positions[i * 2 + 1] = p.y;
      colors[i * 4] = p.color[0];
      colors[i * 4 + 1] = p.color[1];
      colors[i * 4 + 2] = p.color[2];
      colors[i * 4 + 3] = p.color[3];
      sizes[i] = p.radius;
    }

    this.updateBuffers(positions, colors, sizes, count);
  }

  private updateBuffers(
    positions: Float32Array,
    colors: Float32Array,
    sizes: Float32Array,
    count: number
  ): void {
    const gl = this.gl;

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions.subarray(0, count * 2));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors.subarray(0, count * 4));

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizes.subarray(0, count));
  }

  render(): void {
    const gl = this.gl;

    if (this.currentCount === 0) return;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program.program);

    gl.uniform2f(this.program.uniforms.resolution, this.canvasWidth, this.canvasHeight);
    gl.uniform1f(this.program.uniforms.pointSize, 1.0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.program.attributes.position);
    gl.vertexAttribPointer(this.program.attributes.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.enableVertexAttribArray(this.program.attributes.color);
    gl.vertexAttribPointer(this.program.attributes.color, 4, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.enableVertexAttribArray(this.program.attributes.size);
    gl.vertexAttribPointer(this.program.attributes.size, 1, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.POINTS, 0, this.currentCount);
  }

  destroy(): void {
    const gl = this.gl;

    if (this.buffers.position) gl.deleteBuffer(this.buffers.position);
    if (this.buffers.color) gl.deleteBuffer(this.buffers.color);
    if (this.buffers.size) gl.deleteBuffer(this.buffers.size);

    gl.deleteProgram(this.program.program);
  }
}
