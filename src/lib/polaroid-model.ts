import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export function createPolaroidModel() {
  const group = new THREE.Group();
  group.name = 'OneStep 2 — studio model';
  const textures: THREE.Texture[] = [];
  let seed = 17;
  const noise = new Uint8Array(256 * 256 * 4);
  for (let i = 0; i < noise.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const n = 145 + (seed >>> 26);
    noise[i] = noise[i + 1] = noise[i + 2] = n; noise[i + 3] = 255;
  }
  const grain = new THREE.DataTexture(noise, 256, 256);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.repeat.set(5, 5); grain.needsUpdate = true; textures.push(grain);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0xe3dfd5, roughness: .34, metalness: 0, clearcoat: .24, clearcoatRoughness: .32, bumpMap: grain, bumpScale: .008 });
  const plastic = new THREE.MeshPhysicalMaterial({ color: 0x181b1c, roughness: .4, metalness: 0, clearcoat: .18, clearcoatRoughness: .42, bumpMap: grain, bumpScale: .009 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x080909, roughness: .84, bumpMap: grain, bumpScale: .011 });
  const interior = new THREE.MeshStandardMaterial({ color: 0x020303, roughness: .8 });
  const silver = new THREE.MeshStandardMaterial({ color: 0xa7aaac, metalness: 1, roughness: .3 });
  const lensRim = new THREE.MeshPhysicalMaterial({ color: 0x24282c, roughness: .26, metalness: .5, clearcoat: .5 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xcb3425, roughness: .26, clearcoat: .6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xdca72a, roughness: .43 });
  const optical = new THREE.MeshPhysicalMaterial({ color: 0x091b1e, metalness: .4, roughness: .065, clearcoat: 1, iridescence: .45, iridescenceIOR: 1.35, iridescenceThicknessRange: [160, 330] });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xc4d3d7, metalness: .08, roughness: .04, clearcoat: 1, transparent: true, opacity: .24, depthWrite: false });
  const flashMaterial = new THREE.MeshPhysicalMaterial({ color: 0xc6c7c3, roughness: .2, metalness: .3, clearcoat: .8, emissive: 0xfff4e4, emissiveIntensity: 0 });

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z); part.castShadow = true; part.receiveShadow = true; parent.add(part); return part;
  }
  function box(w: number, h: number, d: number, r: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) {
    return mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat, x, y, z, parent);
  }
  function cylinder(radius: number, depth: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group) {
    const part = mesh(new THREE.CylinderGeometry(radius, radius, depth, 80), mat, x, y, z, parent);
    part.rotation.x = Math.PI / 2; return part;
  }
  function ring(radius: number, tube: number, mat: THREE.Material, z: number, parent: THREE.Object3D) {
    return mesh(new THREE.TorusGeometry(radius, tube, 12, 96), mat, 0, 0, z, parent);
  }
  function prism(points: number[][], width: number, mat: THREE.Material, bevel = .04) {
    const shape = new THREE.Shape();
    points.forEach(([z, y], i) => i ? shape.lineTo(-z, y) : shape.moveTo(-z, y));
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: width - bevel * 2, steps: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 12 });
    geometry.rotateY(Math.PI / 2); geometry.translate(-width / 2 + bevel, 0, 0);
    return mesh(geometry, mat, 0, 0, 0);
  }
  function text(label: string, w: number, h: number, x: number, y: number, z: number, color: string, parent: THREE.Object3D = group, weight = 500) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = Math.round(1024 * h / w);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${canvas.height * .8}px Arial, sans-serif`; ctx.fillText(label, canvas.width / 2, canvas.height * .53);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture);
    const part = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2 }), x, y, z, parent);
    part.castShadow = false; return part;
  }

  prism([[-1.37, -.71], [-1.37, .69], [-.85, 1.11], [.37, 1.11], [.62, .89], [.75, -.41], [1.25, -.65]], 3.16, shell, .07);
  prism([[-1.44, -.74], [-1.38, -.98], [1.28, -.98], [1.42, -.83], [1.37, -.66], [.73, -.45], [.68, -.65]], 3.23, plastic, .048);
  prism([[.72, -.42], [1.32, -.64], [1.34, -.69], [.73, -.47]], 3.09, shell, .013);
  box(3.12, .035, 2.5, .015, rubber, 0, -.733, -.06);
  box(2.77, .048, .13, .015, interior, 0, -.787, 1.408);
  box(2.86, .055, .115, .02, plastic, 0, -.729, 1.415);
  box(2.82, .045, .105, .014, plastic, 0, -.846, 1.424);
  box(2.67, .012, .16, .005, rubber, 0, -.764, 1.419);
  const roller = mesh(new THREE.CylinderGeometry(.029, .029, 2.72, 64), silver, 0, -.816, 1.369);
  roller.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    box(.028, .08, .2, .009, plastic, side * 1.602, -.49, .24);
    const eye = mesh(new THREE.TorusGeometry(.084, .018, 10, 32), silver, side * 1.61, -.30, -.58);
    eye.rotation.y = Math.PI / 2;
    box(.052, .25, .38, .025, rubber, side * 1.604, -.17, -.42);
    for (const z of [-1.04, .99]) {
      const screw = cylinder(.028, .012, silver, side * 1.38, -.985, z);
      screw.rotation.x = 0;
      box(.031, .004, .007, .002, interior, side * 1.38, -.994, z);
    }
  }

  const front = new THREE.Group(); front.position.set(0, .34, .674); front.rotation.x = -.1; group.add(front);
  box(2.95, 1.36, .041, .13, shell, 0, .048, -.04, front);
  const lens = new THREE.Group(); lens.position.set(.045, .075, .01); front.add(lens);
  cylinder(.655, .085, plastic, 0, 0, .042, lens);
  cylinder(.612, .14, lensRim, 0, 0, .136, lens);
  cylinder(.568, .178, plastic, 0, 0, .23, lens);
  for (let i = 0; i < 84; i++) {
    const angle = i / 84 * Math.PI * 2;
    const tooth = box(.009, .039, .154, .003, lensRim, Math.cos(angle) * .563, Math.sin(angle) * .563, .229, lens);
    tooth.rotation.z = angle - Math.PI / 2;
  }
  ring(.548, .012, lensRim, .322, lens);
  cylinder(.52, .026, interior, 0, 0, .324, lens);
  ring(.437, .011, plastic, .343, lens);
  ring(.405, .008, lensRim, .347, lens);
  cylinder(.397, .02, optical, 0, 0, .35, lens);
  ring(.299, .005, lensRim, .365, lens);
  cylinder(.252, .008, interior, 0, 0, .368, lens);
  const aperture = new THREE.Group(); lens.add(aperture);
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const leaf = mesh(new THREE.CircleGeometry(.143, 3), lensRim, Math.cos(a) * .137, Math.sin(a) * .137, .375, aperture);
    leaf.rotation.z = a + .35;
  }
  cylinder(.074, .005, interior, 0, 0, .379, lens);
  const cap = mesh(new THREE.SphereGeometry(1.2, 80, 32, 0, Math.PI * 2, 0, .337), glass, 0, 0, -.773, lens);
  cap.rotation.x = Math.PI / 2; cap.castShadow = false;
  text('POLAROID  ·  106mm', .61, .052, 0, .487, .351, '#96958e', lens);
  text('FIXED FOCUS', .46, .044, 0, -.487, .351, '#96958e', lens);

  box(.74, .53, .057, .046, plastic, -.963, .342, .026, front);
  box(.632, .429, .035, .022, silver, -.963, .342, .059, front);
  box(.59, .384, .028, .015, flashMaterial, -.963, .342, .081, front);
  for (let i = 0; i < 27; i++) box(.008, .357, .014, .002, silver, -1.241 + i * .0214, .342, .102, front);
  box(.59, .025, .014, .002, silver, -.963, .342, .109, front);
  box(.60, .48, .14, .062, plastic, 1.006, .382, .058, front);
  box(.475, .348, .047, .032, rubber, 1.006, .382, .139, front);
  box(.358, .238, .016, .017, optical, 1.006, .382, .169, front);
  const vfGlass = box(.335, .211, .014, .011, glass, 1.006, .382, .183, front); vfGlass.castShadow = false;
  box(.58, .34, .54, .06, plastic, 1.006, .789, -.917);
  cylinder(.238, .055, plastic, -.956, -.27, .033, front);
  const shutter = cylinder(.199, .065, red, -.956, -.27, .080, front);
  box(.50, .052, .019, .016, plastic, .985, -.16, .027, front);
  box(.053, .102, .042, .012, yellow, .996, -.16, .055, front);
  text('−              +', .59, .071, .985, -.26, .035, '#383a37', front);
  cylinder(.075, .023, plastic, .986, -.407, .03, front);
  cylinder(.039, .013, optical, .986, -.407, .048, front);
  text('OneStep 2', .51, .081, -1.004, -.535, .03, '#454742', front, 600);

  const branding = new THREE.Group(); branding.position.set(0, -.493, .992); branding.rotation.x = -.34; group.add(branding);
  text('Polaroid', .80, .135, 0, 0, .018, '#202322', branding, 700);
  const colors = [0xe75c3d, 0xe8903e, 0xebc851, 0x77a389, 0x598eac];
  colors.forEach((color, i) => box(.049, .081, .003, .001, new THREE.MeshStandardMaterial({ color, roughness: .44 }), (i - 2) * .052, -.124, .018, branding));
  text('i-TYPE CAMERA', .42, .037, .92, -.856, 1.483, '#9b9f9f');
  text('ORIGINALS', .45, .041, -.91, -.856, 1.483, '#858988');
  for (let i = 0; i < 8; i++) {
    const led = cylinder(.014, .008, new THREE.MeshStandardMaterial({ color: 0xbc6e29, emissive: 0xe99438, emissiveIntensity: .4 }), -.18 + i * .054, 1.177, -.54);
    led.rotation.x = 0;
  }
  return { group, roller, shutter, flashMaterial, aperture, textures };
}
