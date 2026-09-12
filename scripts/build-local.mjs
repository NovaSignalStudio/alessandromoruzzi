import { build } from 'vite';
import ts from 'typescript';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { importPosters } from './import-posters.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = ('/' + (process.env.VITE_BASE_PATH || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
const outDir = process.env.BUILD_OUT_DIR || 'dist';
const output = path.resolve(root, outDir);
for(const folder of ['client','fonts']){
  const publicPath=path.join(root,'public',folder),distPath=path.join(root,'dist',folder);
  if(!fs.existsSync(publicPath)&&fs.existsSync(distPath))fs.cpSync(distPath,publicPath,{recursive:true});
}
importPosters({ root });
await build({
  root, base, configFile: false, esbuild: false,
  plugins: [{ name:'typescript-in-process', enforce:'pre', transform(code,id) {
    code=code.replaceAll('process.env.NODE_ENV','"production"').replaceAll('import.meta.env.BASE_URL',JSON.stringify(base)).replaceAll('runtime.__MORUZZI_BASE_PATH__',JSON.stringify(base)).replaceAll('import.meta.env.VITE_PREVIEW','false').replaceAll('import.meta.env.DEV','false').replaceAll('import.meta.env.PROD','true');
    if (!/\.tsx?(?:\?|$)/.test(id) || id.includes('node_modules')) return {code,map:null};
    return { code:ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText, map:null };
  }}],
  resolve:{alias:{'@':path.join(root,'src')},preserveSymlinks:true},
  build:{outDir,minify:false,cssMinify:false,copyPublicDir:false},
});
for (const folder of ['client','fonts']) {
  const source=path.join(root,'public',folder);
  if(fs.existsSync(source)) fs.cpSync(source,path.join(output,folder),{recursive:true});
}
fs.mkdirSync(path.join(output,'img'),{recursive:true});
fs.copyFileSync(path.join(root,'public/img/portrait-author.jpg'),path.join(output,'img/portrait-author.jpg'));
fs.copyFileSync(path.join(output,'index.html'),path.join(output,'local-preview.html'));
fs.copyFileSync(path.join(output,'index.html'),path.join(output,'404.html'));
const galleries=JSON.parse(fs.readFileSync(path.join(root,'src/data/client-assets.json'),'utf8'));
for(let index=1;index<=galleries.length;index++){
  const route=path.join(output,'lavori',`serie-${index}`);
  fs.mkdirSync(route,{recursive:true});
  fs.copyFileSync(path.join(output,'index.html'),path.join(route,'index.html'));
}
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log(`Build: ${outDir} (${base})`);
