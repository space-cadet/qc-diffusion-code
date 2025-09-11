#version 300 es
precision highp float;

uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_spatial_grid;
uniform ivec2 u_texSize;
uniform int u_particle_count;
uniform float u_radius;
uniform float u_current_time;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform float u_cell_size;

in vec2 v_uv;
out vec4 fragColor;

// Convert 1D index to UV coordinates
vec2 indexToUV(int idx, ivec2 texSize) {
  int x = idx % texSize.x;
  int y = idx / texSize.x;
  return (vec2(float(x), float(y)) + 0.5) / vec2(texSize);
}

// Get grid cell from position
ivec2 getGridCell(vec2 pos) {
  vec2 relPos = pos - u_bounds_min;
  return ivec2(floor(relPos / u_cell_size));
}

// Clamp a grid cell to simulation bounds
ivec2 clampCell(ivec2 cell) {
  vec2 gridSizeF = (u_bounds_max - u_bounds_min) / u_cell_size;
  ivec2 gridSize = ivec2(max(1.0, floor(gridSizeF.x)), max(1.0, floor(gridSizeF.y)));
  return clamp(cell, ivec2(0), gridSize - ivec2(1));
}

// Check if particle at given index is in target grid cell
bool isInCell(int particleIdx, ivec2 targetCell) {
  if (particleIdx >= u_particle_count) return false;
  
  vec2 gridUV = indexToUV(particleIdx, u_texSize);
  vec4 gridData = texture(u_spatial_grid, gridUV);
  
  if (gridData.z < 0.0) return false; // Invalid particle
  
  ivec2 cellCoords = ivec2(gridData.xy);
  return cellCoords == targetCell;
}

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int selfIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (selfIdx >= u_particle_count) {
    fragColor = vec4(0.0);
    return;
  }

  vec2 pos = texture(u_position, v_uv).xy;
  vec2 vel = texture(u_velocity, v_uv).xy;
  
  ivec2 myCell = getGridCell(pos);
  vec2 newVel = vel;
  float collisionTime = 0.0;
  
  // Check 3x3 neighboring cells
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      ivec2 checkCell = clampCell(myCell + ivec2(dx, dy));
      
      // Sample up to 8 particles per cell
      for (int sample = 0; sample < 8; sample++) {
        int raw = checkCell.x * 37 + checkCell.y * 73 + sample * 23;
        int candidateIdx = int(mod(abs(float(raw)), float(u_particle_count)));
        
        if (candidateIdx == selfIdx) continue;
        if (!isInCell(candidateIdx, checkCell)) continue;
        
        vec2 otherUV = indexToUV(candidateIdx, u_texSize);
        vec2 otherPos = texture(u_position, otherUV).xy;
        vec2 otherVel = texture(u_velocity, otherUV).xy;
        
        vec2 dp = pos - otherPos;
        float dist2 = dot(dp, dp);
        float collisionDist2 = (2.0 * u_radius) * (2.0 * u_radius);
        
        if (dist2 > 0.0 && dist2 < collisionDist2) {
          float dist = sqrt(dist2);
          vec2 n = dp / dist;
          
          // Check if particles are moving towards each other
          vec2 relativeVel = vel - otherVel;
          float relativeSpeed = dot(relativeVel, n);
          if (relativeSpeed >= 0.0) continue; // Non-approaching or parallel
          
          // Separate overlapping particles
          float overlap = (2.0 * u_radius) - dist;
          if (overlap > 0.0) {
            vec2 separation = n * (overlap * 0.5);
            // Store separation for position correction (using w component)
            fragColor = vec4(vel - relativeSpeed * n, u_current_time, overlap);
            return;
          }
          
          // Proper elastic collision for equal masses
          vec2 impulse = relativeSpeed * n;
          newVel = vel - impulse;
          collisionTime = u_current_time;
          
          // Handle one collision per frame
          fragColor = vec4(newVel, collisionTime, 1.0);
          return;
        }
      }
    }
  }
  
  // No collision
  fragColor = vec4(newVel, collisionTime, 1.0);
}
