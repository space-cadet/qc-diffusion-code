precision mediump float;
varying vec4 v_color;

void main() {
  // Calculate distance from center of point sprite
  float dist = length(gl_PointCoord - vec2(0.5, 0.5));
  
  // Discard pixels outside the circle (soft edge)
  if (dist > 0.5) discard;
  
  // Optional: soft edge fade
  float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
  
  gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
