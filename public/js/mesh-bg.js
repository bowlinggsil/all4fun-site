/* <mesh-bg> — animated shader-gradient plane (ShaderGradient "defaults" look):
   3-colour noise-warped plane, grain on, rotationZ 50deg, positionX -1.4, uSpeed .4,
   uDensity 1.3, uFrequency 5.5, uAmplitude 1, uStrength 4, brightness 1.2, frameRate 10. */
(function () {
  if (window.customElements && customElements.get('mesh-bg')) return;

  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';

  const FRAG = `precision highp float;
uniform vec2 uRes; uniform float uTime, uSpeed, uDensity, uFrequency, uAmplitude, uStrength, uRotZ, uPosX, uBright, uGrain;
uniform vec3 c1, c2, c3;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
// hash21 (Dave Hoskins) - structure-free, no diagonal moire
float h21(vec2 p, float s){
  vec3 p3 = fract(vec3(p.xyx + s) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; }
  return s;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.x *= uRes.x / uRes.y;
  uv += vec2(uPosX, 0.0);
  float r = radians(uRotZ);
  vec2 rv = vec2(uv.x * cos(r) - uv.y * sin(r), uv.x * sin(r) + uv.y * cos(r));
  float t = uTime * uSpeed * 0.25;
  vec2 q = rv * uDensity * uFrequency * 0.22;
  float n = fbm(q + vec2(t, -t * 0.6));
  float m = fbm(q * 0.62 + n * uAmplitude + vec2(-t * 0.45, t * 0.32));
  float g = rv.x * 0.62 + rv.y * 0.34 + (n - 0.5) * uStrength * 0.26 + (m - 0.5) * uStrength * 0.17;
  g = clamp(g * 0.9 + 0.32, 0.0, 1.0);
  vec3 col = mix(c1, c2, smoothstep(0.0, 0.58, g));
  col = mix(col, c3, smoothstep(0.46, 1.0, g));
  col *= uBright;
  vec2 sp = gl_FragCoord.xy;
  vec3 gr = vec3(h21(sp, 0.0), h21(sp, 13.7), h21(sp, 51.3)) - 0.5;
  col += gr * uGrain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const hex = (h, fb) => {
    const s = (h || fb).trim().replace('#', '');
    const v = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
    const n = parseInt(v, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  };

  class MeshBg extends HTMLElement {
    connectedCallback() {
      if (this._cv) return;
      const cv = this._cv = document.createElement('canvas');
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;display:block;';
      this.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;display:block;';
      this.appendChild(cv);
      const gl = this._gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
      if (!gl) { this.style.background = 'linear-gradient(135deg,' + (this.getAttribute('color1') || '#6D28D9') + ',' + (this.getAttribute('color3') || '#EFE7FB') + ')'; return; }
      const sh = (type, src) => {
        const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[mesh-bg] shader', gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog); gl.useProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) console.warn('[mesh-bg] link', gl.getProgramInfoLog(prog));
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const U = n => gl.getUniformLocation(prog, n);
      const u = { res: U('uRes'), time: U('uTime'), speed: U('uSpeed'), den: U('uDensity'), freq: U('uFrequency'), amp: U('uAmplitude'), str: U('uStrength'), rot: U('uRotZ'), px: U('uPosX'), br: U('uBright'), gn: U('uGrain'), c1: U('c1'), c2: U('c2'), c3: U('c3') };
      const num = (a, d) => { const v = parseFloat(this.getAttribute(a)); return isNaN(v) ? d : v; };
      const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gl.uniform1f(u.speed, still ? 0 : num('speed', 0.4));
      gl.uniform1f(u.den, num('density', 1.3));
      gl.uniform1f(u.freq, num('frequency', 5.5));
      gl.uniform1f(u.amp, num('amplitude', 1));
      gl.uniform1f(u.str, num('strength', 4));
      gl.uniform1f(u.rot, num('rotation', 50));
      gl.uniform1f(u.px, num('position-x', -1.4) * 0.1);
      gl.uniform1f(u.br, num('brightness', 1.2) * 0.9);
      gl.uniform1f(u.gn, num('grain-strength', 0.3));
      gl.uniform3fv(u.c1, hex(this.getAttribute('color1'), '#6D28D9'));
      gl.uniform3fv(u.c2, hex(this.getAttribute('color2'), '#D7FF00'));
      gl.uniform3fv(u.c3, hex(this.getAttribute('color3'), '#EFE7FB'));
      this._resize = () => {
        const q = num('resolution', 1); // native resolution so the grain stays 1px and unpatterned
        const w = Math.max(1, Math.round(cv.clientWidth * q)), h = Math.max(1, Math.round(cv.clientHeight * q));
        cv.width = w; cv.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, w, h);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      window.addEventListener('resize', this._resize);
      this._resize();
      if (still) return;
      const fps = num('frame-rate', 24), step = 1000 / fps;
      let last = 0, t0 = performance.now();
      const loop = (now) => {
        this._raf = requestAnimationFrame(loop);
        if (now - last < step) return;
        last = now;
        gl.uniform1f(u.time, (now - t0) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      this._raf = requestAnimationFrame(loop);
    }
    disconnectedCallback() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._resize) window.removeEventListener('resize', this._resize);
      this._raf = 0;
    }
  }
  customElements.define('mesh-bg', MeshBg);
})();
