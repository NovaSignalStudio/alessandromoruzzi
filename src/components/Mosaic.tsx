import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { clientGalleries, featuredPrints, type ClientGallery } from '@/data/client';
import PosterExperience from './PosterExperience';

function GalleryCard({gallery,index}:{gallery:ClientGallery;index:number}){
  const [hover,setHover]=useState(false);
  const [frame,setFrame]=useState(0);
  const hovered=useRef(false);
  useEffect(()=>{
    hovered.current=hover;
    if(!hover){setFrame(0);return;}
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||gallery.images.length<2)return;
    let next=0;
    const timer=window.setInterval(()=>{
      if(document.hidden)return;
      next=(next+1)%gallery.images.length;
      const nextFrame=next;const preload=new Image();
      preload.src=gallery.images[nextFrame].thumb;
      preload.decode().then(()=>{if(hovered.current)setFrame(nextFrame);}).catch(()=>{});
    },2500);
    return()=>{hovered.current=false;window.clearInterval(timer);};
  },[hover,gallery]);
  const photo=gallery.images[frame];
  return <Link to={`/lavori/${gallery.id}`} className={`project-card ${gallery.category==='Grafica'?'graphic-card':''}`}
    onPointerEnter={e=>{if(e.pointerType==='mouse')setHover(true);}} onPointerLeave={()=>setHover(false)}
    onFocus={()=>setHover(true)} onBlur={()=>setHover(false)}
    aria-label={`Apri ${gallery.title}, ${gallery.images.length} immagini`}>
    <span className="project-image" style={{'--cover-ratio':gallery.images[0].width/gallery.images[0].height,aspectRatio:gallery.category==='Grafica'?'4 / 5':undefined} as CSSProperties}>
      <img src={gallery.images[0].thumb} alt="" aria-hidden="true" loading="lazy" width={gallery.images[0].width} height={gallery.images[0].height}/>
      <img key={photo.src} className="project-preview" src={photo.thumb} alt={gallery.title} loading="lazy" width={photo.width} height={photo.height}/>
      <span className="project-open" aria-hidden="true">↗</span>
      <span className="project-frame" aria-hidden="true">{String(frame+1).padStart(2,'0')} / {String(gallery.images.length).padStart(2,'0')}</span>
      {hover&&gallery.images.length>1&&<span className="preview-timer" key={frame}/>}
    </span>
    <span className="project-caption"><span className="project-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span className="project-title">{gallery.title}</span><span className="project-caption-arrow" aria-hidden="true">↗</span><span className="project-type">{gallery.category==='Analogiche'?'Su pellicola':gallery.category==='Fotografia'?'Fotografia di moda':'Progetto grafico'}<span aria-hidden="true"> · </span>{String(gallery.images.length).padStart(2,'0')} {gallery.category==='Grafica'?'elaborati':'fotografie'}</span></span>
  </Link>;
}

export default function Mosaic(){
  const campaigns=clientGalleries.filter(g=>g.category==='Fotografia');
  const analog=clientGalleries.filter(g=>g.category==='Analogiche');
  const graphics=clientGalleries.filter(g=>g.category==='Grafica');
  return <div id="lavori">
    <section className="work-section page-padding photography-section" id="fotografia" aria-labelledby="photography-title">
      <div className="work-intro"><span className="section-index">01 / Fotografia</span><h2 id="photography-title">Fotografia<span aria-hidden="true">.</span></h2><div className="work-intro-note"><p>Campagne di moda e ricerca personale su pellicola.</p><a href="#grafica">Esplora anche la grafica <span aria-hidden="true">↓</span></a></div></div>
      <div className="discipline-subheading"><h3>Campagne di moda</h3><span>{String(campaigns.length).padStart(2,'0')} serie</span></div>
      <div className="project-grid photography-grid campaign-grid">{campaigns.map((g,i)=><GalleryCard gallery={g} index={i} key={g.id}/>)}</div>
      <div className="discipline-subheading analog-heading"><h3>Ricerca analogica</h3><span>{String(analog.length).padStart(2,'0')} serie</span></div>
      <div className="project-grid photography-grid analog-grid">{analog.map((g,i)=><GalleryCard gallery={g} index={i+campaigns.length} key={g.id}/>)}</div>
    </section>
    <section className="work-section page-padding graphics-section" id="grafica" aria-labelledby="graphics-title">
      <div className="work-intro"><span className="section-index">02 / Grafica</span><h2 id="graphics-title">Grafica<span aria-hidden="true">.</span></h2><div className="work-intro-note"><p>Manifesti, collage e comunicazione visiva.</p><a href="#progetti-grafici">Esplora i progetti <span aria-hidden="true">↓</span></a></div></div>
      <PosterExperience posters={featuredPrints}/>
      <div className="discipline-subheading" id="progetti-grafici"><h3>Progetti selezionati</h3><span>{String(graphics.length).padStart(2,'0')} progetti</span></div>
      <div className="project-grid graphics-grid">{graphics.map((g,i)=><GalleryCard gallery={g} index={i} key={g.id}/>)}</div>
    </section>
  </div>;
}
