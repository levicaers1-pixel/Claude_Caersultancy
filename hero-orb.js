import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

const canvas = document.getElementById('hero-orb');
if (canvas) {
  const heroEl = canvas.closest('.hero');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- */
  /* Palette (matches styles.css design tokens)                        */
  /* ---------------------------------------------------------------- */
  const colorDeep   = new THREE.Color('#0A1120'); // core shadow
  const colorBase   = new THREE.Color('#2E7DAE'); // mid blue
  const colorBright = new THREE.Color('#4FB8FF'); // primary blue
  const colorHot    = new THREE.Color('#eaf7ff'); // near-white rim
  const colorAccent = new THREE.Color('#5FE3A1'); // green flecks — a nod to the data/route accent used elsewhere on the site

  /* ---------------------------------------------------------------- */
  /* Renderer / scene / camera — sized to the hero box, not the window */
  /* ---------------------------------------------------------------- */
  const getDPR = () => Math.min(window.devicePixelRatio, 2);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(getDPR());
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);

  /* ---------------------------------------------------------------- */
  /* Postprocessing — a single bloom pass for the glow                 */
  /* ---------------------------------------------------------------- */
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.18);
  const composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);
  composer.addPass(new ShaderPass(GammaCorrectionShader));

  /* ---------------------------------------------------------------- */
  /* Simplex noise (shared GLSL)                                       */
  /* ---------------------------------------------------------------- */
  const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

  /* ---------------------------------------------------------------- */
  /* Orb — displaced sphere with a plasma/fresnel shader                */
  /* ---------------------------------------------------------------- */
  const geometry = new THREE.IcosahedronGeometry(1.55, 48);

  const uniforms = {
    uTime:        { value: 0 },
    uColorDeep:   { value: colorDeep },
    uColorBase:   { value: colorBase },
    uColorBright: { value: colorBright },
    uColorHot:    { value: colorHot },
    uColorAccent: { value: colorAccent },
  };

  const vertexShader = `
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPos;
${SNOISE}
void main() {
  vec3 pos = position;
  float n = snoise(pos * 1.6 + vec3(0.0, 0.0, uTime * 0.12));
  pos += normalize(position) * n * 0.075;

  vPos = pos;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

  const fragmentShader = `
uniform float uTime;
uniform vec3 uColorDeep; uniform vec3 uColorBase; uniform vec3 uColorBright; uniform vec3 uColorHot; uniform vec3 uColorAccent;
varying vec3 vNormal; varying vec3 vViewPosition; varying vec3 vPos;
${SNOISE}
void main() {
  vec3 viewDir = normalize(vViewPosition);
  float fresnel = pow(1.0 - clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0), 2.4);

  float plasma = snoise(vPos * 2.2 + vec3(uTime * 0.22, uTime * 0.16, -uTime * 0.1));
  plasma = smoothstep(-0.5, 0.9, plasma);
  float veins = snoise(vPos * 5.0 + vec3(-uTime * 0.3, uTime * 0.22, uTime * 0.18));
  float accent = smoothstep(0.78, 0.95, veins);

  vec3 col = mix(uColorDeep, uColorBase, plasma);
  col = mix(col, uColorBright, plasma * plasma);
  col = mix(col, uColorAccent, accent * 0.35);
  col = mix(col, uColorHot, pow(fresnel, 1.3));

  float glow = 0.55 + fresnel * 0.9 + plasma * 0.25;
  gl_FragColor = vec4(col * glow, 1.0);
}
`;

  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
  const orb = new THREE.Mesh(geometry, material);
  scene.add(orb);

  /* ---------------------------------------------------------------- */
  /* Orbiting IP tags — the five mosaic service IPs, circling the core, */
  /* each a small glowing point in 3D with a screen-projected HTML     */
  /* label that links down to its card in the "Where I come in" grid.  */
  /* ---------------------------------------------------------------- */
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const IP_ORBITERS = [
    { ip: '10.0.1.1', href: '#svc-10-0-1-1', radius: 2.35, tilt: 16,  speed: 0.30, phase: 0.0,  color: colorBright },
    { ip: '10.0.2.1', href: '#svc-10-0-2-1', radius: 2.75, tilt: -22, speed: 0.22, phase: 1.3,  color: colorAccent },
    { ip: '10.0.3.1', href: '#svc-10-0-3-1', radius: 2.15, tilt: 42,  speed: 0.26, phase: 2.6,  color: colorBright },
    { ip: '10.0.4.1', href: '#svc-10-0-4-1', radius: 3.05, tilt: -6,  speed: 0.18, phase: 3.9,  color: colorAccent },
    { ip: '10.0.5.1', href: '#svc-10-0-5-1', radius: 2.5,  tilt: 8,   speed: 0.24, phase: 5.2,  color: colorBright },
  ];

  const orbiters = IP_ORBITERS.map((cfg) => {
    const spriteMat = new THREE.SpriteMaterial({
      color: cfg.color,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(0.1, 0.1, 1);
    const pivot = new THREE.Group();
    pivot.rotation.x = THREE.MathUtils.degToRad(cfg.tilt);
    pivot.rotation.z = cfg.phase;
    sprite.position.set(cfg.radius, 0, 0);
    pivot.add(sprite);
    orbitGroup.add(pivot);

    const tag = document.createElement('a');
    tag.className = 'orb-tag';
    tag.href = cfg.href;
    tag.textContent = cfg.ip;
    heroEl && heroEl.appendChild(tag);

    return { pivot, sprite, speed: cfg.speed, tag };
  });

  const worldPos = new THREE.Vector3();

  /* ---------------------------------------------------------------- */
  /* Sizing — the canvas is contained in the hero, not the viewport    */
  /* ---------------------------------------------------------------- */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(getDPR());
    renderer.setSize(w, h, false);
    composer.setPixelRatio(getDPR());
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    // Push the sphere toward the right side of the frame so the left
    // side stays clear for the headline/lede, using a small offscreen
    // camera shift rather than clipping the canvas box itself.
    // setViewOffset(fullW, fullH, x, y, w, h) renders the (w,h) window
    // starting at (x,y) within a virtual (fullW,fullH) frame. With
    // w === fullW, world-origin (normally at 50% across an unshifted
    // view) lands at canvas-fraction (0.5 - x/fullW) of the rendered
    // window — so to place it at targetFraction, x = (0.5 - targetFraction) * w.
    if (w > h) {
      const targetFraction = 0.68; // orb's horizontal position, 0=left edge, 1=right edge
      const x = (0.5 - targetFraction) * w;
      camera.setViewOffset(w, h, x, 0, w, h);
    } else {
      camera.clearViewOffset();
    }
  }

  const ro = new ResizeObserver(resize);
  if (heroEl) ro.observe(heroEl);
  else window.addEventListener('resize', resize);
  resize();

  /* ---------------------------------------------------------------- */
  /* Pointer parallax                                                   */
  /* ---------------------------------------------------------------- */
  const mouseTarget = { x: 0, y: 0 };
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseTarget.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const Lerp = (a, b, t) => a + (b - a) * t;

  /* ---------------------------------------------------------------- */
  /* Render loop                                                       */
  /* ---------------------------------------------------------------- */
  const t0 = performance.now() / 1000;

  function frame() {
    const t = performance.now() / 1000 - t0;
    uniforms.uTime.value = t;

    mouse.x = Lerp(mouse.x, mouseTarget.x, 0.04);
    mouse.y = Lerp(mouse.y, mouseTarget.y, 0.04);

    orb.rotation.y = t * 0.09 + mouse.x * 0.35;
    orb.rotation.x = mouse.y * 0.22;
    orbitGroup.rotation.y = -t * 0.05;

    orbiters.forEach((o, i) => {
      o.pivot.rotation.z = IP_ORBITERS[i].phase + t * o.speed;
    });

    composer.render();

    // Screen-project each orbiter's current world position onto the DOM
    // so its IP tag rides along with the 3D point in real time.
    const boxW = canvas.clientWidth || 1;
    const boxH = canvas.clientHeight || 1;
    orbiters.forEach((o) => {
      o.sprite.getWorldPosition(worldPos);
      const dist = worldPos.distanceTo(camera.position);
      const depthFade = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(dist, 4, 9, 1, 0.32), 0.28, 1);
      const ndc = worldPos.clone().project(camera);
      const x = (ndc.x * 0.5 + 0.5) * boxW;
      const y = (1 - (ndc.y * 0.5 + 0.5)) * boxH;
      o.tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.75 + depthFade * 0.35).toFixed(2)})`;
      o.tag.style.opacity = depthFade.toFixed(2);
    });

    if (!reduceMotion) requestAnimationFrame(frame);
  }

  if (reduceMotion) {
    frame();
  } else {
    requestAnimationFrame(frame);
  }
}
