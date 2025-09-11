#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform ivec2 u_gridSize;
uniform int u_particle_count;
uniform float u_radius;
uniform float u_alpha;
uniform int u_is1D;
uniform sampler2D u_cell_offsets;
uniform sampler2D u_particle_indices;
uniform ivec2 u_offsetsTexSize;
uniform ivec2 u_indicesTexSize;
uniform ivec2 u_texSize;
uniform float u_cell_size;
uniform float u_restitution;
uniform float u_current_time;

in vec2 v_uv;
out vec4 fragColor;

ivec2 clampCell(ivec2 cell) {
  return ivec2(
    clamp(cell.x, 0, u_gridSize.x - 1),
    clamp(cell.y, 0, u_gridSize.y - 1)
  );
}

ivec2 getGridCell(vec2 pos) {
  return ivec2(floor(pos / u_cell_size));
}

vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

float tex1D(sampler2D tex, int idx, ivec2 texSize) {
  vec2 uv = indexToUV(idx, texSize);
  return texture(tex, uv).r;
}

void main() {
  vec2 pos = texture(u_position, v_uv).xy;
  vec2 vel = texture(u_velocity, v_uv).xy;

  ivec2 myCell = clampCell(getGridCell(pos));
  vec2 newVel = vel;
  float collisionTime = 0.0;
  int selfIdx = int(gl_FragCoord.y) * u_texSize.x + int(gl_FragCoord.x);

  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      if (u_is1D == 1 && dy != 0) continue; // 1D: only sweep along x
      ivec2 c = clampCell(myCell + ivec2(dx, dy));
      int cellId = c.x + c.y * u_gridSize.x;
      int start = int(tex1D(u_cell_offsets, cellId, u_offsetsTexSize));
      int end   = int(tex1D(u_cell_offsets, cellId + 1, u_offsetsTexSize));

      for (int j = start; j < end; j++) {
        int candidateIdx = int(tex1D(u_particle_indices, j, u_indicesTexSize));
        if (candidateIdx == selfIdx) continue;
        if (candidateIdx < 0 || candidateIdx >= u_particle_count) continue;

        vec2 otherUV = indexToUV(candidateIdx, u_texSize);
        vec2 otherPos = texture(u_position, otherUV).xy;
        vec2 otherVel = texture(u_velocity, otherUV).xy;

        vec2 dp = pos - otherPos;
        float dist2 = dot(dp, dp);
        float thresh = 2.0 * u_radius * u_alpha;
        float collisionDist2 = thresh * thresh;
        if (dist2 > 0.0 && dist2 < collisionDist2) {
          float dist = sqrt(dist2);
          vec2 n = dp / dist;
          vec2 vrel = vel - otherVel;
          float rel = dot(vrel, n);
          if (rel >= 0.0) continue; // not approaching

          // Collision response
          newVel = vel - (1.0 + u_restitution) * rel * n;
          collisionTime = u_current_time;
        }
      }
    }
  }

  fragColor = vec4(newVel, collisionTime, 0.0);
}
