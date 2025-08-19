// generic_shaders.js

export function genericVertexShader() {
    return `#version 300 es
    in vec2 position;
    in vec2 uv;
    out vec2 textureCoords;
    
    void main() {      
        textureCoords = uv;
        gl_Position = vec4(position, 0.0, 1.0);
    }`
}