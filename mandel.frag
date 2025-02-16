#ifdef GL_ES
precision mediump float;
#endif

uniform vec2  u_resolution; // Viewport resolution
uniform float u_time;       // Shader playback time
uniform vec2  u_mouse;      // Mouse coordinates (for zoom and pan)

#define MAX_ITER 256 // Maximum number of iterations

float nextZoom = 4.0;

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y; // Aspect ratio correction

    vec2 cSize = vec2(5.0, 5.0);

    vec2 c = uv * cSize;

    // Zoom and pan using mouse interaction
    vec2 pan = vec2(((u_mouse.x / u_resolution.x) - 1.0) * cSize.x, ((u_mouse.y / u_resolution.y) - 1.0) * cSize.y); // Left-right pan

    c = uv / nextZoom;

    // Mandelbrot iteration
    vec2 z = vec2(0, 0);

    int iter;

    for (iter = 0; iter < MAX_ITER; iter++) {
        z += pan;
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;

        if (dot(z, z) > 4.0) {
            break;
        }
    }

    float colorFactor = float(iter) / float(MAX_ITER);
    vec3 color = vec3(colorFactor);

    gl_FragColor = vec4(color, 1.0);
}