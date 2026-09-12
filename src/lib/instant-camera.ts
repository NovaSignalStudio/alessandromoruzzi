import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { PosterPrint, PosterPressController } from './poster-press';

type CameraOptions = { onReady?: () => void; onError?: () => void; onFrame?: (index: number) => void };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const n = clamp(value); return n * n * (3 - 2 * n); };

export async function createInstantCamera(host: HTMLElement, posters: PosterPrint[], options: CameraOptions = {}): Promise<PosterPressController> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setClearColor(0x090a09, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  let disposed = false, visible = true, frame = 0, lastTime = 0, current = 0, target = 0, activeIndex = -1, flashPulse = 0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 40);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.05);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.85;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf7fbff, 0x373b35, 1.3));
  const key = new THREE.DirectionalLight(0xfff9ef, 3.3);
  key.position.set(-4, 6, 7); key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 5, bottom: -4, near: 0.5, far: 20 });
  key.shadow.normalBias = 0.018; key.shadow.bias = -0.00008; key.shadow.radius = 3;
  scene.add(key);
  const edge = new THREE.DirectionalLight(0xdae5ff, 2.4);
  edge.position.set(4, 3, -4); scene.add(edge);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(1, -3, 5); scene.add(fill);

  const body = new THREE.Group(); scene.add(body);
  const grain = new THREE.DataTexture(new Uint8Array(Array.from({ length: 64 * 64 }, () => 112 + Math.floor(Math.random() * 34))), 64, 64, THREE.RedFormat, THREE.UnsignedByteType);
  grain.wrapS = THREE.RepeatWrapping; grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(5, 5); grain.needsUpdate = true;
  const graphite = new THREE.MeshPhysicalMaterial({ color: 0x303632, metalness: 0.28, roughness: 0.46, clearcoat: 0.22, clearcoatRoughness: 0.38, roughnessMap: grain });
  const anodized = new THREE.MeshStandardMaterial({ color: 0x101512, metalness: 0.8, roughness: 0.26 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd6d9d0, metalness: 0.58, roughness: 0.3 });
  const rainbow = [0xd34a3b, 0xe28a42, 0xe6bd52, 0x5d966e, 0x4c7192].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.36, metalness: 0.1 }));
  const silver = new THREE.MeshPhysicalMaterial({ color: 0xc0c7c5, metalness: 1, roughness: 0.23, clearcoat: 0.2 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe0e6e4, metalness: 1, roughness: 0.1 });
  const black = new THREE.MeshStandardMaterial({ color: 0x050807, metalness: 0.08, roughness: 0.78 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x253d39, metalness: 0.18, roughness: 0.07, transmission: 0.42, thickness: 0.1, ior: 1.5, clearcoat: 1, transparent: true, opacity: 0.9 });
  const optical = new THREE.MeshPhysicalMaterial({ color: 0x15342f, metalness: 0.55, roughness: 0.08, clearcoat: 1 });
  const flashMaterial = new THREE.MeshPhysicalMaterial({ color: 0xdfe7d9, emissive: 0xaaa98d, emissiveIntensity: 0.18, metalness: 0.25, roughness: 0.18, clearcoat: 0.8 });
  const logoCanvas = document.createElement('canvas'); logoCanvas.width = 720; logoCanvas.height = 220;
  const logoContext = logoCanvas.getContext('2d');
  if (logoContext) { logoContext.fillStyle = '#090b0a'; logoContext.fillRect(0, 0, logoCanvas.width, logoCanvas.height); logoContext.fillStyle = '#f1f2eb'; logoContext.font = '700 112px Arial'; logoContext.fillText('Polaroid', 34, 142); }
  const logoTexture = new THREE.CanvasTexture(logoCanvas); logoTexture.colorSpace = THREE.SRGBColorSpace;
  const logoMaterial = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(5.8, 96), new THREE.MeshStandardMaterial({ color: 0x090b09, roughness: 0.96, metalness: 0, transparent: true, opacity: 0.72 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0.2, 0.15); ground.receiveShadow = true; scene.add(ground);
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) {
    const item = new THREE.Mesh(geometry, material); item.position.set(x, y, z);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  }
  function box(w: number, h: number, d: number, r: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) {
    return mesh(new RoundedBoxGeometry(w, h, d, 3, r), material, x, y, z, parent);
  }
  function disc(r: number, depth: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) {
    const item = mesh(new THREE.CylinderGeometry(r, r, depth, 72), material, x, y, z, parent);
    item.rotation.x = Math.PI / 2; return item;
  }
  function ring(radius: number, tube: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = body) {
    return mesh(new THREE.TorusGeometry(radius, tube, 12, 80), material, x, y, z, parent);
  }

  box(2.72, 1.65, 1.25, 0.18, graphite, 0, 1.46, -0.12);
  box(2.6, 1.53, 0.075, 0.15, silver, 0, 1.46, 0.516);
  box(2.53, 1.46, 0.095, 0.145, anodized, 0, 1.46, 0.56);
  box(2.53, 0.49, 0.94, 0.095, graphite, 0, 0.66, 0.28);
  box(2.46, 0.11, 0.41, 0.025, silver, 0, 0.472, 0.62);
  box(2.32, 0.16, 0.24, 0.03, black, 0, 0.545, 0.832);
  box(2.21, 0.04, 0.13, 0.015, anodized, 0, 0.59, 0.905);
  box(2.34, 0.055, 0.20, 0.02, graphite, 0, 0.45, 0.87);
  box(2.46, 0.07, 0.76, 0.025, black, 0, 2.15, -0.17);
  box(2.44, 0.1, 0.89, 0.04, graphite, 0, 2.23, -0.14);
  box(2.26, 0.22, 0.03, 0.02, anodized, 0, 1.92, 0.625);
  box(0.82, 0.2, 0.035, 0.015, trim, -0.53, 1.92, 0.649);
  rainbow.forEach((material, index) => box(0.13, 0.16, 0.012, 0.006, material, -0.15 + index * 0.14, 1.92, 0.673));
  box(0.42, 0.09, 0.018, 0.008, black, 0.58, 1.91, 0.674);
  box(0.19, 0.025, 0.02, 0.006, trim, 0.58, 1.91, 0.688);
  for (const sign of [-1, 1]) {
    box(0.055, 0.93, 0.7, 0.021, anodized, sign * 1.357, 1.35, -0.11);
    ring(0.09, 0.02, silver, sign * 1.37, 1.87, -0.18).rotation.y = Math.PI / 2;
    for (const y of [0.89, 2.02]) {
      disc(0.027, 0.012, silver, sign * 1.08, y, 0.616);
      box(0.025, 0.006, 0.006, 0.002, black, sign * 1.08, y, 0.624);
    }
  }

  const lens = new THREE.Group(); lens.position.set(-0.25, 1.39, 0.62); body.add(lens);
  disc(0.652, 0.09, graphite, 0, 0, 0.025, lens);
  disc(0.595, 0.14, silver, 0, 0, 0.115, lens);
  disc(0.557, 0.2, anodized, 0, 0, 0.21, lens);
  for (let i = 0; i < 56; i++) {
    const angle = i / 56 * Math.PI * 2;
    const knurl = box(0.017, 0.067, 0.125, 0.005, graphite, Math.cos(angle) * 0.555, Math.sin(angle) * 0.555, 0.218, lens);
    knurl.rotation.z = angle - Math.PI / 2;
  }
  ring(0.515, 0.025, chrome, 0, 0, 0.325, lens);
  disc(0.491, 0.075, black, 0, 0, 0.315, lens);
  ring(0.447, 0.018, anodized, 0, 0, 0.359, lens);
  disc(0.423, 0.025, optical, 0, 0, 0.34, lens);
  const apertureGroup = new THREE.Group(); lens.add(apertureGroup);
  for (let i = 0; i < 7; i++) {
    const aperture = mesh(new THREE.CircleGeometry(0.20, 3), anodized, Math.cos(i * Math.PI * 2 / 7) * 0.17, Math.sin(i * Math.PI * 2 / 7) * 0.17, 0.36, apertureGroup);
    aperture.rotation.z = i * Math.PI * 2 / 7 + 0.25;
  }
  disc(0.117, 0.005, black, 0, 0, 0.371, lens);
  const convex = mesh(new THREE.SphereGeometry(0.78, 56, 24, 0, Math.PI * 2, 0, 0.55), glass, 0, 0, -0.273, lens);
  convex.rotation.x = Math.PI / 2; convex.castShadow = false;
  ring(0.42, 0.008, chrome, 0, 0, 0.388, lens);

  box(0.75, 0.37, 0.065, 0.035, silver, 0.67, 1.997, 0.637);
  box(0.668, 0.284, 0.075, 0.019, flashMaterial, 0.67, 1.997, 0.678);
  for (let i = 0; i < 19; i++) box(0.012, 0.253, 0.007, 0.002, silver, 0.37 + i * 0.033, 1.997, 0.72);
  box(0.4, 0.275, 0.09, 0.049, silver, -0.87, 2, 0.64);
  box(0.329, 0.205, 0.1, 0.029, black, -0.87, 2, 0.689);
  mesh(new THREE.PlaneGeometry(0.27, 0.083), logoMaterial, -0.87, 2, 0.744);
  box(0.25, 0.144, 0.03, 0.019, optical, -0.87, 2, 0.75);
  box(0.23, 0.08, 0.08, 0.03, trim, 0.93, 2.1, 0.25);
  box(0.16, 0.048, 0.065, 0.018, black, 0.93, 2.15, 0.31);
  disc(0.183, 0.075, silver, 0.874, 1.394, 0.66);
  disc(0.143, 0.08, graphite, 0.874, 1.394, 0.707);
  disc(0.052, 0.034, black, 0.874, 1.064, 0.639);
  disc(0.031, 0.038, optical, 0.874, 1.064, 0.657);
  box(0.27, 0.018, 0.016, 0.006, silver, 0.78, 0.849, 0.635);
  const roller = mesh(new THREE.CylinderGeometry(0.044, 0.044, 2.21, 48), black, 0, 0.535, 0.871);
  roller.rotation.z = Math.PI / 2;
  const flashLight = new THREE.PointLight(0xfff2cf, 0, 7, 2.2);
  flashLight.position.set(0.67, 1.98, 3.2); scene.add(flashLight);

  const columns = 10, rows = 54;
  const pending = new Map<number, Promise<void>>();
  const textures = new Map<number, THREE.CanvasTexture>();
  const sheets = posters.map(poster => {
    const width = 2.14;
    const imageHeight = Math.min(2.6, 1.94 * poster.height / poster.width);
    const height = imageHeight + 0.43;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((columns + 1) * (rows + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((columns + 1) * (rows + 1) * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const indices: number[] = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + 1, c = a + columns + 1, d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
    geometry.setIndex(indices);
    const material = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.94, transparent: true, side: THREE.DoubleSide });
    const photo = new THREE.Mesh(geometry, material); photo.castShadow = true; photo.receiveShadow = true; photo.frustumCulled = false;
    photo.visible = false; scene.add(photo);
    return { mesh: photo, geometry, material, width, height, imageHeight };
  });

  function loadTexture(index: number): Promise<void> {
    if (index < 0 || index >= sheets.length || textures.has(index) || disposed) return Promise.resolve();
    const existing = pending.get(index); if (existing) return existing;
    const job = new Promise<void>(resolve => {
      const source = new Image();
      source.onload = () => {
        if (disposed) { resolve(); return; }
        const sheet = sheets[index], scale = 1100 / sheet.width;
        const canvas = document.createElement('canvas'); canvas.width = 1100; canvas.height = Math.round(sheet.height * scale);
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#f4f1e8'; context.fillRect(0, 0, canvas.width, canvas.height);
          const availableWidth = 1.94 * scale, availableHeight = sheet.imageHeight * scale;
          const ratio = Math.min(availableWidth / source.naturalWidth, availableHeight / source.naturalHeight);
          const imageWidth = source.naturalWidth * ratio, imageHeight = source.naturalHeight * ratio;
          context.drawImage(source, (canvas.width - imageWidth) / 2, 0.105 * scale + (availableHeight - imageHeight) / 2, imageWidth, imageHeight);
          const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          textures.set(index, texture); sheet.material.map = texture; sheet.material.color.set(0xffffff);
          sheet.material.emissive.set(0xffffff); sheet.material.emissiveMap = texture; sheet.material.emissiveIntensity = 0.12; sheet.material.needsUpdate = true;
          requestRender();
        }
        pending.delete(index); resolve();
      };
      source.onerror = () => { pending.delete(index); options.onError?.(); resolve(); };
      source.src = posters[index].src;
    });
    pending.set(index, job); return job;
  }
  function refreshTextures(index: number) {
    for (let i = Math.max(0, index - 1); i <= Math.min(sheets.length - 1, index + 1); i++) void loadTexture(i);
    for (const [i, texture] of textures) if (Math.abs(i - index) > 2) {
      texture.dispose(); textures.delete(i); sheets[i].material.map = null; sheets[i].material.emissiveMap = null; sheets[i].material.needsUpdate = true;
    }
  }
  function update() {
    const feed = 0.58 + current * Math.max(0.14, posters.length - 0.86);
    const active = Math.max(0, Math.min(posters.length - 1, Math.floor(feed)));
    if (active !== activeIndex) { activeIndex = active; refreshTextures(active); flashPulse = 1; options.onFrame?.(active); }
    roller.rotation.x = feed * 8;
    body.rotation.y = (current - 0.5) * 0.12;
    body.rotation.x = Math.sin(current * Math.PI) * 0.018;
    lens.rotation.z = current * 0.08;
    apertureGroup.rotation.z = current * 0.24;
    flashPulse *= 0.82;
    flashLight.intensity = flashPulse * 10;
    flashMaterial.emissiveIntensity = 0.18 + flashPulse * 2.8;
    for (let index = 0; index < sheets.length; index++) {
      const sheet = sheets[index], local = feed - index;
      sheet.mesh.visible = local > 0 && local < 1.4 && textures.has(index);
      if (!sheet.mesh.visible) continue;
      const exposure = sheet.height * clamp(local / 0.64);
      const detached = smooth((local - 0.65) / 0.3);
      const leave = smooth((local - 0.98) / 0.4);
      const position = sheet.geometry.getAttribute('position') as THREE.BufferAttribute;
      const uv = sheet.geometry.getAttribute('uv') as THREE.BufferAttribute;
      for (let row = 0; row <= rows; row++) {
        const v = row / rows * exposure / sheet.height;
        const distance = exposure - v * sheet.height;
        const curl = 0.13 * (1 - Math.exp(-distance * 4)) + Math.sin(distance / sheet.height * Math.PI) * 0.06;
        for (let col = 0; col <= columns; col++) {
          const u = col / columns, x = (u - 0.5) * sheet.width;
          const n = row * (columns + 1) + col;
          position.setXYZ(n, x, 0.526 - distance, 0.915 + curl + x * x * 0.014);
          uv.setXY(n, u, v);
        }
      }
      position.needsUpdate = true; uv.needsUpdate = true; sheet.geometry.computeVertexNormals();
      sheet.mesh.position.set(leave * -0.44, -detached * 0.09 - leave * 1.25, detached * 0.05 - leave * 0.25);
      sheet.mesh.rotation.set(detached * -0.025 + leave * 0.15, detached * 0.07, leave * -0.085);
      sheet.material.opacity = 1 - leave; sheet.material.depthWrite = leave < 0.04;
    }
  }
  function render(time: number) {
    frame = 0; if (disposed || !visible) return;
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 1 / 60; lastTime = time;
    current += (target - current) * (1 - Math.exp(-8.5 * dt));
    if (Math.abs(target - current) < 0.00004) current = target;
    update(); renderer.render(scene, camera);
    if (current !== target) frame = requestAnimationFrame(render);
  }
  function requestRender() { if (!disposed && visible && !frame) frame = requestAnimationFrame(render); }
  function resize() {
    const rect = host.getBoundingClientRect(); if (!rect.width || !rect.height || disposed) return;
    const aspect = rect.width / rect.height;
    camera.aspect = aspect;
    camera.position.set(aspect < 0.8 ? 1.1 : 2.2, 1.32, aspect < 0.8 ? 10.8 : 9.6);
    camera.lookAt(0, 1.08, 0.48); camera.updateProjectionMatrix(); renderer.setSize(rect.width, rect.height, false); requestRender();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const contextLost = (event: Event) => { event.preventDefault(); options.onError?.(); };
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  resize(); await loadTexture(0); update(); renderer.render(scene, camera); options.onReady?.();
  return {
    setProgress(progress, instant = false) { target = clamp(progress); if (instant) current = target; requestRender(); },
    setVisible(next) { visible = next; lastTime = 0; if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; } else requestRender(); },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(item => { if (item instanceof THREE.Mesh) { geometries.add(item.geometry); (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => materials.add(material)); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      textures.forEach(texture => texture.dispose()); textures.clear(); logoTexture.dispose(); environment.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
