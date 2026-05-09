attribute vec2 a_position;
attribute vec4 a_color;
attribute float a_size;

uniform vec2 u_resolution;
uniform float u_pointSize;

varying vec4 v_color;

void main() {
  // Convert pixel position to clip space (-1 to +1)
  vec2 clipSpace = ((a_position / u_resolution) * 2.0) - 1.0;
  
  // Flip Y so (0,0) is top-left like Canvas 2D
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
  
  // Set point size (multiply by uniform for global scaling)
  gl_PointSize = a_size * u_pointSize;
  
  v_color = a_color;
}
