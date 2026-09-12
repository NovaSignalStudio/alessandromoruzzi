import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
const port=Number(process.env.PORT||8080);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4'};
http.createServer((req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(pathname==='/'||pathname==='/local-preview.html'||pathname==='/index.html'||/^\/lavori\/serie-\d+\/?$/.test(pathname))pathname='/index.html';
    const file=path.resolve(root,'.'+pathname);
    if(!file.toLowerCase().startsWith(root.toLowerCase()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
    const size=fs.statSync(file).size;let start=0,end=size-1,status=200;
    const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':pathname.endsWith('.html')?'no-store':'public, max-age=3600','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'};
    if(req.headers.range){const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!m){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      if(!m[1])start=Math.max(0,size-Number(m[2]));else{start=Number(m[1]);if(m[2])end=Math.min(size-1,Number(m[2]));}
      if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return;}
    fs.createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch{res.writeHead(400);res.end('Bad request');}
}).listen(port,'127.0.0.1',()=>console.log(`Moruzzi — http://localhost:${port}/local-preview.html`));
