#version 300 es
precision highp float;

uniform float u_dt;
uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform int u_boundary_condition; // 0: periodic, 1: reflective, 2: absorbing

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 position = texture(u_position, v_uv).xy;
  vec2 velocity = texture(u_velocity, v_uv).xy;
  
  vec2 newPosition = position + velocity * u_dt;

  // Boundary Conditions
  if (u_boundary_condition == 0) { // Periodic
    if (newPosition.x < u_bounds_min.x) { newPosition.x += (u_bounds_max.x - u_bounds_min.x); }
    if (newPosition.x > u_bounds_max.x) { newPosition.x -= (u_bounds_max.x - u_bounds_min.x); }
    if (newPosition.y < u_bounds_min.y) { newPosition.y += (u_bounds_max.y - u_bounds_min.y); }
    if (newPosition.y > u_bounds_max.y) { newPosition.y -= (u_bounds_max.y - u_bounds_min.y); }
  } else if (u_boundary_condition == 1) { // Reflective
    // Clamp position to bounds; velocity flip is handled in a separate pass
    newPosition.x = clamp(newPosition.x, u_bounds_min.x, u_bounds_max.x);
    newPosition.y = clamp(newPosition.y, u_bounds_min.y, u_bounds_max.y);
  } else if (u_boundary_condition == 2) { // Absorbing (remove)
    // Mark particle as removed by moving it just outside bounds; sync step will skip rendering
    bool crossed = (newPosition.x < u_bounds_min.x) || (newPosition.x > u_bounds_max.x) ||
                   (newPosition.y < u_bounds_min.y) || (newPosition.y > u_bounds_max.y);
    if (crossed) {
      newPosition = vec2(u_bounds_min.x - 1.0, u_bounds_min.y - 1.0);
    }
  }
  
  fragColor = vec4(newPosition, 0.0, 1.0);
}
