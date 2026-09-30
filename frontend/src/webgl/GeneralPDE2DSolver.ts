import { parse } from 'mathjs';
import { genericVertexShader } from './generic_shaders';

export interface PDE2DField {
  name: string;
  initial: string;
  rhs: string;
}

export interface PDE2DDomain {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

type BoundaryMode = 'neumann' | 'periodic' | 'dirichlet';
type ScalarChannel = 'r' | 'g' | 'b' | 'a';

const CHANNELS: ScalarChannel[] = ['r', 'g', 'b', 'a'];
const GLSL_FUNCTIONS: Record<string, string> = {
  abs: 'abs', acos: 'acos', asin: 'asin', atan: 'atan', ceil: 'ceil',
  cos: 'cos', cosh: 'cosh', exp: 'exp', floor: 'floor', log: 'log',
  max: 'max', min: 'min', pow: 'pow', sign: 'sign', sin: 'sin',
  sinh: 'sinh', sqrt: 'sqrt', tan: 'tan', tanh: 'tanh',
};

function expressionToGLSL(expression: string, allowedSymbols: Set<string>): string {
  let root: any;
  try {
    root = parse(expression);
  } catch (error) {
    throw new Error(`Could not parse expression: ${error instanceof Error ? error.message : String(error)}`);
  }

  const compile = (node: any): string => {
    switch (node.type) {
      case 'ConstantNode': {
        if (typeof node.value !== 'number' || !Number.isFinite(node.value)) {
          throw new Error('Only finite numeric constants are supported.');
        }
        return Number.isInteger(node.value) ? `${node.value}.0` : String(node.value);
      }
      case 'SymbolNode': {
        if (node.name === 'pi') return '3.141592653589793';
        if (node.name === 'e') return '2.718281828459045';
        if (!allowedSymbols.has(node.name)) throw new Error(`Unknown symbol "${node.name}".`);
        return node.name;
      }
      case 'ParenthesisNode':
        return `(${compile(node.content)})`;
      case 'OperatorNode': {
        const args = node.args.map(compile);
        if (node.fn?.name === 'unaryMinus') return `(-${args[0]})`;
        if (node.fn?.name === 'unaryPlus') return `(${args[0]})`;
        if (node.op === '^') return `pow(${args[0]}, ${args[1]})`;
        if (['+', '-', '*', '/'].includes(node.op)) return `(${args.join(` ${node.op} `)})`;
        throw new Error(`Operator "${node.op}" is not supported.`);
      }
      case 'FunctionNode': {
        const functionName = node.fn?.name;
        const glslName = GLSL_FUNCTIONS[functionName];
        if (!glslName) throw new Error(`Function "${functionName}" is not supported.`);
        return `${glslName}(${node.args.map(compile).join(', ')})`;
      }
      default:
        throw new Error(`Expression element "${node.type}" is not supported.`);
    }
  };

  return compile(root);
}

function validateFields(fields: PDE2DField[]): void {
  if (fields.length < 1 || fields.length > 4) throw new Error('Add between one and four fields.');
  const names = new Set<string>();
  const reserved = new Set([
    'x', 'y', 't', 'pi', 'e', 'dx', 'dy', 'center', 'left', 'right', 'top', 'bottom',
    'bottomLeft', 'bottomRight', 'topLeft', 'topRight', 'size', 'texel', 'rhs', 'edge',
    'textureCoords', 'textureSource', 'fragColor', 'xMin', 'xMax', 'yMin', 'yMax',
    'dirichletValue', 'selectedChannel', 'colorMin', 'colorMax', 'state', 'scaled', 'value',
    ...Object.keys(GLSL_FUNCTIONS),
  ]);
  for (const field of fields) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field.name)) {
      throw new Error(`"${field.name}" is not a valid field name.`);
    }
    if (reserved.has(field.name) || names.has(field.name)) {
      throw new Error(`Field name "${field.name}" is reserved or duplicated.`);
    }
    names.add(field.name);
  }
  const derivativeSymbols = new Set(fields.flatMap(({ name }) => ['x', 'y', 'xx', 'yy', 'xy'].map(suffix => `${name}_${suffix}`)));
  for (const name of names) {
    if (derivativeSymbols.has(name)) throw new Error(`Field name "${name}" conflicts with a derivative name.`);
  }
  for (const name of derivativeSymbols) {
    if (names.has(name)) throw new Error(`Derivative name "${name}" conflicts with a field name.`);
  }
}

function validateDomain(domain: PDE2DDomain): void {
  if (![domain.xMin, domain.xMax, domain.yMin, domain.yMax].every(Number.isFinite)) {
    throw new Error('Grid bounds must be finite numbers.');
  }
  if (domain.xMax <= domain.xMin || domain.yMax <= domain.yMin) {
    throw new Error('Each maximum grid bound must be greater than its minimum.');
  }
}

function derivativeNames(fields: PDE2DField[]): Set<string> {
  const symbols = new Set(['x', 'y', 't', 'pi', 'e']);
  for (const { name } of fields) {
    symbols.add(name);
    for (const suffix of ['x', 'y', 'xx', 'yy', 'xy']) symbols.add(`${name}_${suffix}`);
  }
  return symbols;
}

function generateUpdateShader(fields: PDE2DField[]): string {
  validateFields(fields);
  const symbols = derivativeNames(fields);
  const declarations = fields.map((field, index) => {
    const channel = CHANNELS[index];
    return `
      float ${field.name} = center.${channel};
      float ${field.name}_x = (right.${channel} - left.${channel}) / (2.0 * dx);
      float ${field.name}_y = (top.${channel} - bottom.${channel}) / (2.0 * dy);
      float ${field.name}_xx = (right.${channel} - 2.0 * center.${channel} + left.${channel}) / (dx * dx);
      float ${field.name}_yy = (top.${channel} - 2.0 * center.${channel} + bottom.${channel}) / (dy * dy);
      float ${field.name}_xy = (topRight.${channel} - topLeft.${channel} - bottomRight.${channel} + bottomLeft.${channel}) / (4.0 * dx * dy);
    `;
  }).join('\n');
  const rightHandSides = fields.map(field => expressionToGLSL(field.rhs, symbols));
  const result = [...rightHandSides, ...Array(4 - rightHandSides.length).fill('0.0')];

  return `#version 300 es
    precision highp float;
    precision highp sampler2D;
    in vec2 textureCoords;
    uniform sampler2D textureSource;
    uniform float dt;
    uniform float dx;
    uniform float dy;
    uniform float t;
    uniform float xMin;
    uniform float xMax;
    uniform float yMin;
    uniform float yMax;
    uniform float dirichletValue;
    uniform float enforceDirichlet;
    out vec4 fragColor;
    void main() {
      ivec2 size = textureSize(textureSource, 0);
      vec2 texel = 1.0 / vec2(size);
      vec4 center = texture(textureSource, textureCoords);
      vec4 left = texture(textureSource, textureCoords - vec2(texel.x, 0.0));
      vec4 right = texture(textureSource, textureCoords + vec2(texel.x, 0.0));
      vec4 bottom = texture(textureSource, textureCoords - vec2(0.0, texel.y));
      vec4 top = texture(textureSource, textureCoords + vec2(0.0, texel.y));
      vec4 bottomLeft = texture(textureSource, textureCoords - texel);
      vec4 bottomRight = texture(textureSource, textureCoords + vec2(texel.x, -texel.y));
      vec4 topLeft = texture(textureSource, textureCoords + vec2(-texel.x, texel.y));
      vec4 topRight = texture(textureSource, textureCoords + texel);
      float x = mix(xMin, xMax, textureCoords.x);
      float y = mix(yMin, yMax, textureCoords.y);
      ${declarations}
      vec4 rhs = vec4(${result.join(', ')});
      bool edge = textureCoords.x <= 0.5 * texel.x || textureCoords.x >= 1.0 - 0.5 * texel.x || textureCoords.y <= 0.5 * texel.y || textureCoords.y >= 1.0 - 0.5 * texel.y;
      fragColor = enforceDirichlet > 0.5 && edge ? vec4(dirichletValue) : center + dt * rhs;
    }
  `;
}

const DISPLAY_FRAGMENT_SHADER = `#version 300 es
  precision highp float;
  precision highp sampler2D;
  in vec2 textureCoords;
  uniform sampler2D textureSource;
  uniform int selectedChannel;
  uniform float colorMin;
  uniform float colorMax;
  out vec4 fragColor;
  void main() {
    vec4 state = texture(textureSource, textureCoords);
    float value = selectedChannel == 0 ? state.r : selectedChannel == 1 ? state.g : selectedChannel == 2 ? state.b : state.a;
    float scaled = clamp((value - colorMin) / max(colorMax - colorMin, 0.000001), 0.0, 1.0);
    vec3 low = vec3(0.10, 0.20, 0.60);
    vec3 middle = vec3(0.15, 0.72, 0.72);
    vec3 high = vec3(0.95, 0.83, 0.30);
    vec3 color = scaled < 0.5 ? mix(low, middle, scaled * 2.0) : mix(middle, high, (scaled - 0.5) * 2.0);
    fragColor = vec4(color, 1.0);
  }
`;

export class GeneralPDE2DSolver {
  private readonly gl: WebGL2RenderingContext;
  private readonly width: number;
  private readonly height: number;
  private readonly boundary: BoundaryMode;
  private readonly textures: WebGLTexture[] = [];
  private readonly framebuffers: WebGLFramebuffer[] = [];
  private readonly vertexBuffer: WebGLBuffer;
  private updateProgram: WebGLProgram | null = null;
  private displayProgram: WebGLProgram;
  private currentTexture = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number, boundary: BoundaryMode) {
    const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' });
    if (!gl) throw new Error('This browser does not support WebGL2.');
    if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('This GPU does not support floating-point WebGL textures.');
    this.gl = gl;
    this.width = width;
    this.height = height;
    this.boundary = boundary;
    canvas.width = width;
    canvas.height = height;
    this.vertexBuffer = this.createQuadBuffer();
    this.displayProgram = this.createProgram(DISPLAY_FRAGMENT_SHADER);
    this.createStateBuffers();
  }

  setEquations(fields: PDE2DField[]): void {
    validateFields(fields);
    const source = generateUpdateShader(fields);
    const nextProgram = this.createProgram(source);
    if (this.updateProgram) this.gl.deleteProgram(this.updateProgram);
    this.updateProgram = nextProgram;
  }

  setInitialState(fields: PDE2DField[], domain: PDE2DDomain): void {
    validateFields(fields);
    validateDomain(domain);
    const symbols = new Set(['x', 'y', 'pi', 'e']);
    const initializers = fields.map(field => {
      expressionToGLSL(field.initial, symbols);
      return parse(field.initial).compile();
    });
    const values = new Float32Array(this.width * this.height * 4);
    for (let row = 0; row < this.height; row++) {
      const y = domain.yMin + (row / Math.max(1, this.height - 1)) * (domain.yMax - domain.yMin);
      for (let column = 0; column < this.width; column++) {
        const x = domain.xMin + (column / Math.max(1, this.width - 1)) * (domain.xMax - domain.xMin);
        const offset = (row * this.width + column) * 4;
        initializers.forEach((expression, index) => {
          const value = expression.evaluate({ x, y, pi: Math.PI, e: Math.E });
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`Initial condition for ${fields[index].name} is not finite at (${x.toFixed(3)}, ${y.toFixed(3)}).`);
          }
          values[offset + index] = value;
        });
      }
    }
    const gl = this.gl;
    for (const texture of this.textures) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.width, this.height, gl.RGBA, gl.FLOAT, values);
    }
    this.currentTexture = 0;
  }

  advance(dt: number, domain: PDE2DDomain, time: number): void {
    if (!this.updateProgram) throw new Error('Apply valid equations before starting the simulation.');
    const gl = this.gl;
    const target = 1 - this.currentTexture;
    const program = this.updateProgram;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[target]);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(program);
    this.bindQuad(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
    this.set1i(program, 'textureSource', 0);
    this.set1f(program, 'dt', dt);
    this.set1f(program, 'dx', (domain.xMax - domain.xMin) / Math.max(1, this.width - 1));
    this.set1f(program, 'dy', (domain.yMax - domain.yMin) / Math.max(1, this.height - 1));
    this.set1f(program, 't', time);
    this.set1f(program, 'xMin', domain.xMin);
    this.set1f(program, 'xMax', domain.xMax);
    this.set1f(program, 'yMin', domain.yMin);
    this.set1f(program, 'yMax', domain.yMax);
    this.set1f(program, 'dirichletValue', 0);
    this.set1f(program, 'enforceDirichlet', this.boundary === 'dirichlet' ? 1 : 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    this.currentTexture = target;
  }

  render(channel: number, colorMin: number, colorMax: number): void {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.displayProgram);
    this.bindQuad(this.displayProgram);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTexture]);
    this.set1i(this.displayProgram, 'textureSource', 0);
    this.set1i(this.displayProgram, 'selectedChannel', channel);
    this.set1f(this.displayProgram, 'colorMin', colorMin);
    this.set1f(this.displayProgram, 'colorMax', colorMax);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose(): void {
    const gl = this.gl;
    this.textures.forEach(texture => gl.deleteTexture(texture));
    this.framebuffers.forEach(framebuffer => gl.deleteFramebuffer(framebuffer));
    if (this.updateProgram) gl.deleteProgram(this.updateProgram);
    gl.deleteProgram(this.displayProgram);
    gl.deleteBuffer(this.vertexBuffer);
  }

  private createStateBuffers(): void {
    const gl = this.gl;
    for (let index = 0; index < 2; index++) {
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      if (!texture || !framebuffer) throw new Error('Could not allocate GPU state buffers.');
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      const wrap = this.boundary === 'periodic' ? gl.REPEAT : gl.CLAMP_TO_EDGE;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
        throw new Error('GPU could not create a floating-point simulation grid.');
      }
      this.textures.push(texture);
      this.framebuffers.push(framebuffer);
    }
  }

  private createQuadBuffer(): WebGLBuffer {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Could not allocate GPU rendering geometry.');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1,
    ]), gl.STATIC_DRAW);
    return buffer;
  }

  private createProgram(fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    const vertex = this.compileShader(gl.VERTEX_SHADER, genericVertexShader());
    const fragment = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!program) throw new Error('Could not allocate a WebGL program.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'position');
    gl.bindAttribLocation(program, 1, 'uv');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'Unknown WebGL program link error.';
      gl.deleteProgram(program);
      throw new Error(message);
    }
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Could not allocate a WebGL shader.');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'Unknown WebGL shader compile error.';
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  private bindQuad(program: WebGLProgram): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    const position = gl.getAttribLocation(program, 'position');
    const uv = gl.getAttribLocation(program, 'uv');
    if (position >= 0) {
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
    }
    if (uv >= 0) {
      gl.enableVertexAttribArray(uv);
      gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 16, 8);
    }
  }

  private set1f(program: WebGLProgram, name: string, value: number): void {
    const location = this.gl.getUniformLocation(program, name);
    if (location) this.gl.uniform1f(location, value);
  }

  private set1i(program: WebGLProgram, name: string, value: number): void {
    const location = this.gl.getUniformLocation(program, name);
    if (location) this.gl.uniform1i(location, value);
  }
}
