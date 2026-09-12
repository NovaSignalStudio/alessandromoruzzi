import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { clientGalleries, disciplineOf, sectionOf, type ClientGallery } from '@/data/client';
import Contact from '@/components/Contact';
import PosterExperience from '@/components/PosterExperience';
import InstantPhotoExperience from '@/components/InstantPhotoExperience';
import PhotoPrintSequence from '@/components/PhotoPrintSequence';
import { LightboxProvider, useLightbox } from '@/components/Lightbox';

function GraphicCollection({gallery}:{gallery:ClientGallery}){
  const {open}=useLightbox();
  const posters=useMemo(()=>gallery.images.map(photo=>({...photo,title:gallery.title,galleryId:gallery.id})),[gallery]);
  const show=(index:number)=>open(gallery.images.map(photo=>({image:photo.src,thumb:photo.thumb,caption:gallery.title,meta:'Grafica'})),index,{title:gallery.title,description:gallery.description,category:'Grafica'});
  return <>
    <PosterExperience key={gallery.id} posters={posters} collectionId="collezione" project/>
    <section id="collezione" className="print-collection project-collection graphic-collection page-padding" aria-label={`Elaborati — ${gallery.title}`}>
      <div className="collection-heading"><div><span className="section-index">{String(gallery.images.length).padStart(2,'0')} elaborati</span><h2>Il progetto</h2></div><button type="button" onClick={()=>show(0)}>Apri galleria <span aria-hidden="true">↗</span></button></div>
      <div className="collection-grid">{gallery.images.map((photo,index)=><button type="button" key={photo.src} onClick={()=>show(index)} aria-label={`Ingrandisci ${gallery.title}, elaborato ${index+1}`}><img src={photo.src} width={photo.width} height={photo.height} alt={`${gallery.title} — elaborato ${index+1}`} loading="lazy"/><span>{String(index+1).padStart(2,'0')}</span></button>)}</div>
    </section>
  </>;
}

function ProjectContent(){
  const {id}=useParams();
  const gallery=clientGalleries.find(item=>item.id===id);
  const cameraPhotos=useMemo(()=>gallery?.images.map(photo=>({...photo,title:gallery.title,galleryId:gallery.id}))??[],[gallery]);
  useEffect(()=>{
    const previousTitle=document.title;
    document.title=gallery?`${gallery.title} — ${disciplineOf(gallery)} — Alessandro Moruzzi`:'Serie non trovata — Alessandro Moruzzi';
    return()=>{document.title=previousTitle;};
  },[gallery]);
  if(!gallery)return <main className="not-found"><h1>Serie non trovata</h1><Link to="/#fotografia">Torna ai lavori</Link></main>;
  const discipline=disciplineOf(gallery);
  const related=clientGalleries.filter(item=>disciplineOf(item)===discipline);
  const currentIndex=related.findIndex(item=>item.id===gallery.id);
  const next=related[(currentIndex+1)%related.length];
  return <main className={`project-page ${discipline==='Grafica'?'graphic-project':'photographic-project'}`}>
    <header className="project-header page-padding"><Link className="project-back" to={`/#${sectionOf(gallery)}`}>← {discipline}</Link><Link className="project-wordmark" to="/" aria-label="Alessandro Moruzzi — inizio">moruzzi</Link><span className="section-index">{String(currentIndex+1).padStart(2,'0')} / {String(related.length).padStart(2,'0')}</span></header>
    {discipline==='Fotografia'&&<InstantPhotoExperience key={gallery.id} posters={cameraPhotos} collectionId="collezione"/>}
    <section className="project-hero page-padding"><div><span className="section-index">{discipline==='Grafica'?'Progetto grafico':gallery.category==='Analogiche'?'Fotografia analogica':'Fotografia di moda'}</span><h1>{gallery.title}</h1></div><div className="project-introduction"><p>{gallery.description}</p><dl className="project-facts"><div><dt>Disciplina</dt><dd>{discipline}</dd></div><div><dt>Selezione</dt><dd>{String(gallery.images.length).padStart(2,'0')} {discipline==='Grafica'?'elaborati':'fotografie'}</dd></div></dl><a href="#collezione">{discipline==='Grafica'?'Gli elaborati':'Le fotografie'} <span aria-hidden="true">↓</span></a></div></section>
    {discipline==='Grafica'?<GraphicCollection gallery={gallery}/>:<PhotoPrintSequence key={`${gallery.id}-gallery`} gallery={gallery}/>} 
    <Link className="next-project page-padding" to={`/lavori/${next.id}`}><span>{discipline} / {discipline==='Grafica'?'Prossimo progetto':'Prossima serie'}</span><strong>{next.title} <b aria-hidden="true">↗</b></strong></Link>
    <Contact/>
  </main>;
}

export default function Project(){return <LightboxProvider><div className="portfolio-shell"><ProjectContent/></div></LightboxProvider>;}
