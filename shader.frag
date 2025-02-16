#ifdef GL_ES
precision mediump float;
#endif

uniform int   u_frame;
uniform float u_time;
uniform float u_delta;
uniform vec4  u_date;
uniform vec2  u_resolution;
uniform vec2  u_mouse;

#define MAX_STEPS 2000
#define MAX_DIST 100.0
#define SURF_DIST 0.001
#define PI 3.14159265359

// Function to create a rotation matrix
mat4 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(  c, 0.0,  -s, 0.0,
                0.0, 1.0, 0.0, 0.0,
                  s, 0.0,   c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}

mat4 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(1.0, 0.0, 0.0, 0.0,
                0.0,   c,  -s, 0.0,
                0.0,   s,   c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}

mat4 rotateXW(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(1.0, 0.0, 0.0, 0.0,
                0.0,   c, 0.0, -s,
                0.0, 0.0,  1, 0.0,
                0.0, s,  0, c);
}

vec4 center = vec4(1.0 * cos(u_time), 0, 2.0, 1.0);

float sdf(vec3 p) {

//    float x = p.x;
//    float y = p.y;
//    float z = c * p.y + 1 - s * 1.0;
//    float w1 = s * p.y + c * 1.0;
//    float w2 = 1;

//    float x = p.x * cos(u_time);
//    float y = p.y * sin(u_time - PI/2);
//    float z = p.z * cos(u_time);
//    float w1 = 1;
//    float w2 = 1;

//    float alt = sqrt(pow(x - center.x, 2)  + pow(y - center.y, 2) + pow(z - center.z, 2) + pow(w1 - center.w, 2) + pow(w2 - 1, 2));
//    return alt - 1.1;

    return length(vec4(sin(pow(p.x * 0.001, 2.1)), sin(pow(p.y * 0.001, 2.1)), cos(p.z), 1.0) - center) - 1.2 ; // Sphere of radius 1 at origin
}

// Function to compute the normal from an SDF
vec3 getNormal(vec3 p, float epsilon) {
    vec2 e = vec2(epsilon, 0.0);

    return normalize(vec3(
        sdf(p + e.xyy) - sdf(p - e.xyy),
        sdf(p + e.yxy) - sdf(p - e.yxy),
        sdf(p + e.yyx) - sdf(p - e.yyx)
    ));
}

// Raymarching function
float rayMarch(vec4 ro, vec4 rd) {

    float dO = 0.0; // Total distance traveled

    for (int i = 0; i < MAX_STEPS; i++) {
        vec4 p = ro + dO * rd; // Compute current position
        float dS = sdf(vec3(p.x, p.y, p.z));     // Distance to the nearest surface

        // If close enough to the surface, stop
        if (dS < SURF_DIST) {
            return dO;
        }

        // If too far, return max
        if (dO > MAX_DIST) {
            return MAX_DIST;
        }

        dO += dS;
    }

    return MAX_DIST;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 mouseNorm = (u_mouse.xy / u_resolution.xy) * 2.0 - 1.0;
    float yaw = mouseNorm.x * PI ;
    float pitch = mouseNorm.y * PI;

    center = center + vec4(0.1, -0.5, 0, 0.0);

    vec4 ro = vec4(0.0, 0.0, -3.0, 1.0);
    mat4 rotY = rotateY(yaw);
    mat4 rotX = rotateX(pitch);

    ro +=  u_time * vec4(1, 1, 1, 0);
    // ro = rotY * rotX * ro;

    vec4 rd = normalize(rotY * rotX * vec4(uv, 1.0, 1.0)); // Rotate the view direction

    float t = rayMarch(ro, rd);

    vec3 backgroundColor = vec3(0.9, 0.7, 0.4);
    vec3 sphereColor = vec3(0.4, 0.6, 1.0);
    vec4 lightDir = normalize(rotY * rotX * vec4(0, 0, -3.0, 1));

    if (t < MAX_DIST) {
        if (t > 0.0) {
            vec4 hitPoint = ro + t * rd;

            vec3 normal = getNormal(vec3(hitPoint.x, hitPoint.y, hitPoint.z), 0.001);

            float diff = max(dot(normal, vec3(lightDir.x, lightDir.y, lightDir.z)), 0.0);

            vec3 color = sphereColor * diff + 0.5;

            gl_FragColor = vec4(color.x, color.y * 0.3, color.z * 0.3, 1.0);
        }

    } else {
        gl_FragColor = vec4(backgroundColor, 1.0);
    }
}

