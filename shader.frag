#ifdef GL_ES
precision mediump float;
#endif

uniform int u_frame;
uniform float u_time;
uniform float u_delta;
uniform vec4 u_date;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

#define MAX_STEPS 2000
#define MAX_DIST 2000.0
#define MAX_BOUNCES 3
#define SURF_DIST 0.001
#define PI 3.14159265359

// Function to create a rotation matrix
mat4 rotateY(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(c, 0.0, s, 0.0,
                0.0, 1.0, 0.0, 0.0,
                -s, 0.0, c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}

mat4 rotateX(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(1.0, 0.0, 0.0, 0.0,
                0.0, c, -s, 0.0,
                0.0, s, c, 0.0,
                0.0, 0.0, 0.0, 1.0);
}

mat4 rotateXW(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat4(1.0, 0.0, 0.0, 0.0,
    0.0, c, 0.0, -s,
    0.0, 0.0, 1, 0.0,
    0.0, s, 0, c);
}

float sdf(vec3 p) {
    vec4 center = vec4(0, 0, 0, 1.0);

    // for purposes of rotation/translation in 4d space using 5d linear transformations
    float x = p.x;
    float y = p.y;
    float z = p.z;
    float w1 = 1;
    float w2 = 1;

    float r = 0.9;

    return sqrt(pow(x - center.x, 2) + pow(y - center.y, 2) + pow(z - center.z, 2) + pow(w1 - center.w, 2) + pow(w2 - 1, 2)) - r;
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
vec4 rayMarch(vec4 ro, vec4 rd) {
    float dO = 0.0; // Total distance traveled

    vec4 p = vec4(0);

    for (int i = 0; i < MAX_STEPS; i++) {
        vec4 p = ro + dO * rd; // Compute current position

        float dS = sdf(vec3(p.x, p.y, p.z));     // Distance to the nearest surface

        // If close enough to the surface, stop
        if (dS < SURF_DIST) {
            return vec4(p.x, p.y, p.z, dO);
        }

        // If too far, return max
        if (dO > MAX_DIST) {
            return vec4(p.x, p.y, p.z, MAX_DIST);
        }

        dO += dS;
    }

    return vec4(p.x, p.y, p.z, MAX_DIST);
}

vec4 intersectRayPlane(vec3 rayOrigin, vec3 rayDir, vec4 plane) {
    // Unpack plane coefficients
    vec3 planeNormal = plane.xyz;
    float planeD = plane.w;

    // Compute denominator
    float denom = dot(planeNormal, rayDir);

    // Avoid division by zero (parallel case)
    if (abs(denom) < 1e-6) {
        return vec4(0.0, 0.0, 0.0, 0.0);
    }

    // Compute intersection t
    float t = (dot(planeNormal, rayOrigin) + planeD) / denom;

    // Compute intersection point
    vec3 result = rayOrigin + t * rayDir;

    return vec4(result.x, result.y, result.z, t);
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 mouseNorm = (u_mouse.xy / u_resolution.xy) * 2.0 - 1.0;
    float yaw = mouseNorm.x * PI / 2;
    float pitch = mouseNorm.y * PI / 2;

    vec4 ro = vec4(0, 0, -4.0, 1.0);
    mat4 rotY = rotateY(yaw);
    mat4 rotX = rotateX(pitch);
    ro = rotY * rotX * ro;

    vec4 rd = normalize(rotY * rotX * vec4(uv, 1.0, 1.0));

    vec4 lo = rotY * rotX * vec4(0, 0, -4.0, 1.0);
    vec4 ld = normalize(vec4(0, 0, -1.0, 0.0));

    vec4 t = rayMarch(ro, rd);

    vec3 skyColor = vec3(0.1, 0.1, 1);
    vec3 floorColor1 = vec3(0.9, 0.3, 0.4);
    vec3 floorColor2 = vec3(0.2, 0.4, 0.6);
    vec3 sphereColor = vec3(1, 0.1, 0.1);
    vec3 finalColor = skyColor;
    vec4 floorPlane = vec4(0, 1, 0, -4);

    // Reflection loop
    float reflectionStrength = 0.6;
    vec4 hitPoint;
    vec4 reflectionRay = rd;
    vec4 reflectionOrigin = ro;

    for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
        vec4 t = rayMarch(reflectionOrigin, reflectionRay);
        if (t.w < MAX_DIST) {
            hitPoint = vec4(t.xyz, 1.0);
            vec3 normal = getNormal(hitPoint.xyz, 0.001);

            // Direct lighting
            float diff = max(dot(normal, ld.xyz), 0.0);
            vec3 lightColor = sphereColor * diff + 0.1;

            // Specular reflection
            reflectionRay = vec4(reflect(reflectionRay.xyz, normal), 1.0);
            reflectionOrigin = hitPoint + vec4(reflectionRay.xyz * 0.01, 1.0); // Avoid self-intersection

            finalColor = mix(finalColor, lightColor, reflectionStrength);
            reflectionStrength *= 0.5; // Reduce reflection intensity
        } else {
            vec4 i = intersectRayPlane(reflectionOrigin.xyz, reflectionRay.xyz, floorPlane);
            if (i.w > 0) {
                float fx = abs(i.x - ro.x) * 0.25;
                float fz = abs(i.z - ro.z) * 0.25;

                if (mod(floor(fz), 2.0) == 0) {
                    finalColor = (mod(floor(fx), 2.0) == 0) ? floorColor1 : floorColor2;
                } else {
                    finalColor = (mod(floor(fx), 2.0) == 0) ? floorColor2 : floorColor1;
                }

                break;
            }

        }
    }

    gl_FragColor = vec4(finalColor, 1.0);
}

