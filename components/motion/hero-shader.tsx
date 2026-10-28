"use client";
// Fundo animado do banner: shader WebGL leve (~3 KB), carregado só na Home.
// Alternativa estática (gradiente CSS) quando não há WebGL, com «reduzir movimento»
// ou quando o separador está escondido. Pausa fora do ecrã para poupar bateria.
import { useEffect, useRef, useState } from "react";

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
uniform vec2 r;uniform float t;uniform vec3 c1;uniform vec3 c2;uniform vec3 c3;uniform float dark;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec2 p=uv*vec2(r.x/r.y,1.)*1.6;
float q=fbm(p+t*.04);float w=fbm(p+q*1.8+vec2(t*.05,-t*.03));
vec3 col=mix(c1,c2,smoothstep(.25,.75,w));col=mix(col,c3,smoothstep(.55,.95,fbm(p*1.3-t*.02+w)));
float vig=smoothstep(1.25,.2,length(uv-vec2(.62,.45)));
vec3 bg=mix(vec3(.97,.975,.985),vec3(.027,.043,.078),dark);
gl_FragColor=vec4(mix(bg,col,.55*vig+.08),1.);}`;

const hex = (h: string) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export default function HeroShader({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setFailed(true);
    // Poupança de dados, pouca memória ou poucos núcleos: fica a alternativa estática.
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData || (nav.deviceMemory ?? 8) < 4 || (nav.hardwareConcurrency ?? 8) < 4) return setFailed(true);
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    // Só arranca depois de o conteúdo estar pintado e o browser estar livre (não atrasa o LCP).
    const start = () => { if (!cancelled) cleanup = init(canvas); };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: object) => number }).requestIdleCallback;
    const t = setTimeout(() => (ric ? ric(start, { timeout: 3000 }) : start()), 1800);
    return () => { cancelled = true; clearTimeout(t); cleanup?.(); };

    function init(canvas: HTMLCanvasElement): (() => void) | undefined {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) { setFailed(true); return; }
    // Renderização por software (sem GPU) é demasiado pesada: fica a alternativa estática.
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software/i.test(renderer)) { setFailed(true); return; }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setFailed(true); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const setColors = () => {
      const cs = getComputedStyle(document.documentElement);
      gl.uniform3fv(u("c1"), hex(cs.getPropertyValue("--lab").trim() || "#00cfcf"));
      gl.uniform3fv(u("c2"), hex(cs.getPropertyValue("--brand").trim() || "#036ef2"));
      gl.uniform3fv(u("c3"), hex(cs.getPropertyValue("--inc").trim() || "#ff0066"));
      gl.uniform1f(u("dark"), document.documentElement.dataset.theme === "dark" ? 1 : 0);
    };
    setColors();
    const mo = new MutationObserver(setColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const scale = Math.min(window.devicePixelRatio, 1.5) * 0.4; // resolução reduzida: suave e barato
    const resize = () => {
      canvas.width = Math.max(1, canvas.clientWidth * scale);
      canvas.height = Math.max(1, canvas.clientHeight * scale);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u("r"), canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) loop();
    });
    io.observe(canvas);
    const t0 = performance.now();
    // 30 imagens por segundo chegam para um fundo lento.
    const loop = (now = performance.now()) => {
      cancelAnimationFrame(raf);
      if (!visible || document.hidden) return;
      if (now - last > 33) {
        last = now;
        gl.uniform1f(u("t"), (now - t0) / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(loop);
    };
    const onVis = () => !document.hidden && loop();
    document.addEventListener("visibilitychange", onVis);
    canvas.style.opacity = "1";
    loop();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    }
  }, []);

  return (
    <div className={className} aria-hidden>
      {/* Alternativa estática: sempre por baixo, visível de imediato (sem atrasar o LCP). */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_75%_30%,color-mix(in_srgb,var(--lab)_35%,transparent),transparent_60%),radial-gradient(50%_70%_at_95%_80%,color-mix(in_srgb,var(--inc)_30%,transparent),transparent_60%),radial-gradient(60%_60%_at_45%_60%,color-mix(in_srgb,var(--brand)_25%,transparent),transparent_70%)]" />
      {!failed && <canvas ref={ref} className="absolute inset-0 size-full opacity-0 transition-opacity duration-1000" />}
    </div>
  );
}
