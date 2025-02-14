#extension GL_ARB_gpu_shader_fp64: enable

uniform vec2  u_resolution; // Viewport resolution
uniform float u_time;       // Shader playback time
uniform vec2  u_mouse;      // Mouse coordinates (for zoom and pan)

#define MAX_ITER 256 // Maximum number of iterations

double nextZoom = 1.0;

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    nextZoom = nextZoom + exp(u_time);

    // Map screen coordinates to Mandelbrot space
    dvec2 c = dvec2(-0.812223315621338, -0.185453926110785) + uv / nextZoom; // Scale and translate based on center

    // Mandelbrot iteration
    dvec2 z = dvec2(0.0);
    int iter;

    for (iter = 0; iter < MAX_ITER; iter++) {
        z = dvec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 100) break; // Escape condition
    }

    // Smooth color based on iterations
    double colorFactor = double(iter) / double(MAX_ITER);
    dvec3 color = dvec3(colorFactor, colorFactor * 0.5, 1.0 - colorFactor);

    gl_FragColor = dvec4(color, 1.0);
}