import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { PosterPressController, PosterPrint } from '@/lib/poster-press';
import '@/poster-experience.css';

export type PosterItem=PosterPrint & {galleryId:string;thumb:string};
export default function PosterExperience({posters,id='stampa',collectionId='progetti-grafici',project=false}:{posters:PosterItem[];id?:string;collectionId?:string;project?:boolean}){
  const root=useRef<HTMLElement>(null);
  const host=useRef<HTMLDivElement>(null);
  const controller=useRef<PosterPressController|null>(null);
  const target=useRef(0);
  const [state,setState]=useState<'loading'|'ready'|'static'>('loading');
  const [active,setActive]=useState(0);
  const [reduced,setReduced]=useState(false);
  useEffect(()=>{
    const section=root.current,canvasHost=host.current;if(!section||!canvasHost||!posters.length)return;
    let disposed=false,started=false,visible=false,generation=0,failed=false;
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>{
      const range=Math.max(1,section.offsetHeight-innerHeight);
      target.current=Math.max(0,Math.min(1,-section.getBoundingClientRect().top/range));
      section.style.setProperty('--press-progress',String(target.current));
      controller.current?.setProgress(target.current,preference.matches);
    };
    const start=async()=>{
      if(started||disposed||preference.matches)return;started=true;failed=false;const token=++generation;let loadFailed=false;
      try{
        const {createPosterPress}=await import('@/lib/poster-press');
        if(disposed||token!==generation)return;
        const instance=await createPosterPress(canvasHost,posters,{
          onError:()=>{loadFailed=true;if(!disposed&&token===generation){failed=true;setState('static');controller.current?.setVisible(false);}},
          onFrame:index=>{if(!disposed&&token===generation)setActive(index);},
        });
        if(disposed||preference.matches||token!==generation||loadFailed){instance.dispose();return;}
        controller.current=instance;instance.setProgress(target.current,true);instance.setVisible(visible&&!document.hidden);setState('ready');
      }catch{if(!disposed&&token===generation)setState('static');}
    };
    const syncPreference=()=>{
      setReduced(preference.matches);
      if(preference.matches){generation++;controller.current?.dispose();controller.current=null;started=false;setState('static');}
      else{setState('loading');void start();}
    };
    const preload=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)void start();},{rootMargin:'500px 0px'});
    preload.observe(section);
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;controller.current?.setVisible(visible&&!document.hidden&&!failed);});
    observer.observe(section);
    const visibility=()=>controller.current?.setVisible(visible&&!document.hidden&&!failed);
    if(preference.matches){setReduced(true);setState('static');}
    window.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);document.addEventListener('visibilitychange',visibility);preference.addEventListener('change',syncPreference);update();
    return()=>{disposed=true;observer.disconnect();preload.disconnect();window.removeEventListener('scroll',update);window.removeEventListener('resize',update);document.removeEventListener('visibilitychange',visibility);preference.removeEventListener('change',syncPreference);controller.current?.dispose();controller.current=null;};
  },[posters]);
  const select=(index:number)=>{
    setActive(index);
    if(state==='static')return;
    const section=root.current;if(!section)return;
    const value=Math.min(1,(index+.10)/Math.max(.14,posters.length-.86));
    window.scrollTo({top:scrollY+section.getBoundingClientRect().top+value*(section.offsetHeight-innerHeight),behavior:reduced?'instant':'smooth'});
  };
  const poster=posters[Math.min(active,posters.length-1)];
  if(!poster)return null;
  return <section id={id} ref={root} className={`poster-experience is-${state}`} style={{'--press-height':`${Math.min(550,Math.max(240,posters.length*85))}svh`} as CSSProperties} aria-label="Stampe grafiche">
    <div className="poster-stage">
      <div className="poster-stage-heading"><span className="section-index">Studio di stampa</span><a href={`#${collectionId}`}>Vai ai progetti <span aria-hidden="true">↘</span></a></div>
      <div className="poster-canvas" ref={host} aria-hidden="true"/>
      {state!=='ready'&&<div className="poster-static"><img src={poster.src} alt={poster.title}/></div>}
      <div className="poster-stage-caption"><div><span className="poster-edition">{String(active+1).padStart(2,'0')} / {String(posters.length).padStart(2,'0')}</span><h3>{poster.title}</h3></div>{project?<a href={`#${collectionId}`}>Esplora la serie ↗</a>:<Link to={`/lavori/${poster.galleryId}`}>Vedi il progetto ↗</Link>}</div>
      <div className="poster-stage-controls"><span className="poster-scroll-hint">{state==='ready'?'Scorri per stampare':'Selezione di stampe'} <span aria-hidden="true">↓</span></span><div className="poster-selectors" aria-label="Seleziona una stampa">{posters.map((p,index)=><button type="button" key={p.src} onClick={()=>select(index)} aria-label={`Stampa ${index+1}: ${p.title}`} aria-pressed={index===active}><img src={p.thumb} alt="" loading="lazy"/></button>)}</div></div>
      <div className="poster-scroll-progress" aria-hidden="true"/>
    </div>
  </section>;
}
