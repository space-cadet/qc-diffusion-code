#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_cell_offsets;     // 1-channel tex (prefix sums), length = gridCells+1
uniform sampler2D u_particle_indices; // 1-channel tex (particle ids), length = particleCount
uniform ivec2 u_texSize;              // state texture size (position/velocity)
uniform ivec2 u_offsetsTexSize;       // texture size for offsets buffer
uniform ivec2 u_indicesTexSize;       // texture size for indices buffer
uniform ivec2 u_gridSize;             // grid width/height
uniform int u_particle_count;
uniform float u_radius;
uniform float u_alpha;                // threshold scale
uniform float u_current_time;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;
uniform int u_is1D;                   // 1 for 1D collisions (skip dy != 0)

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

ivec2 clampCell(ivec2 cell) {
  vec2 gridSizeF = (u_bounds_max - u_bounds_min) / u_cell_size;
  int gx = int(max(1.0, floor(gridSizeF.x)));
  int gy = int(max(1.0, floor(gridSizeF.y)));
  ivec2 gridSize = ivec2(gx, gy);
  ivec2 minC = ivec2(0, 0);
  ivec2 maxC = gridSize - ivec2(1, 1);
  return ivec2(clamp(cell.x, minC.x, maxC.x), clamp(cell.y, minC.y, maxC.y));
}

// Read a 1D float from a packed 2D texture (single-channel)
float tex1D(sampler2D tex, int index, ivec2 texSize) {
  vec2 uv = indexToUV(index, texSize);
  return texture(tex, uv).x;
}

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int selfIdx = texCoords.y * u_texSize.x + texCoords.x;
  if (selfIdx >= u_particle_count) { fragColor = vec4(0.0); return; }

  vec2 pos = texture(u_position, v_uv).xy;
  vec2 vel = texture(u_velocity, v_uv).xy;

  ivec2 myCell = clampCell(getGridCell(pos));
  vec2 newVel = vel;
  float collisionTime = 0.0;

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

          // overlap correction path (store time+overlap)
          float overlap = (2.0 * u_radius) - dist;
          if (overlap > 0.0) {
            fragColor = vec4(vel - rel * n, u_current_time, overlap);
            return;
          }

          vec2 impulse = rel * n;
          newVel = vel - impulse;
          collisionTime = u_current_time;
          fragColor = vec4(newVel, collisionTime, 1.0);
          return; // one collision per frame
        }
      }
    }
  }

  fragColor = vec4(newVel, collisionTime, 1.0);
}
