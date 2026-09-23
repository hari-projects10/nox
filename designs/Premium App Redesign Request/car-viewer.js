/**
 * <veloce-car> — real-time 3D view of the Audi A7 Sportback (audi-a7.glb).
 *
 * One shared WebGL renderer draws every <veloce-car> on the page into its own
 * 2D canvas, so switching tabs never re-uploads the model or leaks contexts.
 *
 * Attributes:
 *   idle         present → gentle side-to-side sway
 *   view         hero | side | rear | front | headon | cabin | top  (default hero;
 *                changing it glides the camera to the new angle)
 *   paint        body colour, any CSS hex                     (default #2b2f35)
 *   accent       theme colour for the underglow and rim light  (default #EC0618)
 *   glow         0..1 underglow strength                 (default 0.2)
 *   pulse        present → underglow breathes (e.g. while charging)
 *   spin         present → slow turntable rotation
 *   interactive  present → drag to rotate
 *   reflect      present → glossy mirrored floor under the car
 *   intro        present → the car drives into frame when it first appears
 *   drive        present → wheels roll, car sways slightly
 *   flash        change the value to flash the headlights
 *   marker       node name to pin with a pulsing dot (e.g. "Brake Pad Front Left")
 *   marker-color dot colour                                   (default #f5a524)
 *   yaw          extra yaw offset in degrees
 */
(() => {
  if (customElements.get("veloce-car")) return;

  const script = document.currentScript;
  const BASE = new URL(".", script && script.src ? script.src : location.href).href;
  const CDN = "https://cdn.jsdelivr.net/npm/three@0.169.0/";
  const ACCENT = 0xec0618;

  // ---- lazy singletons ----------------------------------------------------
  let libsP, bufP, engineP;

  const getLibs = () => libsP || (libsP = Promise.all([
    import(CDN + "+esm"),
    import(CDN + "examples/jsm/loaders/GLTFLoader.js/+esm"),
    import(CDN + "examples/jsm/libs/meshopt_decoder.module.js/+esm"),
    import(CDN + "examples/jsm/environments/RoomEnvironment.js/+esm"),
  ]).then(([THREE, g, m, r]) => ({
    THREE, GLTFLoader: g.GLTFLoader, MeshoptDecoder: m.MeshoptDecoder, RoomEnvironment: r.RoomEnvironment,
  })));

  // Binary .glb when served over http(s); base64 script fallback for file://.
  const getBuffer = () => bufP || (bufP = fetch(BASE + "audi-a7.glb")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
    .catch(() => new Promise((resolve, reject) => {
      const done = () => {
        const bin = atob(window.__VELOCE_A7_GLB);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        resolve(out.buffer);
      };
      if (window.__VELOCE_A7_GLB) return done();
      const s = document.createElement("script");
      s.src = BASE + "audi-a7.glb.js";
      s.onload = done;
      s.onerror = () => reject(new Error("veloce-car: model not found"));
      document.head.appendChild(s);
    })));

  // ---- materials -----------------------------------------------------------
  function buildMaterials(THREE) {
    const P = (o) => new THREE.MeshPhysicalMaterial(o);
    const S = (o) => new THREE.MeshStandardMaterial(o);
    const glass = P({
      color: 0x05070a, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.86,
      envMapIntensity: 0.9, depthWrite: false,
    });
    const lens = P({
      color: 0x9aa4ad, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.18,
      envMapIntensity: 1.8, depthWrite: false,
    });
    return {
      paint: P({
        color: 0x2b2f35, metalness: 0.6, roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.03,
        envMapIntensity: 1.1,
      }),
      chrome: S({ color: 0xd9dde2, metalness: 1, roughness: 0.14, envMapIntensity: 1.3 }),
      satin: S({ color: 0x1b1d21, metalness: 0.25, roughness: 0.55 }),
      black: S({ color: 0x08090a, metalness: 0.2, roughness: 0.3 }),
      deepBlack: S({ color: 0x030303, metalness: 0.1, roughness: 0.22 }),
      trim: S({ color: 0x2a2d31, metalness: 0.5, roughness: 0.45 }),
      rubber: S({ color: 0x0c0c0d, metalness: 0, roughness: 0.88 }),
      rims: S({ color: 0x5b6168, metalness: 1, roughness: 0.26, envMapIntensity: 1.2 }),
      leather: S({ color: 0x1c1816, metalness: 0, roughness: 0.72 }),
      glass, lens,
      tail: S({ color: 0x3a0406, emissive: 0xff1a22, emissiveIntensity: 1.3, metalness: 0.1, roughness: 0.25 }),
      drl: S({ color: 0xffffff, emissive: 0xe9f3ff, emissiveIntensity: 1.1, metalness: 0, roughness: 0.3 }),
      laser: S({ color: 0x0a1a3a, emissive: 0x2b6bff, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.3 }),
    };
  }

  // Source materials were merged by name during optimisation; map by name + mesh.
  function pickMaterial(M, matName, meshName) {
    const n = (matName || "").trim();
    const mesh = (meshName || "").trim();
    const isLamp = /Head Lights|Big Light|Upper Light|Upper curved light/.test(mesh);
    switch (n) {
      case "Car Paint": return M.paint;
      case "Glossy": return mesh === "Side Windows" || mesh === "Front Seat" ? M.black : M.chrome;
      case "Mirror": return M.chrome;
      case "Car Back bumper": return M.satin;
      case "Interior Floor": return isLamp ? M.drl : /Brake Disk/.test(mesh) ? M.trim : M.satin;
      case "Less Glossy": return isLamp ? M.drl : M.trim;
      case "Black Material":
      case "Black Material Bottom Grill": return M.black;
      case "More Intense Black":
      case "Lights backgound": return M.deepBlack;
      case "SideMirrors Under": return M.satin;
      case "TailLights Gloss": return M.tail;
      case "TailLights Glass": return /Tail Lights|Head Lights|Big Light|Upper/.test(mesh) ? M.lens : M.glass;
      case "Seats": return M.leather;
      case "Laser": return M.laser;
      case "Rims": return M.rims;
      case "Tire": return M.rubber;
      default: return M.satin;
    }
  }

  // GLTFLoader sanitises node names ("Car Body" -> "Car_Body").
  const norm = (s) => (s || "").replace(/_/g, " ").trim();

  function radialTexture(THREE, stops) {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    stops.forEach(([o, col]) => grd.addColorStop(o, col));
    g.fillStyle = grd;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---- engine: shared renderer + scene ------------------------------------
  const getEngine = () => engineP || (engineP = Promise.all([getLibs(), getBuffer()]).then(([L, buf]) => {
    const { THREE } = L;
    const loader = new L.GLTFLoader();
    loader.setMeshoptDecoder(L.MeshoptDecoder);
    return new Promise((res, rej) => loader.parse(buf, "", (gltf) => res([L, gltf]), rej));
  }).then(([L, gltf]) => {
    const { THREE } = L;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new L.RoomEnvironment(), 0.035).texture;
    scene.environmentIntensity = 0.62;

    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(-4, 7, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(ACCENT, 0.35);
    rim.position.set(5, 2, -6);
    scene.add(rim);

    const M = buildMaterials(THREE);
    const model = gltf.scene;
    model.traverse((o) => {
      if (!o.isMesh) return;
      // Single-primitive nodes load as a Mesh, multi-primitive ones as a Group of Meshes.
      const nodeName = norm(o.parent === model ? o.name : o.parent.name);
      const src = o.material;
      o.material = pickMaterial(M, src && src.name, nodeName);
      if (o.material === M.glass || o.material === M.lens) o.renderOrder = 2;
      if (src && src.dispose) src.dispose();
    });

    // Centre on the footprint, wheels on y = 0.
    const box = new THREE.Box3().setFromObject(model);
    const c = box.getCenter(new THREE.Vector3());
    model.position.set(-c.x, -box.min.y, -c.z);
    const size = box.getSize(new THREE.Vector3());

    const pivot = new THREE.Group(); // yaw
    const body = new THREE.Group();  // sway / bob
    body.add(model);
    pivot.add(body);
    scene.add(pivot);

    // Wheels: rotate each axle about its own line so the car can roll.
    const axles = [];
    const byName = (re) => { const out = []; model.traverse((o) => { if (o !== model && re.test(norm(o.name)) && !out.some((p) => isAncestor(p, o))) out.push(o); }); return out; };
    const isAncestor = (a, b) => { for (let p = b.parent; p; p = p.parent) if (p === a) return true; return false; };
    // World matrices must include the centring offset above before measuring the wheels.
    scene.updateMatrixWorld(true);
    [/^(Rim Front|Tire Front)/, /^(Rim Back|Tire Back)/].forEach((re) => {
      const parts = byName(re);
      if (!parts.length) return;
      const wb = new THREE.Box3();
      parts.forEach((p) => wb.expandByObject(p));
      const wc = wb.getCenter(new THREE.Vector3());
      model.updateMatrixWorld(true);
      const axle = new THREE.Group();
      axle.position.copy(model.worldToLocal(wc.clone()));
      model.add(axle);
      model.updateMatrixWorld(true);
      parts.forEach((p) => axle.attach(p));
      axles.push(axle);
    });

    // Floor: soft contact shadow + red underglow, both follow the car's yaw.
    const shadowTex = radialTexture(THREE, [[0, "rgba(0,0,0,0.95)"], [0.55, "rgba(0,0,0,0.55)"], [1, "rgba(0,0,0,0)"]]);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x * 1.35, size.z * 1.12),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.004;
    shadow.renderOrder = -1;
    body.add(shadow); // the contact shadow travels with the car

    const glowTex = radialTexture(THREE, [[0, "rgba(255,255,255,0.9)"], [0.35, "rgba(255,255,255,0.32)"], [0.7, "rgba(255,255,255,0.06)"], [1, "rgba(255,255,255,0)"]]);
    const glowMat = new THREE.MeshBasicMaterial({
      map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.2,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 1.7, size.z * 1.25), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.002;
    glow.renderOrder = -2;
    pivot.add(glow);

    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
    const markerPos = {};
    const findNode = (name) => {
      if (markerPos[name] !== undefined) return markerPos[name];
      let hit = null;
      model.traverse((o) => { if (!hit && norm(o.name) === name) hit = o; });
      markerPos[name] = hit;
      return hit;
    };

    return { key, rim, shadow, glow, L, THREE, renderer, scene, camera, pivot, body, model, axles, M, glowMat, size, findNode };
  }));

  // ---- view presets ---------------------------------------------------------
  // yaw: model rotation (0 = nose toward camera); elev: camera pitch; pad: breathing room.
  const VIEWS = {
    hero:  { yaw: -0.68, elev: 0.16, target: 0.1, pad: 0.98, fov: 24 },
    side:  { yaw: Math.PI / 2, elev: 0.06, target: 0.3, pad: 0.98, fov: 22 },
    rear:  { yaw: Math.PI + 0.62, elev: 0.18, target: 0.15, pad: 1.0, fov: 24 },
    front: { yaw: 0.52, elev: 0.14, target: 0.25, pad: 0.96, fov: 24 },
    headon:{ yaw: 0, elev: 0.1, target: 0.15, pad: 1.25, fov: 24 },
    cabin: { yaw: -0.95, elev: 0.8, target: 0.35, pad: 1.08, fov: 24, key: 0.12 },
    top:   { yaw: Math.PI, elev: Math.PI / 2 - 0.0001, target: 0.3, pad: 0.98, fov: 20, key: 0.25 },
  };
  const PARAMS = ["elev", "target", "pad", "fov", "key"];

  const instances = new Set();
  let rafId = 0, lastT = 0;

  function frame(t) {
    rafId = 0;
    const eng = engineReady;
    if (!eng) return;
    const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
    lastT = t;
    let any = false;
    instances.forEach((el) => { if (el._visible && el._ctx) { el._draw(eng, t / 1000, dt); any = true; } });
    if (any || instances.size) rafId = requestAnimationFrame(frame);
  }
  let engineReady = null;
  const kick = () => { if (!rafId) rafId = requestAnimationFrame(frame); };

  class VeloceCar extends HTMLElement {
    static get observedAttributes() { return ["view", "flash"]; }

    constructor() {
      super();
      this._yaw = 0;       // user / spin yaw offset
      this._vel = 0;       // drag inertia
      this._flashT = -1;
      this._roll = 0;
      this._glow = 0.2;
      this._dist = 0;
    }

    connectedCallback() {
      if (!this._root) {
        this._root = this.attachShadow({ mode: "open" });
        this._root.innerHTML = `
          <style>
            :host { display: block; position: relative; width: 100%; height: 100%; contain: strict; }
            canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
            :host([interactive]) canvas { cursor: grab; touch-action: pan-y; }
            :host([interactive]) canvas:active { cursor: grabbing; }
            .load { position: absolute; left: 50%; bottom: 22%; width: 42%; height: 2px; transform: translateX(-50%);
                    border-radius: 2px; overflow: hidden; background: rgba(255,255,255,.06); transition: opacity .4s; }
            .load::after { content: ""; position: absolute; inset: 0; width: 40%;
                    background: linear-gradient(90deg, transparent, var(--accent, #EC0618), transparent); animation: s 1.2s ease-in-out infinite; }
            :host([data-ready]) .load, :host([data-error]) .load { opacity: 0; }
            @keyframes s { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
          </style>
          <canvas part="canvas"></canvas><div class="load"></div>`;
        this._canvas = this._root.querySelector("canvas");
        this._ctx = this._canvas.getContext("2d");
        this._bindDrag();
      }
      this._visible = true;
      this._io = new IntersectionObserver((e) => { this._visible = e[e.length - 1].isIntersecting; if (this._visible) kick(); });
      this._io.observe(this);
      instances.add(this);
      getEngine().then((eng) => {
        engineReady = eng;
        if (!this.isConnected) return;
        this._draw(eng, performance.now() / 1000, 0);
        requestAnimationFrame(() => this.setAttribute("data-ready", ""));
        kick();
      }).catch((err) => { console.warn(err); this.setAttribute("data-error", ""); });
    }

    disconnectedCallback() {
      instances.delete(this);
      if (this._io) this._io.disconnect();
    }

    attributeChangedCallback(name, oldV, newV) {
      if (name === "flash" && oldV !== null && oldV !== newV) this._flashT = performance.now() / 1000;
      // view changes glide to the new angle (see _draw); only reset any drag offset
      if (name === "view") this._yaw = 0;
    }

    _bindDrag() {
      let down = false, lastX = 0, lastTime = 0;
      const c = this._canvas;
      c.addEventListener("pointerdown", (e) => {
        if (!this.hasAttribute("interactive")) return;
        down = true; lastX = e.clientX; lastTime = e.timeStamp; this._vel = 0; this._dragging = true;
        c.setPointerCapture(e.pointerId);
      });
      c.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - lastX;
        const dtm = Math.max(1, e.timeStamp - lastTime);
        this._yaw += dx * 0.011;
        this._vel = (dx * 0.011) / (dtm / 1000);
        lastX = e.clientX; lastTime = e.timeStamp;
      });
      const up = () => { down = false; this._dragging = false; };
      c.addEventListener("pointerup", up);
      c.addEventListener("pointercancel", up);
    }

    // Distance at which the car's bounding box fits the frame for the current yaw
    // (or every yaw when spinning), eased so drag-rotation dollies smoothly.
    _fit(eng, v, w, h, yawNow, dt) {
      const { THREE, size } = eng;
      const tanV = Math.tan(THREE.MathUtils.degToRad(v.fov / 2));
      const tanH = tanV * (w / h);
      const hx = size.x / 2, hz = size.z / 2, hy = size.y;
      const spin = this.hasAttribute("spin");
      const pad = spin ? v.pad * 0.94 : v.pad;
      const yaws = spin ? Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2) : [yawNow];
      const top = Math.abs(v.elev) > 1.5;
      const dir = new THREE.Vector3(0, Math.sin(v.elev), Math.cos(v.elev));
      const up = top ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(up, dir).normalize();
      const camUp = new THREE.Vector3().crossVectors(dir, right).normalize();
      const target = new THREE.Vector3(0, hy * v.target, 0);
      const p = new THREE.Vector3();
      let need = 0;
      yaws.forEach((yaw) => {
        const cs = Math.cos(yaw), sn = Math.sin(yaw);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [0, hy]) {
          const x = sx * hx, z = sz * hz;
          p.set(x * cs + z * sn, y, -x * sn + z * cs).sub(target);
          const pz = p.dot(dir);
          need = Math.max(need, pz + (Math.abs(p.dot(right)) * pad) / tanH, pz + (Math.abs(p.dot(camUp)) * pad) / tanV);
        }
      });
      this._dist = this._dist ? this._dist + (need - this._dist) * Math.min(1, dt * 6) : need;
      this._dir = dir; this._camUp = up; this._target = target;
    }

    _yawOffset() {
      const a = parseFloat(this.getAttribute("yaw"));
      return isNaN(a) ? 0 : (a * Math.PI) / 180;
    }

    _draw(eng, t, dt) {
      const r = this.getBoundingClientRect();
      const cw = Math.round(r.width), ch = Math.round(r.height);
      if (!cw || !ch) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
      if (this._canvas.width !== W || this._canvas.height !== H) { this._canvas.width = W; this._canvas.height = H; }

      const { THREE, renderer, scene, camera, pivot, body, axles, M, glowMat } = eng;
      // Ease the camera preset toward the requested view so angle changes glide.
      const goal = VIEWS[this.getAttribute("view")] || VIEWS.hero;
      if (!this._cur) this._cur = { ...goal, key: goal.key ?? 1 };
      const v = this._cur;
      const k = 1 - Math.pow(0.02, dt || 1);
      let dy = (goal.yaw - v.yaw) % (Math.PI * 2);
      if (dy > Math.PI) dy -= Math.PI * 2;
      if (dy < -Math.PI) dy += Math.PI * 2;
      v.yaw += dy * k;
      PARAMS.forEach((p) => { v[p] += ((goal[p] ?? 1) - v[p]) * k; });

      // motion
      if (!this._dragging) {
        if (Math.abs(this._vel) > 0.01) { this._yaw += this._vel * dt; this._vel *= Math.pow(0.04, dt); }
        else if (this.hasAttribute("spin")) this._yaw += dt * 0.16;
      }
      const sway = this.hasAttribute("idle") ? Math.sin(t * 0.32) * 0.16 : 0;
      const yawNow = v.yaw + this._yawOffset() + this._yaw + sway;
      pivot.rotation.y = yawNow;
      this._fit(eng, v, cw, ch, yawNow, dt);
      const driving = this.hasAttribute("drive");
      if (driving) this._roll -= dt * 9;

      // Entrance: the car drives into frame, brakes with a slight nose dip, then blinks its lights.
      let introZ = 0, pitch = 0;
      if (this.hasAttribute("intro") && !this._introDone) {
        if (this._introStart == null) this._introStart = t;
        const p = Math.min(1, (t - this._introStart) / 2.1);
        const e = 1 - Math.pow(1 - p, 3.2);
        introZ = -(1 - e) * 9;
        pitch = Math.sin(Math.min(1, p * 1.15) * Math.PI) * 0.012 * p;
        if (p >= 1) { this._introDone = true; this._flashT = t; }
      }
      const roll = driving ? this._roll : introZ / 0.355;
      axles.forEach((a) => { a.rotation.x = roll; });
      body.position.z = introZ;
      body.position.y = driving ? Math.sin(t * 7.3) * 0.004 + Math.sin(t * 2.1) * 0.003 : 0;
      body.rotation.z = driving ? Math.sin(t * 1.3) * 0.004 : 0;
      body.rotation.x = pitch;

      // paint
      const paint = this.getAttribute("paint");
      if (paint && paint !== eng._lastPaint) { M.paint.color.set(paint); eng._lastPaint = paint; }
      if (!paint && eng._lastPaint) { M.paint.color.set(0x2b2f35); eng._lastPaint = null; }

      // lights
      const since = this._flashT >= 0 ? t - this._flashT : 99;
      const blink = since < 1.1 ? (Math.sin(since * Math.PI * 3.6) > 0 ? 1 : 0) : 0;
      M.drl.emissiveIntensity = 1.1 + blink * 9;
      M.tail.emissiveIntensity = 1.3 + blink * 3;

      // theme accent tints the underglow and the rim light
      const accent = this.getAttribute("accent") || "#EC0618";
      if (accent !== eng._lastAccent) { glowMat.color.set(accent); eng.rim.color.set(accent); eng._lastAccent = accent; }

      // underglow
      let g = parseFloat(this.getAttribute("glow"));
      if (isNaN(g)) g = 0.2;
      this._glow += (g - this._glow) * Math.min(1, dt * 4 || 1);
      const breathe = this.hasAttribute("pulse") ? 0.72 + 0.28 * Math.sin(t * 2.6) : 1;
      glowMat.opacity = Math.min(1, this._glow * breathe * 1.25 + blink * 0.3);

      eng.key.intensity = 1.2 * v.key;

      // camera
      camera.fov = v.fov;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      camera.position.copy(this._dir).multiplyScalar(this._dist).add(this._target);
      camera.up.copy(this._camUp);
      camera.lookAt(this._target);

      if (renderer.domElement.width !== W || renderer.domElement.height !== H) renderer.setSize(W, H, false);
      const ctx = this._ctx;
      ctx.clearRect(0, 0, W, H);
      // fade in on first frames (drawn here rather than via CSS so it never sticks)
      if (this._bornT == null) this._bornT = t;
      const fadeIn = Math.min(1, (t - this._bornT) / 0.7);

      // Glossy floor: render the car mirrored under the ground and fade it out.
      if (this.hasAttribute("reflect")) {
        pivot.scale.y = -1;
        eng.shadow.visible = eng.glow.visible = false;
        renderer.render(scene, camera);
        pivot.scale.y = 1;
        eng.shadow.visible = eng.glow.visible = true;
        const g = new THREE.Vector3(0, 0, 0).project(camera);
        const gy = (-g.y * 0.5 + 0.5) * H;
        ctx.save();
        ctx.globalAlpha = 0.3 * fadeIn;
        ctx.drawImage(renderer.domElement, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "destination-out";
        const fade = ctx.createLinearGradient(0, gy - H * 0.06, 0, gy + H * 0.3);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      renderer.render(scene, camera);
      ctx.globalAlpha = fadeIn;
      ctx.drawImage(renderer.domElement, 0, 0);
      ctx.globalAlpha = 1;

      // marker pin
      const mk = this.getAttribute("marker");
      if (mk) {
        const node = eng.findNode(mk);
        if (node) {
          const wp = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).project(camera);
          const x = (wp.x * 0.5 + 0.5) * W, y = (-wp.y * 0.5 + 0.5) * H;
          const col = this.getAttribute("marker-color") || "#f5a524";
          const ph = (t * 0.9) % 1;
          ctx.save();
          ctx.globalAlpha = 1 - ph;
          ctx.strokeStyle = col; ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.arc(x, y, (5 + ph * 16) * dpr, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = col;
          ctx.shadowColor = col; ctx.shadowBlur = 10 * dpr;
          ctx.beginPath(); ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#0a0b0d";
          ctx.beginPath(); ctx.arc(x, y, 1.6 * dpr, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  customElements.define("veloce-car", VeloceCar);
  // Warm the model up as soon as the page loads.
  getEngine().then((eng) => { engineReady = eng; kick(); }).catch(() => {});
})();
