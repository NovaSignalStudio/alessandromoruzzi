import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createPolaroidModel } from './polaroid-model';
import type { PosterPrint, PosterPressController } from './poster-press';

type Options = { onReady?: () => void; onError?: () => void; onFrame?: (index: number) => void };
const clamp = THREE.MathUtils.clamp;
const smooth = (n: number) => { const p = clamp(n, 0, 1); return p * p * (3 - 2 * p); };
export const photoFeed = (progress: number, count: number) => .04 + progress * (count - .23);

export async function createInstantCamera(host: HTMLElement, photos: PosterPrint[], options: Options = {}): Promise<PosterPressController> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 700 ? 1.5 : 1.75));
  renderer.setClearColor(0x090909, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.dataset.scene = 'polaroid-webgl';
  host.appendChild(renderer.domElement);

  let disposed = false, visible = true, frame = 0, lastTime = 0, target = 0, current = 0, active = -1, portrait = false;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .025);
  room.dispose(); pmrem.dispose();
  scene.environment = environment.texture; scene.environmentIntensity = .68;
  scene.add(new THREE.HemisphereLight(0xf5f2eb, 0x1b222e, .66));
  const key = new THREE.DirectionalLight(0xfff7ee, 3.3);
  key.position.set(-3.8, 6, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 5, bottom: -6, near: .2, far: 22 });
  key.shadow.bias = -.00012; key.shadow.normalBias = .016; key.shadow.radius = 3;
  scene.add(key);
  const edge = new THREE.DirectionalLight(0xdce8ff, 2.1); edge.position.set(4, 3, -4); scene.add(edge);
  const fill = new THREE.DirectionalLight(0xffffff, .45); fill.position.set(2, -2, 5); scene.add(fill);
  const model = createPolaroidModel(); scene.add(model.group);
  const rigTextures = model.textures;
  const pending = new Map<number, Promise<void>>();
  const loaded = new Map<number, THREE.CanvasTexture>();
  const columns = 12, rows = 56;
  const sheets = photos.map(photo => {
    const width = 2.46;
    const imageHeight = clamp(2.16 * photo.height / photo.width, 1.30, 2.85);
    const height = imageHeight + .48;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((columns + 1) * (rows + 1) * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((columns + 1) * (rows + 1) * 2), 2).setUsage(THREE.DynamicDrawUsage));
    const indices: number[] = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + 1, c = a + columns + 1, d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
    geometry.setIndex(indices);
    const material = new THREE.MeshPhysicalMaterial({ color: 0xf2eee4, roughness: .64, metalness: 0, clearcoat: .13, clearcoatRoughness: .5, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false; scene.add(mesh);
    return { width, height, imageHeight, geometry, material, mesh };
  });

  async function loadTexture(index: number): Promise<void> {
    if (index < 0 || index >= photos.length || disposed || loaded.has(index)) return;
    if (pending.has(index)) return pending.get(index);
    const job = new Promise<void>(resolve => {
      const image = new Image(); image.decoding = 'async';
      image.onload = () => {
        if (disposed) { resolve(); return; }
        if (active >= 0 && Math.abs(index - active) > 2) { pending.delete(index); resolve(); return; }
        const sheet = sheets[index], canvas = document.createElement('canvas');
        const scale = 1536 / sheet.width;
        canvas.width = 1536; canvas.height = Math.round(sheet.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#f2eee4'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        const ratio = Math.min(2.16 * scale / image.naturalWidth, sheet.imageHeight * scale / image.naturalHeight);
        const w = image.naturalWidth * ratio, h = image.naturalHeight * ratio;
        ctx.drawImage(image, (canvas.width - w) / 2, .14 * scale + (sheet.imageHeight * scale - h) / 2, w, h);
        ctx.strokeStyle = '#292b2722'; ctx.lineWidth = 1; ctx.strokeRect((canvas.width - w) / 2, .14 * scale + (sheet.imageHeight * scale - h) / 2, w, h);
        ctx.font = `${Math.round(scale * .038)}px Arial, sans-serif`; ctx.fillStyle = '#67645f';
        ctx.fillText(photos[index].title, .15 * scale, canvas.height - .12 * scale);
        ctx.textAlign = 'right'; ctx.fillText(String(index + 1).padStart(2, '0'), canvas.width - .15 * scale, canvas.height - .12 * scale);
        const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); loaded.set(index, texture);
        sheet.material.map = texture; sheet.material.color.set(0xffffff); sheet.material.emissiveMap = texture; sheet.material.emissive.set(0xffffff); sheet.material.emissiveIntensity = .24; sheet.material.needsUpdate = true;
        pending.delete(index); requestRender(); resolve();
      };
      image.onerror = () => { pending.delete(index); options.onError?.(); resolve(); };
      image.src = photos[index].src;
    });
    pending.set(index, job); return job;
  }
  function refreshTextures(index: number) {
    for (let n = index - 1; n <= index + 2; n++) void loadTexture(n);
    for (const [n, texture] of loaded) if (Math.abs(n - index) > 2) {
      texture.dispose(); loaded.delete(n); sheets[n].material.map = null; sheets[n].material.emissiveMap = null; sheets[n].material.needsUpdate = true;
    }
  }
  const attached = new THREE.Vector3(), presented = new THREE.Vector3();
  const presentationRotation = new THREE.Quaternion();
  const slightRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -.025);

  function update() {
    const feed = photoFeed(current, photos.length);
    const index = clamp(Math.floor(feed), 0, photos.length - 1);
    if (index !== active) { active = index; refreshTextures(index); options.onFrame?.(index); }
    const introduction = smooth(feed / .68);
    model.group.position.set(portrait ? 0 : -1.10 * introduction, .50 + introduction * (portrait ? 1.35 : .55), -.25 * introduction);
    model.group.rotation.set(.025, -.20 + introduction * .12, .018 - introduction * .03);
    model.group.scale.setScalar(1 - introduction * (portrait ? .25 : .12));
    model.group.updateMatrixWorld(true);
    model.roller.rotation.x = feed * 25;
    const release = smooth((feed % 1) / .08);
    model.shutter.position.z = .08 - (1 - release) * .018;
    model.aperture.rotation.z = release * .10;
    presentationRotation.copy(camera.quaternion).multiply(slightRoll);

    for (let n = 0; n < sheets.length; n++) {
      const sheet = sheets[n], phase = feed - n;
      sheet.mesh.visible = phase > .015 && phase < 1.06 && loaded.has(n);
      if (!sheet.mesh.visible) continue;
      const extension = smooth((phase - .015) / .405);
      const detach = smooth((phase - .45) / .22);
      const leave = smooth((phase - .83) / .23);
      const length = sheet.height * extension;
      const position = sheet.geometry.getAttribute('position') as THREE.BufferAttribute;
      const uv = sheet.geometry.getAttribute('uv') as THREE.BufferAttribute;
      const scale = portrait ? Math.min(1.12, 3.60 / sheet.height) : Math.min(1.43, 4.20 / sheet.height);
      for (let row = 0; row <= rows; row++) {
        const d = row / rows * length;
        const theta = Math.min(Math.PI / 2, Math.max(0, d - .12) / .26);
        const down = .26 * (1 - Math.cos(theta)) + Math.max(0, d - .12 - .26 * Math.PI / 2);
        const forward = Math.min(d, .12) + .26 * Math.sin(theta);
        for (let col = 0; col <= columns; col++) {
          const u = col / columns, i = row * (columns + 1) + col;
          attached.set((u - .5) * sheet.width, -.797 - down, 1.435 + forward).applyMatrix4(model.group.matrixWorld);
          presented.set((u - .5) * sheet.width * scale, (.5 - row / rows) * sheet.height * scale, Math.sin(row / rows * Math.PI) * .035);
          presented.applyQuaternion(presentationRotation);
          presented.x += portrait ? .05 : 1.38;
          presented.y += portrait ? -.58 : .04;
          presented.z += 2.95;
          attached.lerp(presented, detach);
          attached.y -= leave * 6.4;
          attached.x += leave * (portrait ? .08 : .38);
          position.setXYZ(i, attached.x, attached.y, attached.z);
          uv.setXY(i, u, extension * (1 - row / rows));
        }
      }
      position.needsUpdate = true; uv.needsUpdate = true; sheet.geometry.computeVertexNormals();
    }
  }
  function render(time: number) {
    frame = 0; if (disposed || !visible) return;
    const dt = lastTime ? Math.min(.05, (time - lastTime) / 1000) : 1 / 60; lastTime = time;
    current += (target - current) * (1 - Math.exp(-12 * dt));
    if (Math.abs(current - target) < .000025) current = target;
    update(); renderer.render(scene, camera);
    if (current !== target) frame = requestAnimationFrame(render);
  }
  function requestRender() { if (!disposed && visible && !frame) frame = requestAnimationFrame(render); }
  function resize() {
    const { width, height } = host.getBoundingClientRect(); if (!width || !height || disposed) return;
    portrait = width / height < .88;
    camera.aspect = width / height;
    const verticalFov = 34 * Math.PI / 180;
    const distance = Math.max(8.2, (portrait ? 4.3 : 7.8) / (2 * Math.tan(verticalFov / 2) * camera.aspect));
    camera.position.set(portrait ? .5 : 1.6, portrait ? 1.2 : 2, distance);
    camera.lookAt(0, .35, .6); camera.updateProjectionMatrix();
    renderer.setSize(width, height, false); requestRender();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const lost = (event: Event) => { event.preventDefault(); options.onError?.(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize();
  await loadTexture(0);
  update(); renderer.render(scene, camera); options.onReady?.();
  return {
    setProgress(progress, instant = false) { target = clamp(progress, 0, 1); if (instant) current = target; requestRender(); },
    setVisible(next) { visible = next; lastTime = 0; if (!next && frame) { cancelAnimationFrame(frame); frame = 0; } else requestRender(); },
    dispose() {
      if (disposed) return; disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(item => { if (item instanceof THREE.Mesh) { geometries.add(item.geometry); (Array.isArray(item.material) ? item.material : [item.material]).forEach(material => materials.add(material)); } });
      geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
      loaded.forEach(texture => texture.dispose()); loaded.clear(); rigTextures.forEach(texture => texture.dispose()); environment.dispose(); key.shadow.dispose();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
