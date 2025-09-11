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

  vec2 newVelocity = velocity;

  if (u_boundary_condition == 1) {
    // Reflective: if the tentative step would cross a boundary, flip corresponding velocity component
    vec2 tentative = position + velocity * u_dt;
    if (tentative.x < u_bounds_min.x || tentative.x > u_bounds_max.x) {
      newVelocity.x = -newVelocity.x;
    }
    if (tentative.y < u_bounds_min.y || tentative.y > u_bounds_max.y) {
      newVelocity.y = -newVelocity.y;
    }
  } else if (u_boundary_condition == 2) {
    // Absorbing: if outside bounds, zero velocity
    bool dead = (position.x < u_bounds_min.x) || (position.x > u_bounds_max.x) ||
                (position.y < u_bounds_min.y) || (position.y > u_bounds_max.y);
    if (dead) {
      newVelocity = vec2(0.0);
    }
  }

  fragColor = vec4(newVelocity, 0.0, 1.0);
}
