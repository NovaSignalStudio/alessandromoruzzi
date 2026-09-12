import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';
import { imageDimensions, importPosters } from './import-posters.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD54AAAAASUVORK5CYII=', 'base64');
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'src/data/client-assets.json'), 'utf8'));
const first = inventory[0].images[0];
const webp = fs.readFileSync(path.join(root, 'public', first.src.slice(1)));

function workspace(t) {
  const work = path.join(root, 'work');
  fs.mkdirSync(work, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(work, 'poster-import-test-'));
  t.after(() => {
    const target = fs.realpathSync(temporary), parent = fs.realpathSync(work);
    assert.equal(path.dirname(target), parent);
    assert.ok(path.basename(target).startsWith('poster-import-test-'));
    fs.rmSync(target, { recursive: true, force: true });
  });
  const folder = path.join(temporary, 'public/poster-inbox/serie-8');
  fs.mkdirSync(folder, { recursive: true });
  return { temporary, folder };
}

test('reads dimensions from the actual portfolio WebP files and a PNG', () => {
  assert.deepEqual(imageDimensions(png), { format: 'png', width: 1, height: 1 });
  assert.deepEqual(imageDimensions(webp), { format: 'webp', width: 2100, height: 1400 });
  for (const photo of inventory.flatMap(gallery => gallery.images)) {
    const dimensions = imageDimensions(fs.readFileSync(path.join(root, 'public', photo.src.slice(1))));
    assert.ok(dimensions.width > 0 && dimensions.height > 0, photo.src);
    assert.ok(Math.abs(dimensions.width / dimensions.height - photo.width / photo.height) < 0.002, photo.src);
  }
  const portrait = fs.readFileSync(path.join(root, 'public/img/portrait-author.jpg'));
  assert.equal(imageDimensions(portrait).format, 'jpg');
});

test('uses EXIF display orientation without letting a subsequent XMP block reset it', () => {
  const exif = Buffer.alloc(32);
  exif.write('Exif\0\0', 0, 'ascii');
  exif.write('II', 6, 'ascii');
  exif.writeUInt16LE(42, 8);
  exif.writeUInt32LE(8, 10);
  exif.writeUInt16LE(1, 14);
  exif.writeUInt16LE(0x112, 16);
  exif.writeUInt16LE(3, 18);
  exif.writeUInt32LE(1, 20);
  exif.writeUInt16LE(6, 24);
  const jpeg = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 34]), exif,
    Buffer.from([0xff, 0xe1, 0, 5, 0x58, 0x4d, 0x50]),
    Buffer.from([0xff, 0xc2, 0, 11, 8, 0, 40, 0, 60, 1, 1, 0x11, 0, 0xff, 0xd9]),
  ]);
  assert.deepEqual(imageDimensions(jpeg), { format: 'jpg', width: 40, height: 60 });
});

test('imports by category and numerical order, keeping original bytes and avoiding duplicates', t => {
  const { temporary, folder } = workspace(t);
  fs.writeFileSync(path.join(folder, '10-città.webp'), webp);
  fs.writeFileSync(path.join(folder, '02-primo.png'), png);
  fs.writeFileSync(path.join(folder, '11-duplicato.webp'), webp);
  const result = importPosters({ root: temporary, quiet: true });
  assert.equal(result.count, 2);
  assert.equal(result.galleries[0].galleryId, 'serie-8');
  assert.deepEqual(result.galleries[0].images.map(image => image.original), ['02-primo.png', '10-città.webp']);
  assert.equal(result.warnings.length, 1);
  for (const image of result.galleries[0].images) {
    assert.deepEqual(fs.readFileSync(path.join(temporary, 'public', image.src.slice(1))), fs.readFileSync(path.join(folder, image.original)));
  }
  const manifest = fs.readFileSync(path.join(temporary, 'src/data/poster-uploads.json'), 'utf8');
  importPosters({ root: temporary, quiet: true });
  assert.equal(fs.readFileSync(path.join(temporary, 'src/data/poster-uploads.json'), 'utf8'), manifest);
});

test('replacing and removing a poster refreshes the manifest without touching other client assets', t => {
  const { temporary, folder } = workspace(t);
  const input = path.join(folder, 'poster.webp');
  fs.writeFileSync(input, webp);
  const original = importPosters({ root: temporary, quiet: true }).galleries[0].images[0].src;
  const preserved = path.join(temporary, 'public/client/original-client-file.txt');
  fs.writeFileSync(preserved, 'keep');
  fs.writeFileSync(input, fs.readFileSync(path.join(root, 'public', inventory[0].images[1].src.slice(1))));
  const updated = importPosters({ root: temporary, quiet: true }).galleries[0].images[0].src;
  assert.notEqual(original, updated);
  assert.equal(fs.existsSync(path.join(temporary, 'public', original.slice(1))), false);
  fs.unlinkSync(input);
  assert.equal(importPosters({ root: temporary, quiet: true }).count, 0);
  assert.equal(fs.existsSync(path.join(temporary, 'public', updated.slice(1))), false);
  assert.equal(fs.readFileSync(preserved, 'utf8'), 'keep');
});

test('rejects misplaced or malformed images before changing a published manifest', t => {
  const { temporary, folder } = workspace(t);
  fs.writeFileSync(path.join(folder, 'poster.png'), png);
  importPosters({ root: temporary, quiet: true });
  const manifest = path.join(temporary, 'src/data/poster-uploads.json');
  const previous = fs.readFileSync(manifest, 'utf8');
  const bad = path.join(folder, 'bad.webp');
  fs.writeFileSync(bad, png);
  assert.throws(() => importPosters({ root: temporary, quiet: true }), /estensione diversa/);
  assert.equal(fs.readFileSync(manifest, 'utf8'), previous);
  fs.writeFileSync(bad, webp.subarray(0, 22));
  assert.throws(() => importPosters({ root: temporary, quiet: true }), /incompleto/);
  fs.unlinkSync(bad);
  fs.writeFileSync(path.join(temporary, 'public/poster-inbox/poster.png'), png);
  assert.throws(() => importPosters({ root: temporary, quiet: true }), /inserire i poster/);
  assert.equal(fs.readFileSync(manifest, 'utf8'), previous);
});

test('adds imported posters to their original gallery and printing inventory with a deployment base path', t => {
  const { temporary, folder } = workspace(t);
  fs.writeFileSync(path.join(folder, '01-poster.png'), png);
  const { galleries } = importPosters({ root: temporary, quiet: true });
  const source = fs.readFileSync(path.join(root, 'src/data/client.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exported = {};
  new Function('require', 'exports', compiled)(name => {
    if (name === './client-assets.json') return inventory;
    if (name === './poster-uploads.json') return galleries;
    if (name === '@/lib/paths') return { assetUrl: src => '/alessandromoruzzi/' + src.replace(/^\/+/, '') };
    throw new Error(`Unexpected import: ${name}`);
  }, exported);
  assert.equal(exported.clientGalleries.length, 13);
  assert.equal(exported.clientGalleries.flatMap(gallery => gallery.images).length, inventory.flatMap(gallery => gallery.images).length + 1);
  const target = exported.clientGalleries.find(gallery => gallery.id === 'serie-8');
  const newImage = target.images.at(-1);
  assert.ok(newImage.src.startsWith('/alessandromoruzzi/client/imported-posters/'));
  assert.equal(newImage.original, '01-poster.png');
  assert.equal(exported.graphicPrints.find(poster => poster.src === newImage.src).galleryId, 'serie-8');
  assert.equal(exported.analogFilm.length, 8);
});
