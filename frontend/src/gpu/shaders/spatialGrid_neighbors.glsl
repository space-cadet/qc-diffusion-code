#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform ivec2 u_texSize;
uniform int u_particle_count;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;

in vec2 v_uv;
out vec4 fragColor;

vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

ivec2 getGridCell(vec2 pos) {
  vec2 relPos = pos - u_bounds_min;
  return ivec2(floor(relPos / u_cell_size));
}

// Bounds clamping helper kept in TS side; this shader only encodes cell and idx
void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int particleIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (particleIdx >= u_particle_count) {
    fragColor = vec4(-1.0, -1.0, -1.0, -1.0);
    return;
  }

  vec2 uv = indexToUV(particleIdx, u_texSize);
  vec2 pos = texture(u_position, uv).xy;
  ivec2 gridCell = getGridCell(pos);
  fragColor = vec4(float(gridCell.x), float(gridCell.y), float(particleIdx), 1.0);
}
