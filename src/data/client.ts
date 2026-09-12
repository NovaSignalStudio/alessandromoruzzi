import inventory from './client-assets.json';
import posterUploads from './poster-uploads.json';
import { assetUrl } from '@/lib/paths';

export type ClientPhoto={src:string;thumb:string;width:number;height:number;original:string};
export type ClientGallery={id:string;title:string;category:'Fotografia'|'Grafica'|'Analogiche';description:string;images:ClientPhoto[];video?:string};
export const disciplineOf=(gallery:ClientGallery)=>gallery.category==='Grafica'?'Grafica':'Fotografia';
export const sectionOf=(gallery:ClientGallery)=>gallery.category==='Grafica'?'grafica':'fotografia';
const naming:Record<string,{title:string;description:string;cover?:number}>={
  'Fotografia/Doppel/1':{title:'Doppelgänger / 01',description:'Fotografia di moda. La prima serie della selezione Doppelgänger.',cover:0},
  'Fotografia/Doppel/2':{title:'Doppelgänger / 02',description:'Ritratti, movimento e luce nella seconda serie Doppelgänger.',cover:0},
  'Fotografia/Doppel/3':{title:'Doppelgänger / 03',description:'Una sequenza di ritratti e immagini di moda per Doppelgänger.',cover:3},
  'Grafica/1':{title:'Manifesti / 01',description:'Progettazione grafica per la stampa.'},
  'Grafica/2':{title:'Blue, Black, Red, Green',description:'Quattro composizioni: colore, collage e tipografia.'},
  'Grafica/3':{title:'Doppelgänger / Visual',description:'Comunicazione visiva per Doppelgänger.'},
  'Grafica/poster/1':{title:'Collage / 01',description:'Composizioni grafiche tra fotografia e illustrazione.'},
  'Grafica/poster':{title:'Poster',description:'Una selezione di manifesti, collage e studi tipografici.',cover:2},
  'Fotografia/Analogiche/Bn':{title:'Bianco e nero',description:'Fotografia analogica. Persone, gesti e frammenti di città.'},
  'Fotografia/Analogiche/Chroma delay':{title:'Chroma delay',description:'Paesaggi, luce e variazioni cromatiche su pellicola.',cover:3},
  'Fotografia/Analogiche/Giorgio':{title:'Giorgio',description:'Luce di scena e movimento. Una serie su pellicola.',cover:3},
  'Fotografia/Analogiche/Medio formato':{title:'Medio formato',description:'Ritratti e sovrapposizioni. Fotografia analogica.'},
  'Fotografia/Analogiche/ecn':{title:'ECN',description:'Appunti di città. Fotografia analogica.'},
};
export const clientGalleries:ClientGallery[]=Object.keys(naming).map((folder,index)=>{
  const group=inventory.find(g=>g.folder===folder)!;const info=naming[folder];
  const images=group.images.map(photo=>({...photo,src:assetUrl(photo.src),thumb:assetUrl(photo.thumb)}));const cover=info.cover??0;
  if(cover)images.unshift(...images.splice(cover,1));
  const uploaded=(posterUploads as {galleryId:string;images:ClientPhoto[]}[]).find(gallery=>gallery.galleryId===`serie-${index+1}`);
  if(uploaded)images.push(...uploaded.images.map(photo=>({...photo,src:assetUrl(photo.src),thumb:assetUrl(photo.thumb)})));
  return {id:`serie-${index+1}`,title:info.title,description:info.description,category:folder.includes('Analogiche')?'Analogiche':folder.startsWith('Grafica')?'Grafica':'Fotografia',images,video:folder==='Fotografia/Doppel/1'?assetUrl('/client/storiella.mp4'):undefined};
});

export const graphicPrints=clientGalleries.filter(g=>g.category==='Grafica').flatMap(g=>g.images.map(photo=>({...photo,title:g.title,galleryId:g.id})));
export const featuredPrints=['853856e9b60c','9995a269c311','14e3cb2f4323','b1e45653231c','17a6a511aa6b'].map(name=>graphicPrints.find(photo=>photo.src.includes(name))).filter((photo):photo is typeof graphicPrints[number]=>!!photo);

const filmNames=['dc7a9b5f8232','339a2017b45c','b4c0939bc71b','6e2420269f93','40b1222e9142','1b20fe13f4f5','a552a82d672a','9ca6c35945b7'];
export const analogFilm=filmNames.map(name=>{
  const group=inventory.find(g=>g.folder.includes('Analogiche')&&g.images.some(im=>im.src.includes(name)))!;
  const photo=group.images.find(im=>im.src.includes(name))!;
  return {...photo,src:assetUrl(photo.src),thumb:assetUrl(photo.thumb),series:naming[group.folder].title};
});
