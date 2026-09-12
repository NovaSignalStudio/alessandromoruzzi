import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type PosterPrint = { src: string; width: number; height: number; title: string };
export type PosterPressController = {
  setProgress: (progress: number, instant?: boolean) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
};
type PressOptions = { onReady?: () => void; onError?: () => void; onFrame?: (index: number) => void };
const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
const ease = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };

export async function createPosterPress(
  host: HTMLElement, posters: PosterPrint[], options: PressOptions = {},
): Promise<PosterPressController> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0xeeefeb, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.5, -3.5, 0.1, 45);
  camera.position.set(4.2, 3.05, 11.8);
  camera.lookAt(0, 0.6, 0.3);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const studio = new RoomEnvironment();
  const environment = pmrem.fromScene(studio, 0.035);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.8;
  studio.dispose();
  pmrem.dispose();

  const ambient = new THREE.HemisphereLight(0xf8faf7, 0x62665d, 0.82);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfffcf4, 2.9);
  key.position.set(-4, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -5; key.shadow.camera.right = 5;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 22;
  key.shadow.normalBias = 0.012;
  key.shadow.bias = -0.0001;
  key.shadow.radius = 4;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xf2f5ff, 1.35);
  rim.position.set(5, 3, -4); scene.add(rim);

  const rig = new THREE.Group();
  scene.add(rig);
  const surfaceTextures: THREE.Texture[] = [];
  function surfaceNormal(directional: boolean, repeat: number) {
    const size = 256;
    const pixels = new Uint8Array(size * size * 4);
    let seed = directional ? 362436069 : 521288629;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let row = 0; row < size; row++) {
      const line = (random() - 0.5) * 30;
      for (let col = 0; col < size; col++) {
        const offset = (row * size + col) * 4;
        pixels[offset] = 128 + (random() - 0.5) * (directional ? 4 : 30);
        pixels[offset + 1] = 128 + (directional ? line : (random() - 0.5) * 30);
        pixels[offset + 2] = 254;
        pixels[offset + 3] = 255;
      }
    }
    const texture = new THREE.DataTexture(pixels, size, size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    surfaceTextures.push(texture);
    return texture;
  }
  const brushedNormal = surfaceNormal(true, 6);
  const grainNormal = surfaceNormal(false, 7);
  const metal = new THREE.MeshPhysicalMaterial({ color: 0xb2b9b6, metalness: 1, roughness: 0.3, anisotropy: 0.62, normalMap: brushedNormal, normalScale: new THREE.Vector2(0.3, 0.3) });
  const frameMetal = new THREE.MeshPhysicalMaterial({ color: 0x959e98, metalness: 0.78, roughness: 0.43, normalMap: grainNormal, normalScale: new THREE.Vector2(0.28, 0.28), clearcoat: 0.08 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xd8ddda, metalness: 1, roughness: 0.17, anisotropy: 0.42, normalMap: brushedNormal, normalScale: new THREE.Vector2(0.12, 0.12) });
  const dark = new THREE.MeshStandardMaterial({ color: 0x30362f, metalness: 0.68, roughness: 0.43, normalMap: grainNormal, normalScale: new THREE.Vector2(0.2, 0.2) });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x181b17, metalness: 0, roughness: 0.91, normalMap: grainNormal, normalScale: new THREE.Vector2(0.36, 0.36) });
  const ink = new THREE.MeshPhysicalMaterial({ color: 0x101c1a, metalness: 0.08, roughness: 0.36, clearcoat: 0.16, clearcoatRoughness: 0.38, normalMap: grainNormal, normalScale: new THREE.Vector2(0.16, 0.16) });
  const paper = new THREE.MeshStandardMaterial({ color: 0xf4f2e9, roughness: 0.92, side: THREE.BackSide, normalMap: grainNormal, normalScale: new THREE.Vector2(0.065, 0.065) });
  const machine = new THREE.Group();
  rig.add(machine);

  function part(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, group: THREE.Object3D = machine) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh); return mesh;
  }
  function box(w: number, h: number, d: number, radius: number, material: THREE.Material, x: number, y: number, z: number, group: THREE.Object3D = machine) {
    return part(new RoundedBoxGeometry(w, h, d, 3, radius), material, x, y, z, group);
  }
  function cylinder(radius: number, length: number, material: THREE.Material, x: number, y: number, z: number, group: THREE.Object3D = machine) {
    const mesh = part(new THREE.CylinderGeometry(radius, radius, length, 72, 1), material, x, y, z, group);
    mesh.rotation.z = Math.PI / 2; return mesh;
  }
  function fastener(x: number, y: number, z: number, sign: number) {
    const cap = cylinder(0.044, 0.025, chrome, x, y, z);
    cap.rotation.x = Math.PI / 6;
    const socket = part(new THREE.CylinderGeometry(0.019, 0.019, 0.003, 6), dark, x + sign * 0.014, y, z);
    socket.rotation.z = Math.PI / 2;
  }

  function sidePlate(x: number) {
    const shape = new THREE.Shape();
    shape.moveTo(-0.88, -1.74); shape.lineTo(0.95, -1.74);
    shape.quadraticCurveTo(1.06, -1.74, 1.02, -1.57);
    shape.lineTo(0.54, -0.2); shape.quadraticCurveTo(0.49, 0.03, 0.25, 0.03);
    shape.lineTo(-0.06, 0.03); shape.quadraticCurveTo(-0.28, 0.03, -0.37, -0.24);
    shape.lineTo(-0.97, -1.57); shape.quadraticCurveTo(-1.03, -1.74, -0.88, -1.74);
    const cutout = new THREE.Path();
    cutout.moveTo(-0.51, -1.39); cutout.lineTo(0.51, -1.39); cutout.lineTo(0.22, -0.93);
    cutout.quadraticCurveTo(0.11, -0.84, -0.02, -0.94); cutout.lineTo(-0.51, -1.39);
    shape.holes.push(cutout);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.04, bevelThickness: 0.04, curveSegments: 18 });
    const plate = part(geometry, frameMetal, x, 0, 0.1);
    plate.rotation.y = -Math.PI / 2;
    return plate;
  }
  sidePlate(-1.86); sidePlate(2.04);
  for (const sign of [-1, 1]) {
    const x = sign * 1.97;
    box(0.55, 0.12, 2.32, 0.05, dark, x, -1.8, 0.05);
    for (const z of [-0.78, 0.78]) {
      box(0.45, 0.065, 0.41, 0.025, rubber, x, -1.89, z);
      fastener(x + sign * 0.12, -1.47, z * 0.72, sign);
    }
    for (const y of [-0.40, -0.87]) {
      cylinder(0.32, 0.13, dark, x + sign * 0.045, y, 0.16);
      cylinder(0.245, 0.15, metal, x + sign * 0.075, y, 0.16);
      cylinder(0.14, 0.19, chrome, x + sign * 0.1, y, 0.16);
      const bearingSeal = part(new THREE.TorusGeometry(0.168, 0.012, 8, 48), rubber, x + sign * 0.156, y, 0.16);
      bearingSeal.rotation.y = Math.PI / 2;
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2 + Math.PI / 4;
        fastener(x + sign * 0.16, y + Math.cos(a) * 0.25, 0.16 + Math.sin(a) * 0.25, sign);
      }
    }
    part(new THREE.CylinderGeometry(0.055, 0.055, 0.4, 24), chrome, x, 0.1, 0.16);
    for (let j = 0; j < 9; j++) {
      const ring = part(new THREE.TorusGeometry(0.057, 0.006, 6, 24), dark, x, -0.01 + j * 0.027, 0.16);
      ring.rotation.x = Math.PI / 2;
    }
    part(new THREE.CylinderGeometry(0.16, 0.16, 0.058, 48), dark, x, 0.31, 0.16);
    part(new THREE.CylinderGeometry(0.06, 0.06, 0.065, 32), chrome, x, 0.33, 0.16);
    cylinder(0.033, 0.55, chrome, x, 0.325, 0.16);
  }

  cylinder(0.074, 4, dark, 0, -1.46, -0.45);
  cylinder(0.065, 4, chrome, 0, -1.49, 0.65);
  const upperRoller = cylinder(0.22, 3.61, chrome, 0, -0.40, 0.16);
  const lowerRoller = cylinder(0.24, 3.61, ink, 0, -0.87, 0.16);
  for (const x of [-1.8, 1.8]) {
    cylinder(0.225, 0.045, dark, x, -0.40, 0.16);
    cylinder(0.246, 0.045, metal, x, -0.87, 0.16);
    for (const offset of [-0.022, 0.022]) {
      const score = part(new THREE.TorusGeometry(0.216, 0.003, 6, 56), metal, x + offset, -0.40, 0.16);
      score.rotation.y = Math.PI / 2;
    }
  }

  function gear(y: number, teeth: number, phase: number) {
    const pitch = 0.47 * teeth / 54;
    const shape = new THREE.Shape();
    for (let tooth = 0; tooth < teeth; tooth++) {
      for (let corner = 0; corner < 4; corner++) {
        const a = (tooth + [0, 0.24, 0.52, 0.76][corner]) / teeth * Math.PI * 2 + phase;
        const radius = pitch + (corner === 1 || corner === 2 ? 0.009 : -0.009);
        const x = Math.cos(a) * radius, z = Math.sin(a) * radius;
        if (!tooth && !corner) shape.moveTo(x, z); else shape.lineTo(x, z);
      }
    }
    shape.closePath();
    const axle = new THREE.Path(); axle.absarc(0, 0, 0.077, 0, Math.PI * 2, true); shape.holes.push(axle);
    for (let hole = 0; hole < 5; hole++) {
      const a = hole / 5 * Math.PI * 2;
      const cutout = new THREE.Path();
      cutout.absarc(Math.cos(a) * 0.151, Math.sin(a) * 0.151, 0.028, 0, Math.PI * 2, true);
      shape.holes.push(cutout);
    }
    const group = new THREE.Group(); group.position.set(2.24, y, 0.16); machine.add(group);
    const wheel = part(new THREE.ExtrudeGeometry(shape, { depth: 0.058, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.003, bevelThickness: 0.003, curveSegments: 12 }), metal, 0, 0, 0, group);
    wheel.rotation.y = Math.PI / 2;
    cylinder(0.101, 0.072, chrome, 0.025, 0, 0, group);
    cylinder(0.06, 0.08, dark, 0.038, 0, 0, group);
    return group;
  }
  const upperGear = gear(-0.40, 26, 0);
  const lowerGear = gear(-0.87, 28, Math.PI / 28);
  box(3.69, 0.055, 2.08, 0.02, metal, 0, -0.66, -1.12);
  for (const x of [-1.75, 1.75]) box(0.036, 0.15, 1.89, 0.009, chrome, x, -0.58, -1.15);
  for (let i = 0; i < 7; i++) {
    box(2.96, 0.012, 1.49, 0.004, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe5e3d9 : 0xf2f0e7, roughness: 1 }), 0, -0.619 + i * 0.013, -1.37);
  }
  for (const x of [-1.4, 1.4]) {
    const strut = cylinder(0.033, 1.18, chrome, x, -1.06, -1.05);
    strut.rotation.set(0.72, 0, 0);
  }
  box(3.62, 0.055, 0.46, 0.018, metal, 0, -0.695, 0.53);
  cylinder(0.045, 3.65, chrome, 0, -0.685, 0.78);

  const crank = new THREE.Group(); crank.position.set(-2.16, -0.87, 0.16); machine.add(crank);
  cylinder(0.093, 0.3, chrome, -0.08, 0, 0, crank);
  const arm = box(0.065, 0.58, 0.09, 0.025, metal, -0.24, 0.23, 0, crank);
  arm.rotation.x = 0.12;
  cylinder(0.057, 0.3, dark, -0.37, 0.5, 0.04, crank);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: 0x3d4439, opacity: 0.24 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -1.94; floor.receiveShadow = true; scene.add(floor);

  const columns = 12, rows = 64;
  const textures: THREE.Texture[] = [];
  const loader = new THREE.TextureLoader();
  const sheets: { group: THREE.Group; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial; reverse: THREE.MeshStandardMaterial; width: number; height: number }[] = [];
  for (const poster of posters) {
    const ratio = Math.max(0.4, poster.width / poster.height);
    const width = Math.min(3.15, 4.15 * ratio), height = width / ratio;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array((columns + 1) * (rows + 1) * 3);
    const uvs = new Float32Array((columns + 1) * (rows + 1) * 2);
    const indices: number[] = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + 1, c = a + columns + 1, d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2).setUsage(THREE.DynamicDrawUsage));
    geometry.setIndex(indices);
    const texture = loader.load(poster.src, () => { if (!disposed) requestRender(); }, undefined, () => options.onError?.());
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, map: texture, roughness: 0.91, metalness: 0, side: THREE.FrontSide, transparent: true, normalMap: grainNormal, normalScale: new THREE.Vector2(0.045, 0.045) });
    material.emissive.set(0xffffff); material.emissiveMap = texture; material.emissiveIntensity = 0.12;
    const reverse = paper.clone(); reverse.transparent = true;
    const group = new THREE.Group();
    const face = new THREE.Mesh(geometry, material); face.castShadow = true; face.receiveShadow = true; face.frustumCulled = false;
    const back = new THREE.Mesh(geometry, reverse); back.castShadow = true; back.frustumCulled = false;
    group.add(face, back); rig.add(group);
    sheets.push({ group, geometry, material, reverse, width, height });
  }

  let current = 0, target = 0, previousTime = 0, raf = 0, disposed = false, visible = true, previousFrame = -1;
  let lastCameraAspect = 1;
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed) return;
    const aspect = width / height;
    lastCameraAspect = aspect;
    const viewHeight = Math.max(6.25, 5.72 / aspect);
    camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
    camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
    camera.position.set(aspect < 0.8 ? 2.8 : 4.2, 3.05, 11.8);
    camera.lookAt(0, 0.59, 0.15);
    camera.updateProjectionMatrix(); renderer.setSize(width, height, false); requestRender();
  }

  function updateSheets() {
    const feed = 0.58 + current * Math.max(0.14, posters.length - 0.86);
    const active = Math.min(posters.length - 1, Math.max(0, Math.floor(feed)));
    if (active !== previousFrame) { previousFrame = active; options.onFrame?.(active); }
    upperRoller.rotation.x = -feed * 6 * 28 / 26;
    lowerRoller.rotation.x = feed * 6;
    upperGear.rotation.x = upperRoller.rotation.x;
    lowerGear.rotation.x = feed * 6;
    crank.rotation.x = lowerRoller.rotation.x;
    for (let index = 0; index < sheets.length; index++) {
      const sheet = sheets[index], local = feed - index;
      sheet.group.visible = local > -0.015 && local < 1.45;
      if (!sheet.group.visible) continue;
      const emitted = clamp(local / 0.64);
      const reveal = Math.max(0.018, sheet.height * emitted);
      const detached = ease((local - 0.64) / 0.28);
      const leave = ease((local - 0.93) / 0.5);
      const minV = 1 - Math.min(1, reveal / sheet.height);
      const position = sheet.geometry.getAttribute('position') as THREE.BufferAttribute;
      const uv = sheet.geometry.getAttribute('uv') as THREE.BufferAttribute;
      const radius = 0.51, arc = radius * Math.PI / 2;
      for (let row = 0; row <= rows; row++) {
        const v = minV + row / rows * (1 - minV);
        const length = (v - minV) * sheet.height;
        const theta = Math.min(Math.PI / 2, length / radius);
        const baseY = -0.636 + radius * (1 - Math.cos(theta)) + Math.max(0, length - arc);
        const baseZ = 0.22 + radius * Math.sin(theta);
        for (let col = 0; col <= columns; col++) {
          const u = col / columns, x = (u - 0.5) * sheet.width;
          const flatY = -0.45 + v * sheet.height;
          const flex = Math.sin(v * Math.PI) * 0.11 + x * x * 0.017;
          const y = THREE.MathUtils.lerp(baseY, flatY, detached);
          const z = THREE.MathUtils.lerp(baseZ, 0.92 + flex, detached);
          const n = row * (columns + 1) + col;
          position.setXYZ(n, x, y, z); uv.setXY(n, u, v);
        }
      }
      position.needsUpdate = true; uv.needsUpdate = true;
      sheet.geometry.computeVertexNormals();
      sheet.group.position.set(-leave * 1.4, detached * 0.09 + leave * 2.7, -leave * 0.7);
      sheet.group.rotation.set(-detached * 0.045 - leave * 0.12, detached * (lastCameraAspect < 0.8 ? 0.2 : 0.31) - leave * 0.21, -leave * 0.1);
      sheet.material.opacity = 1 - leave;
      sheet.reverse.opacity = 1 - leave;
      sheet.material.depthWrite = leave < 0.03;
      sheet.reverse.depthWrite = leave < 0.03;
    }
  }
  function draw(time: number) {
    raf = 0;
    if (disposed || !visible) return;
    const dt = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 1 / 60;
    previousTime = time;
    current += (target - current) * (1 - Math.exp(-8.5 * dt));
    if (Math.abs(target - current) < 0.00004) current = target;
    updateSheets(); renderer.render(scene, camera);
    if (current !== target) raf = requestAnimationFrame(draw);
  }
  function requestRender() { if (!disposed && visible && !raf) raf = requestAnimationFrame(draw); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const onContextLost = (event: Event) => { event.preventDefault(); options.onError?.(); };
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  resize(); updateSheets(); renderer.render(scene, camera);
  try { if (textures[0]) await new Promise<void>((resolve) => {
    const source = textures[0].image as HTMLImageElement | undefined;
    if (source?.complete) { resolve(); return; }
    const deadline = performance.now() + 5000;
    const untilReady = () => {
      if (disposed || performance.now() >= deadline || (textures[0].image as HTMLImageElement | undefined)?.complete) resolve();
      else setTimeout(untilReady, 30);
    };
    setTimeout(untilReady, 30);
  }); } catch { options.onError?.(); }
  requestRender(); options.onReady?.();
  return {
    setProgress(progress, instant = false) { target = clamp(progress); if (instant) current = target; requestRender(); },
    setVisible(next) { visible = next; previousTime = 0; if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; } else requestRender(); },
    dispose() {
      if (disposed) return; disposed = true;
      cancelAnimationFrame(raf); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const source = Array.isArray(object.material) ? object.material : [object.material];
        source.forEach(material => materials.add(material));
      } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose()); surfaceTextures.forEach(texture => texture.dispose()); paper.dispose(); environment.dispose();
      key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
