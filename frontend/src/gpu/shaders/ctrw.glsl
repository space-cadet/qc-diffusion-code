#version 300 es
precision highp float;

uniform float u_dt;
uniform sampler2D u_position;
uniform sampler2D u_velocity;
uniform sampler2D u_ctrw_state; // x: nextCollisionTime, y: random seed
uniform float u_collision_rate;
uniform float u_jump_length; // affects mean free path, not velocity magnitude
uniform float u_speed; // ballistic velocity magnitude between collisions
uniform float u_current_time;
uniform int u_is1D; // 1 for 1D, 0 for 2D
uniform vec2 u_bounds_min;
uniform vec2 u_bounds_max;
uniform int u_boundary_condition;

in vec2 v_uv;
out vec4 fragColor;

// Improved PRNG using multiple hash functions to avoid spatial correlation
float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float random(vec2 st, float seed) {
    // Use hash function with seed to avoid position-dependent patterns
    return hash(st + vec2(seed, seed * 1.618));
}

void main() {
    vec2 position = texture(u_position, v_uv).xy;
    vec2 velocity = texture(u_velocity, v_uv).xy;
    vec4 ctrwState = texture(u_ctrw_state, v_uv);
    
    float nextCollisionTime = ctrwState.x;
    float randomSeed = ctrwState.y;
    
    vec2 newVelocity = velocity;
    float newNextCollisionTime = nextCollisionTime;
    float newRandomSeed = randomSeed;
    
    // Check for collision within current timestep
    float timeToCollision = nextCollisionTime - u_current_time;
    bool collisionOccurs = (timeToCollision >= 0.0 && timeToCollision <= u_dt);
    
    if (collisionOccurs) {
        // Update random seed for next collision
        newRandomSeed = fract(randomSeed + 0.61803398875); // golden ratio for good distribution
        
        // Generate new collision time using proper exponential distribution
        float r1 = random(position, newRandomSeed);
        // Clamp more conservatively to avoid distribution bias
        r1 = clamp(r1, 1e-7, 1.0 - 1e-7);
        newNextCollisionTime = u_current_time + u_dt + (-log(r1) / u_collision_rate);
        
        // Preserve current speed magnitude for ballistic motion
        float currentSpeed = length(velocity);
        // Use u_speed only if current velocity is zero (initialization case)
        float ballistic_speed = (currentSpeed > 0.0) ? currentSpeed : u_speed;
        
        // Generate new direction with proper speed scaling
        float r2 = random(position, newRandomSeed + 1.0);
        
        if (u_is1D == 1) {
            // 1D: choose +1 or -1 direction, preserve speed magnitude
            newVelocity.x = (r2 < 0.5) ? ballistic_speed : -ballistic_speed;
            newVelocity.y = 0.0;
        } else {
            // 2D: random angle, preserve speed magnitude
            float angle = r2 * 2.0 * 3.14159265359;
            newVelocity.x = ballistic_speed * cos(angle);
            newVelocity.y = ballistic_speed * sin(angle);
        }
    } else {
        // Ballistic motion: maintain current velocity between collisions
        // No velocity change - position integration handled in position shader
        newVelocity = velocity;
    }
    
    // Output combined velocity and state for extraction
    fragColor = vec4(newVelocity.x, newVelocity.y, newNextCollisionTime, newRandomSeed);
}
