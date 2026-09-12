import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
export type LightboxItem={image:string;thumb?:string;caption?:string;meta?:string;video?:string};
type GalleryInfo={title:string;description:string;category:string};
type Ctx={open:(items:LightboxItem[],index:number,info?:GalleryInfo)=>void};
const Context=createContext<Ctx>({open:()=>{}});
export const useLightbox=()=>useContext(Context);

export function LightboxProvider({children}:{children:ReactNode}){
  const [items,setItems]=useState<LightboxItem[]|null>(null);
  const [index,setIndex]=useState(0);
  const [info,setInfo]=useState<GalleryInfo|undefined>();
  const dialog=useRef<HTMLDivElement>(null);
  const opener=useRef<HTMLElement|null>(null);
  const touch=useRef<{x:number;y:number}|null>(null);
  const open=useCallback((next:LightboxItem[],i:number,detail?:GalleryInfo)=>{
    if(!next.length)return;opener.current=document.activeElement as HTMLElement;setItems(next);setIndex(Math.min(Math.max(i,0),next.length-1));setInfo(detail);
  },[]);
  const close=useCallback(()=>setItems(null),[]);
  useEffect(()=>{
    if(!items)return;
    const prev=document.body.style.overflow;const scrollY=window.scrollY;
    const route=window.location.pathname+window.location.search+window.location.hash;
    document.body.style.overflow='hidden';
    const shell=document.querySelector<HTMLElement>('.portfolio-shell');const previousInert=shell?.inert??false;if(shell)shell.inert=true;
    dialog.current?.querySelector<HTMLButtonElement>('.gallery-close')?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();close();}
      const nativeControl=e.target instanceof HTMLVideoElement||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement;
      if(!nativeControl&&e.key==='ArrowRight'){e.preventDefault();setIndex(i=>(i+1)%items.length);}
      if(!nativeControl&&e.key==='ArrowLeft'){e.preventDefault();setIndex(i=>(i-1+items.length)%items.length);}
      if(!nativeControl&&e.key==='Home'){e.preventDefault();setIndex(0);}
      if(!nativeControl&&e.key==='End'){e.preventDefault();setIndex(items.length-1);}
      if(e.key==='Tab'){
        const nodes=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],video[controls],[tabindex]:not([tabindex="-1"])')??[]).filter(node=>node.getClientRects().length>0);
        const first=nodes[0],last=nodes[nodes.length-1];
        if(!first){e.preventDefault();dialog.current?.focus();return;}
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
        if(!dialog.current?.contains(document.activeElement)){e.preventDefault();first.focus();}
      }
    };
    document.addEventListener('keydown',key);
    return()=>{
      document.body.style.overflow=prev;if(shell)shell.inert=previousInert;document.removeEventListener('keydown',key);
      if(route===window.location.pathname+window.location.search+window.location.hash){
        if(opener.current?.isConnected)opener.current.focus({preventScroll:true});
        window.scrollTo({top:scrollY,behavior:'instant'});
      }
    };
  },[items,close]);
  useEffect(()=>{
    if(!items)return;const next=new Image();next.src=items[(index+1)%items.length].image;
    const strip=dialog.current?.querySelector<HTMLElement>('.gallery-thumbnails');
    const current=strip?.querySelector<HTMLElement>('[aria-current="true"]');
    if(strip&&current){
      const container=strip.getBoundingClientRect(),thumb=current.getBoundingClientRect();
      const left=thumb.left<container.left?thumb.left-container.left-4:thumb.right>container.right?thumb.right-container.right+4:0;
      const top=thumb.top<container.top?thumb.top-container.top-4:thumb.bottom>container.bottom?thumb.bottom-container.bottom+4:0;
      strip.scrollBy({left,top,behavior:'instant'});
    }
  },[items,index]);
  const value=useMemo(()=>({open}),[open]);
  const current=items?.[index];
  return <Context.Provider value={value}>{children}{current&&items&&createPortal(
    <div className="gallery-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="gallery-title" tabIndex={-1}>
      <div className="gallery-heading"><div><span className="section-index">{info?.category??current.meta}</span><h2 id="gallery-title">{info?.title??current.caption}</h2></div><button type="button" className="gallery-close" onClick={close} aria-label="Chiudi galleria">Chiudi <span aria-hidden="true">×</span></button></div>
      <div className="gallery-layout">
        <figure className="gallery-figure" onTouchStart={e=>{if(current.video)return;touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};}} onTouchEnd={e=>{
          if(touch.current===null)return;const dx=e.changedTouches[0].clientX-touch.current.x,dy=e.changedTouches[0].clientY-touch.current.y;
          if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3)setIndex(i=>(i+(dx<0?1:-1)+items.length)%items.length);touch.current=null;
        }} onTouchCancel={()=>{touch.current=null;}}>
          {current.video?<video key={current.video} src={current.video} poster={current.image} controls playsInline preload="metadata" aria-label={current.caption}/>:<img key={current.image} src={current.image} alt={`${current.caption??'Fotografia'} — ${index+1}`} decoding="async"/>}
          <figcaption><span>{info?.description??'Fotografia analogica'}</span><span aria-live="polite">{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span></figcaption>
        </figure>
        <aside className="gallery-sidebar"><div className="gallery-thumbnails">{items.map((item,i)=><button key={item.video??item.image} type="button" aria-current={i===index?'true':undefined} onClick={()=>setIndex(i)} aria-label={item.video?'Riproduci video':`Mostra immagine ${i+1}`}><img src={item.thumb??item.image} alt="" loading="lazy"/>{item.video&&<span className="video-label">▶ Video</span>}</button>)}</div><div className="gallery-arrows"><button type="button" disabled={items.length===1} onClick={()=>setIndex(i=>(i-1+items.length)%items.length)} aria-label="Immagine precedente">←</button><button type="button" disabled={items.length===1} onClick={()=>setIndex(i=>(i+1)%items.length)} aria-label="Immagine successiva">→</button></div></aside>
      </div>
    </div>,document.body)}</Context.Provider>;
}
