import type { Container, Particle as TsParticle } from "@tsparticles/engine";

interface WebGLBuffers {
  position: WebGLBuffer | null;
  color: WebGLBuffer | null;
  size: WebGLBuffer | null;
}

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

export class WebGLParticleRenderer {
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

    // Vertex shader
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

    // Fragment shader
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

    // Pre-allocate buffer storage
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
    gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent clear
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.gl.viewport(0, 0, width, height);
  }

  updateFromTsParticles(container: Container): void {
    const particles = container.particles;
    const count = Math.min(particles.count, this.maxParticles);
    this.currentCount = count;

    if (count === 0) return;

    const positions = new Float32Array(count * 2);
    const colors = new Float32Array(count * 4);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = particles.get(i) as TsParticle | undefined;
      if (!p) continue;

      positions[i * 2] = p.position.x;
      positions[i * 2 + 1] = p.position.y;

      // Extract color from tsParticles (HSL to RGB conversion if needed)
      const hsl = p.color;
      if (hsl) {
        const rgb = this.hslToRgb(hsl.h.value / 360, hsl.s.value / 100, hsl.l.value / 100);
        colors[i * 4] = rgb[0];
        colors[i * 4 + 1] = rgb[1];
        colors[i * 4 + 2] = rgb[2];
      } else {
        colors[i * 4] = 0.23; // Default blue (#3b82f6)
        colors[i * 4 + 1] = 0.51;
        colors[i * 4 + 2] = 0.96;
      }
      colors[i * 4 + 3] = (p as any).opacity?.value ?? 0.8;

      sizes[i] = p.size.value ?? 3;
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

    // Update position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions.subarray(0, count * 2));

    // Update color buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors.subarray(0, count * 4));

    // Update size buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizes.subarray(0, count));
  }

  render(): void {
    const gl = this.gl;

    if (this.currentCount === 0) return;

    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.program.program);

    // Set uniforms
    gl.uniform2f(this.program.uniforms.resolution, this.canvasWidth, this.canvasHeight);
    gl.uniform1f(this.program.uniforms.pointSize, 1.0); // Base point size multiplier

    // Bind position attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
    gl.enableVertexAttribArray(this.program.attributes.position);
    gl.vertexAttribPointer(this.program.attributes.position, 2, gl.FLOAT, false, 0, 0);

    // Bind color attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
    gl.enableVertexAttribArray(this.program.attributes.color);
    gl.vertexAttribPointer(this.program.attributes.color, 4, gl.FLOAT, false, 0, 0);

    // Bind size attribute
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
    gl.enableVertexAttribArray(this.program.attributes.size);
    gl.vertexAttribPointer(this.program.attributes.size, 1, gl.FLOAT, false, 0, 0);

    // Draw points
    gl.drawArrays(gl.POINTS, 0, this.currentCount);
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    // HSL to RGB conversion
    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number): number => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r, g, b];
  }

  destroy(): void {
    const gl = this.gl;

    if (this.buffers.position) gl.deleteBuffer(this.buffers.position);
    if (this.buffers.color) gl.deleteBuffer(this.buffers.color);
    if (this.buffers.size) gl.deleteBuffer(this.buffers.size);

    gl.deleteProgram(this.program.program);
  }
}
