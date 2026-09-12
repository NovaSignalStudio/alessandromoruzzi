import type { ClientGallery } from '@/data/client';
import { useLightbox, type LightboxItem } from './Lightbox';
import '@/photo-print.css';

export default function PhotoPrintSequence({gallery}:{gallery:ClientGallery}){
  const {open}=useLightbox();
  const items:LightboxItem[]=gallery.images.map(photo=>({image:photo.src,thumb:photo.thumb,caption:gallery.title,meta:'Fotografia'}));
  if(gallery.video)items.push({image:gallery.images[0].src,video:gallery.video,caption:gallery.title+' — video',meta:'Fotografia'});
  const show=(index:number)=>open(items,index,{title:gallery.title,description:gallery.description,category:'Fotografia'});
  return <section id="collezione" className="photo-print-sequence page-padding" aria-label={`Stampe fotografiche — ${gallery.title}`}>
    <aside className="photo-print-rail"><span className="section-index">Indice fotografico / {String(gallery.images.length).padStart(2,'0')}</span><h2>La serie<br/>completa.</h2><p>Ogni immagine, nel suo formato originale.</p><button className="text-button" type="button" onClick={()=>show(0)}>Sfoglia a schermo intero <span aria-hidden="true">↗</span></button></aside>
    <div className="photo-print-flow">{gallery.images.map((photo,index)=><div key={photo.src} className={`photo-print-step ${photo.width/photo.height>1.2?'is-landscape':'is-portrait'}`}>
      <button type="button" className="instant-paper" onClick={()=>show(index)} aria-label={`Ingrandisci ${gallery.title}, fotografia ${index+1}`}>
        <span className="instant-image"><img src={photo.src} width={photo.width} height={photo.height} alt={`${gallery.title} — ${index+1}`} loading="lazy"/></span>
        <span className="instant-caption"><span>{String(index+1).padStart(2,'0')} / {gallery.title}</span><span aria-hidden="true">↗</span></span>
      </button>
    </div>)}
      {gallery.video&&<button type="button" className="photo-sequence-video" onClick={()=>show(gallery.images.length)}><span aria-hidden="true">▶</span> Guarda il video della serie <span aria-hidden="true">↗</span></button>}
    </div>
  </section>;
}
