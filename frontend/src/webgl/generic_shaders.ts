// generic_shaders.js

export function genericVertexShader() {
    return `#version 300 es
    layout(location=0) in vec2 position;
    layout(location=1) in vec2 uv;
    out vec2 textureCoords;
    
    void main() {      
        textureCoords = uv;
        gl_Position = vec4(position, 0.0, 1.0);
    }`
}