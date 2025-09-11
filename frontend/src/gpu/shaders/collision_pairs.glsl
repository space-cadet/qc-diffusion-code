#version 300 es
precision highp float;

uniform sampler2D u_collision_result;
uniform ivec2 u_texSize;
uniform int u_particle_count;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  ivec2 texCoords = ivec2(gl_FragCoord.xy);
  int particleIdx = texCoords.y * u_texSize.x + texCoords.x;
  
  if (particleIdx >= u_particle_count) {
    fragColor = vec4(0.0);
    return;
  }

  vec4 collisionData = texture(u_collision_result, v_uv);
  vec2 velocity = collisionData.xy;
  float collisionTime = collisionData.z;
  float overlap = collisionData.w;
  
  fragColor = vec4(velocity, collisionTime, overlap);
}
