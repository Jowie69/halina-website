/* ============================================================
   Halina Travels — Phase 2 + 3 : three.js experience layer
   ES module, loaded lazily by assets/js/main.js AFTER first paint
   so it never competes with LCP.

   Everything here is optional decoration. If three.js fails to
   load, WebGL is unavailable, or the user prefers reduced motion,
   nothing runs and the site falls back to the Phase 1 CSS layer.
   ============================================================ */
import * as THREE from 'three';

const MAX_DPR = 1.5;
const GOLD = 0xf2b33d;
const ROSE = 0xce5587;
const PLUM = 0x7c2470;

/* ------------------------------------------------------------
   A renderer bound to one canvas that pauses itself whenever the
   canvas leaves the viewport or the tab is hidden, so we never
   burn GPU on off-screen sections.
   ------------------------------------------------------------ */
class SceneHost {
  constructor(mount, build) {
    this.mount = mount;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(this.canvas);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: (window.devicePixelRatio || 1) < 2,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_DPR));
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.clock = new THREE.Clock();
    this.running = false;
    this.visible = false;

    this.update = build(this) || (() => {});

    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(
        (entries) => {
          this.visible = entries.some((e) => e.isIntersecting);
          if (this.visible) this.start();
          else this.stop();
        },
        { rootMargin: '120px 0px' }
      );
      this.io.observe(mount);
    } else {
      this.visible = true;
      this.start();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else if (this.visible) this.start();
    });

    // render one frame immediately so the canvas is never blank on fade-in
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.canvas.classList.add('ready'));
  }

  resize() {
    const w = this.mount.clientWidth || 1;
    const h = this.mount.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta(); // discard the paused interval
    const loop = () => {
      if (!this.running) return;
      this._raf = requestAnimationFrame(loop);
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.update(dt, this.clock.elapsedTime);
      this.renderer.render(this.scene, this.camera);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}

/* ------------------------------------------------------------
   Procedural textures — no external assets to download
   ------------------------------------------------------------ */
function cloudTexture() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');

  for (let i = 0; i < 22; i++) {
    const x = s * (0.5 + (Math.random() - 0.5) * 0.72);
    const y = s * (0.55 + (Math.random() - 0.5) * 0.34);
    const r = s * (0.08 + Math.random() * 0.17);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.42)');
    grd.addColorStop(0.55, 'rgba(255,250,252,0.18)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  return new THREE.CanvasTexture(c);
}

function sparkTexture() {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.65)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------
   Low-poly airliner built from primitives.
   No glTF download, no licence baggage, ~1k triangles, and the
   silhouette is tuned to the brand rather than a generic 737.
   ------------------------------------------------------------ */
function buildPlane() {
  const plane = new THREE.Group();

  const body = new THREE.MeshStandardMaterial({
    color: 0xfbf2f6, roughness: 0.42, metalness: 0.22, flatShading: true
  });
  const accent = new THREE.MeshStandardMaterial({
    color: ROSE, roughness: 0.35, metalness: 0.3, flatShading: true
  });
  const trim = new THREE.MeshStandardMaterial({
    color: GOLD, roughness: 0.28, metalness: 0.55, flatShading: true
  });

  const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 2.1, 4, 12), body);
  fuse.rotation.z = Math.PI / 2;
  plane.add(fuse);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 12), body);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = 1.34;
  plane.add(nose);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 2.5), body);
  wing.position.set(-0.06, -0.04, 0);
  wing.rotation.y = -0.16;
  plane.add(wing);

  [-1.22, 1.22].forEach((z) => {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.3), accent);
    tip.position.set(-0.24, 0.02, z);
    plane.add(tip);
  });

  [-0.78, 0.78].forEach((z) => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 10), trim);
    eng.rotation.z = Math.PI / 2;
    eng.position.set(0.04, -0.19, z);
    plane.add(eng);
  });

  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 1.05), body);
  tailWing.position.set(-1.06, 0.06, 0);
  plane.add(tailWing);

  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.06), accent);
  fin.position.set(-1.12, 0.42, 0);
  fin.rotation.z = 0.28;
  plane.add(fin);

  const line = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.055, 0.055), trim);
  line.position.set(0.05, 0.06, 0.295);
  plane.add(line);
  const line2 = line.clone();
  line2.position.z = -0.295;
  plane.add(line2);

  plane.scale.setScalar(0.62);
  return plane;
}

/* ------------------------------------------------------------
   HERO SCENE — airplane on a curve, contrail, layered clouds
   ------------------------------------------------------------ */
function heroScene(host) {
  const { scene, camera } = host;
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));

  const key = new THREE.DirectionalLight(GOLD, 2.1);
  key.position.set(4, 5, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(ROSE, 1.5);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0xffe9f4, PLUM, 0.5));

  /* cloud billboards at three depths */
  const cloudTex = cloudTexture();
  const clouds = [];
  [
    { count: 4, z: -16, scale: 15, speed: 0.24, opacity: 0.3 },
    { count: 4, z: -8, scale: 10, speed: 0.46, opacity: 0.4 },
    { count: 3, z: -2, scale: 7, speed: 0.78, opacity: 0.34 }
  ].forEach((L) => {
    for (let i = 0; i < L.count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        map: cloudTex, transparent: true, opacity: L.opacity, depthWrite: false
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L.scale, L.scale * 0.6), mat);
      m.position.set(
        (Math.random() - 0.5) * 44,
        (Math.random() - 0.35) * 12,
        L.z + (Math.random() - 0.5) * 2
      );
      m.userData.speed = L.speed * (0.7 + Math.random() * 0.6);
      scene.add(m);
      clouds.push(m);
    }
  });

  /* foreground wisp very close to the camera */
  const fg = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 12),
    new THREE.MeshBasicMaterial({ map: cloudTex, transparent: true, opacity: 0.16, depthWrite: false })
  );
  fg.position.set(0, -3.4, 8.4);
  scene.add(fg);

  /* flight path */
  const path = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-17, -3.4, -6),
      new THREE.Vector3(-8, 0.6, -1),
      new THREE.Vector3(0.5, 2.6, 1.5),
      new THREE.Vector3(9, 1.0, -1.5),
      new THREE.Vector3(17, 4.2, -7)
    ],
    false, 'catmullrom', 0.4
  );

  const plane = buildPlane();
  scene.add(plane);

  /* contrail: a points trail that fades along its length */
  const TRAIL = 90;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));

  const trail = new THREE.Points(
    trailGeo,
    new THREE.PointsMaterial({
      size: 0.5,
      map: sparkTexture(),
      color: 0xffeaf4,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
  );
  trail.frustumCulled = false;
  scene.add(trail);

  let head = 0;
  let seeded = false;

  /* camera rig follows the pointer, gently */
  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    window.addEventListener(
      'pointermove',
      (e) => {
        target.x = (e.clientX / window.innerWidth - 0.5) * 2;
        target.y = (e.clientY / window.innerHeight - 0.5) * 2;
      },
      { passive: true }
    );
  }

  const tmp = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const ahead = new THREE.Vector3();
  let t = 0;

  return (dt, elapsed) => {
    /* airplane along the path */
    t = (t + dt * 0.055) % 1;
    path.getPointAt(t, tmp);
    plane.position.copy(tmp);

    // nose down the tangent, then bank into the turn
    path.getPointAt(Math.min(t + 0.01, 1), ahead);
    plane.lookAt(ahead);
    path.getTangentAt(t, tangent);
    plane.rotateY(-Math.PI / 2);
    plane.rotation.z += Math.sin(elapsed * 0.7) * 0.06 - tangent.y * 0.5;
    plane.position.y += Math.sin(elapsed * 1.15) * 0.09;

    /* contrail */
    if (!seeded) {
      for (let i = 0; i < TRAIL; i++) {
        trailPos[i * 3] = tmp.x;
        trailPos[i * 3 + 1] = tmp.y;
        trailPos[i * 3 + 2] = tmp.z;
      }
      seeded = true;
    }
    head = (head + 1) % TRAIL;
    trailPos[head * 3] = tmp.x - 0.9;
    trailPos[head * 3 + 1] = tmp.y - 0.02;
    trailPos[head * 3 + 2] = tmp.z;
    trailGeo.attributes.position.needsUpdate = true;

    /* drifting clouds, wrapping at the edges */
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      c.position.x -= c.userData.speed * dt;
      if (c.position.x < -26) c.position.x = 26;
      c.position.y += Math.sin(elapsed * 0.25 + i) * dt * 0.12;
    }
    fg.position.x = Math.sin(elapsed * 0.06) * 3;

    /* camera parallax — deliberately tiny so the headline stays crisp */
    current.x += (target.x - current.x) * 0.045;
    current.y += (target.y - current.y) * 0.045;
    camera.position.x = current.x * 0.85;
    camera.position.y = -current.y * 0.5;
    camera.lookAt(0, 0, 0);
  };
}

/* ------------------------------------------------------------
   PROMO SCENE — drifting snow / sparkle over the Christmas poster
   One BufferGeometry, one draw call.
   ------------------------------------------------------------ */
function snowScene(host) {
  const { scene, camera } = host;
  camera.position.set(0, 0, 10);

  const COUNT = 320;
  const W = 24;
  const H = 13;
  const pos = new Float32Array(COUNT * 3);
  const vel = new Float32Array(COUNT * 2);

  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * W;
    pos[i * 3 + 1] = (Math.random() - 0.5) * H;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    vel[i * 2] = 0.25 + Math.random() * 0.7;
    vel[i * 2 + 1] = Math.random() * Math.PI * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.17,
      map: sparkTexture(),
      color: 0xfff2d6,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  pts.frustumCulled = false;
  scene.add(pts);

  return (dt, elapsed) => {
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 1] -= vel[i * 2] * dt;
      pos[i * 3] += Math.sin(elapsed * 0.6 + vel[i * 2 + 1]) * dt * 0.32;
      if (pos[i * 3 + 1] < -H / 2) {
        pos[i * 3 + 1] = H / 2;
        pos[i * 3] = (Math.random() - 0.5) * W;
      }
      if (pos[i * 3] > W / 2) pos[i * 3] = -W / 2;
      if (pos[i * 3] < -W / 2) pos[i * 3] = W / 2;
    }
    geo.attributes.position.needsUpdate = true;
    pts.rotation.z = Math.sin(elapsed * 0.08) * 0.05;
  };
}

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */
export function init() {
  const hosts = [];

  const hero = document.querySelector('.hero');
  if (hero) {
    const mount = document.createElement('div');
    mount.id = 'hero-fx';
    mount.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    const veil = hero.querySelector('.veil');
    if (veil) veil.insertAdjacentElement('afterend', mount);
    else hero.prepend(mount);
    hosts.push(new SceneHost(mount, heroScene));

    if (!hero.querySelector('.fx-fog')) {
      const fog = document.createElement('div');
      fog.className = 'fx-fog';
      fog.setAttribute('aria-hidden', 'true');
      fog.setAttribute('data-parallax', '0.18');
      hero.appendChild(fog);
      if (window.HalinaMotion) window.HalinaMotion.refresh();
    }
  }

  const poster = document.querySelector('.xmas .poster');
  if (poster) {
    const mount = document.createElement('div');
    mount.id = 'promo-fx';
    mount.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    poster.appendChild(mount);
    hosts.push(new SceneHost(mount, snowScene));
  }

  return hosts;
}
