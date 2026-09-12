import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const posterCategories = ['serie-4', 'serie-5', 'serie-6', 'serie-7', 'serie-8'];
const extensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const collator = new Intl.Collator('it', { numeric: true, sensitivity: 'base' });

function exifOrientation(bytes) {
  const offset = bytes.toString('ascii', 0, 6) === 'Exif\0\0' ? 6 : 0;
  if (bytes.length < offset + 8) return 1;
  const little = bytes.toString('ascii', offset, offset + 2) === 'II';
  const big = bytes.toString('ascii', offset, offset + 2) === 'MM';
  if (!little && !big) return 1;
  const u16 = position => little ? bytes.readUInt16LE(position) : bytes.readUInt16BE(position);
  const u32 = position => little ? bytes.readUInt32LE(position) : bytes.readUInt32BE(position);
  if (u16(offset + 2) !== 42) return 1;
  const directory = offset + u32(offset + 4);
  if (directory + 2 > bytes.length) return 1;
  const count = u16(directory);
  for (let i = 0; i < count; i++) {
    const entry = directory + 2 + i * 12;
    if (entry + 12 > bytes.length) break;
    if (u16(entry) === 0x112 && u16(entry + 2) === 3 && u32(entry + 4) === 1) {
      const value = u16(entry + 8);
      return value >= 1 && value <= 8 ? value : 1;
    }
  }
  return 1;
}

export function imageDimensions(bytes) {
  let width = 0, height = 0, orientation = 1, format;
  if (bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
    if (bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Intestazione PNG non valida.');
    format = 'png';
    width = bytes.readUInt32BE(16);
    height = bytes.readUInt32BE(20);
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const size = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
      if (offset + 12 + size > bytes.length) throw new Error('File PNG incompleto.');
      if (type === 'eXIf') orientation = exifOrientation(bytes.subarray(offset + 8, offset + 8 + size));
      if (type === 'acTL') throw new Error('Usare un PNG statico, non animato.');
      offset += 12 + size;
    }
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    format = 'jpg';
    let offset = 2;
    while (offset + 1 < bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error('Segmento JPEG non valido.');
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) throw new Error('File JPEG incompleto.');
      const size = bytes.readUInt16BE(offset);
      if (size < 2 || offset + size > bytes.length) throw new Error('File JPEG incompleto.');
      if (marker === 0xe1 && bytes.toString('ascii', offset + 2, offset + 8) === 'Exif\0\0') orientation = exifOrientation(bytes.subarray(offset + 2, offset + size));
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (size < 8) throw new Error('Dimensioni JPEG non valide.');
        height = bytes.readUInt16BE(offset + 3);
        width = bytes.readUInt16BE(offset + 5);
      }
      offset += size;
    }
  } else if (bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    format = 'webp';
    if (bytes.readUInt32LE(4) + 8 > bytes.length) throw new Error('File WebP incompleto.');
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const type = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4), data = offset + 8;
      if (data + size > bytes.length) throw new Error('File WebP incompleto.');
      if (type === 'VP8X' && size >= 10) {
        if (bytes[data] & 2) throw new Error('Usare un WebP statico, non animato.');
        width = 1 + bytes.readUIntLE(data + 4, 3);
        height = 1 + bytes.readUIntLE(data + 7, 3);
      } else if (type === 'VP8 ' && size >= 10 && !width) {
        if (bytes.subarray(data + 3, data + 6).toString('hex') !== '9d012a') throw new Error('Intestazione WebP non valida.');
        width = bytes.readUInt16LE(data + 6) & 0x3fff;
        height = bytes.readUInt16LE(data + 8) & 0x3fff;
      } else if (type === 'VP8L' && size >= 5 && !width) {
        if (bytes[data] !== 0x2f) throw new Error('Intestazione WebP non valida.');
        const bits = bytes.readUInt32LE(data + 1);
        width = 1 + (bits & 0x3fff);
        height = 1 + ((bits >>> 14) & 0x3fff);
      } else if (type === 'EXIF') orientation = exifOrientation(bytes.subarray(data, data + size));
      offset = data + size + (size % 2);
    }
  }
  if (!format || width < 1 || height < 1) throw new Error('Immagine non riconosciuta: usare JPEG, PNG o WebP.');
  return { format, width: orientation >= 5 ? height : width, height: orientation >= 5 ? width : height };
}

export function importPosters({ root = projectRoot, quiet = false } = {}) {
  const inbox = path.join(root, 'public', 'poster-inbox');
  const destination = path.join(root, 'public', 'client', 'imported-posters');
  const manifestPath = path.join(root, 'src', 'data', 'poster-uploads.json');
  const galleries = [], pending = [], warnings = [];
  if (fs.existsSync(inbox)) {
    for (const item of fs.readdirSync(inbox, { withFileTypes: true })) {
      if (item.name.startsWith('.') || item.name.toLowerCase() === 'leggimi.md') continue;
      if (!item.isDirectory() || !posterCategories.includes(item.name)) {
        throw new Error(`poster-inbox/${item.name}: inserire i poster in una delle cartelle ${posterCategories.join(', ')}.`);
      }
    }
  }
  for (const galleryId of posterCategories) {
    const folder = path.join(inbox, galleryId);
    if (!fs.existsSync(folder)) continue;
    const files = fs.readdirSync(folder, { withFileTypes: true })
      .filter(file => !file.name.startsWith('.'))
      .sort((a, b) => collator.compare(a.name, b.name) || (a.name < b.name ? -1 : 1));
    const images = [], seen = new Set();
    for (const file of files) {
      const source = path.join(folder, file.name), label = `poster-inbox/${galleryId}/${file.name}`;
      if (!file.isFile() || !extensions.has(path.extname(file.name).toLowerCase())) {
        throw new Error(`${label}: sono ammessi soltanto file .jpg, .jpeg, .png e .webp.`);
      }
      const bytes = fs.readFileSync(source);
      let dimensions;
      try { dimensions = imageDimensions(bytes); } catch (error) { throw new Error(`${label}: ${error.message}`); }
      const actualExtension = path.extname(file.name).slice(1).toLowerCase().replace('jpeg', 'jpg');
      if (actualExtension !== dimensions.format) throw new Error(`${label}: estensione diversa dal formato reale (${dimensions.format}).`);
      const digest = createHash('sha256').update(bytes).digest('hex');
      if (seen.has(digest)) { warnings.push(`${label}: duplicato nella stessa categoria, ignorato.`); continue; }
      seen.add(digest);
      const filename = `poster-${galleryId}-${digest.slice(0, 20)}.${dimensions.format}`;
      const src = `/client/imported-posters/${filename}`;
      images.push({ src, thumb: src, width: dimensions.width, height: dimensions.height, original: file.name });
      pending.push({ source, filename });
      if (bytes.length > 8 * 1024 * 1024) warnings.push(`${label}: oltre 8 MB. Esportare una copia per il web per velocizzare il caricamento.`);
    }
    if (images.length) galleries.push({ galleryId, images });
  }
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.mkdirSync(destination, { recursive: true });
  for (const { source, filename } of pending) fs.copyFileSync(source, path.join(destination, filename));
  const nextManifest = JSON.stringify(galleries, null, 2) + '\n';
  if (!fs.existsSync(manifestPath) || fs.readFileSync(manifestPath, 'utf8') !== nextManifest) fs.writeFileSync(manifestPath, nextManifest);
  const activeFiles = new Set(pending.map(file => file.filename));
  for (const file of fs.readdirSync(destination, { withFileTypes: true })) {
    if (file.isFile() && /^poster-serie-[4-8]-[a-f0-9]{20}\.(jpg|png|webp)$/.test(file.name) && !activeFiles.has(file.name)) {
      fs.unlinkSync(path.join(destination, file.name));
    }
  }
  if (!quiet) {
    for (const warning of warnings) console.warn(warning);
    console.log(`Poster importati: ${pending.length} in ${galleries.length} categorie. Gli originali del portfolio sono conservati.`);
  }
  return { galleries, count: pending.length, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { importPosters(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
