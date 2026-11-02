// Upscales the 480x270 frame to the window. WebGL2 path adds an optional CRT pass;
// falls back to a nearest-neighbour Canvas2D blit when WebGL2 is unavailable.
const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;

const FS = `#version 300 es
precision mediump float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform vec2 res; uniform float crt; uniform vec2 src;
void main(){
  vec2 q = uv;
  if (crt > 0.5) {
    vec2 c = q - 0.5; q = 0.5 + c * (1.0 + 0.035 * dot(c, c));
    if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) { o = vec4(0,0,0,1); return; }
  }
  vec2 texel = q * src;
  vec2 snap = (floor(texel) + 0.5) / src;
  vec3 col = texture(tex, snap).rgb;
  // bloom: gather bright neighbours on two rings
  vec3 glow = vec3(0.0);
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5236;
    vec2 d = vec2(cos(a), sin(a));
    vec3 s1 = texture(tex, q + d * 3.0 / src).rgb;
    vec3 s2 = texture(tex, q + d * 7.0 / src).rgb;
    glow += max(s1 - 0.62, 0.0) + max(s2 - 0.62, 0.0) * 0.6;
  }
  col += glow * 0.11;
  if (crt > 0.5) {
    float line = 0.86 + 0.14 * sin(fract(texel.y * 0.5) * 3.14159);
    float mask = 0.94 + 0.06 * sin(gl_FragCoord.x * 2.094);
    vec2 v = q * (1.0 - q);
    float vig = clamp(pow(v.x * v.y * 18.0, 0.18), 0.0, 1.0);
    col *= line * mask * vig * 1.08;
  }
  o = vec4(col, 1.0);
}`;

export interface Presenter { draw(src: HTMLCanvasElement): void; resize(): void; mode: 'webgl2' | 'canvas2d'; crt: boolean }

export function createPresenter(out: HTMLCanvasElement, forceCanvas = false): Presenter {
  const gl = forceCanvas ? null : out.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const s = Math.min(w / 480, h / 270);
    const cw = Math.floor(480 * s);
    const ch = Math.floor(270 * s);
    out.style.width = `${cw}px`;
    out.style.height = `${ch}px`;
    out.width = Math.floor(cw * dpr);
    out.height = Math.floor(ch * dpr);
  };
  fit();
  if (!gl) {
    const ctx = out.getContext('2d')!;
    return {
      mode: 'canvas2d',
      crt: false,
      resize: fit,
      draw(src) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(src, 0, 0, out.width, out.height);
      },
    };
  }
  const sh = (type: number, code: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, code);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uRes = gl.getUniformLocation(prog, 'res');
  const uCrt = gl.getUniformLocation(prog, 'crt');
  const uSrc = gl.getUniformLocation(prog, 'src');
  const p: Presenter = {
    mode: 'webgl2',
    crt: true,
    resize: fit,
    draw(src) {
      gl.viewport(0, 0, out.width, out.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.uniform2f(uRes, out.width, out.height);
      gl.uniform2f(uSrc, src.width, src.height);
      gl.uniform1f(uCrt, p.crt ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
  return p;
}
