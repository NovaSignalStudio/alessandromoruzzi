import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { analogFilm } from '@/data/client';
import { useLightbox } from './Lightbox';

const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));

export default function FilmStrip(){
  const section=useRef<HTMLElement>(null);
  const scene=useRef<HTMLDivElement>(null);
  const panels=useRef<(HTMLButtonElement|null)[]>([]);
  const position=useRef(0);
  const target=useRef(0);
  const dragging=useRef(false);
  const dragged=useRef(false);
  const pointer=useRef({x:0,y:0,value:0,id:-1});
  const span=useRef(600);
  const activeFrame=useRef(0);
  const requestFrame=useRef<()=>void>(()=>{});
  const [active,setActive]=useState(0);
  const {open}=useLightbox();
  const last=analogFilm.length-1;

  const jump=useCallback((value:number)=>{
    target.current=clamp(value,0,last);
    const root=section.current;
    if(root&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      const top=root.getBoundingClientRect().top+window.scrollY;
      const travel=Math.max(0,root.offsetHeight-window.innerHeight);
      window.scrollTo({top:top+(target.current/Math.max(last,1))*travel,behavior:'instant'});
    }
    requestFrame.current();
  },[last]);

  useEffect(()=>{
    const root=section.current;const stage=scene.current;if(!root||!stage)return;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf=0,visible=true,previousTime=0;
    const measure=()=>{const width=stage.clientWidth;span.current=Math.max(180,Math.min(width*(width<=640?.8:.66),760,stage.clientHeight*1.12));};
    const render=(time:number)=>{
      raf=0;if(!visible||document.hidden)return;
      const dt=previousTime?Math.min(time-previousTime,64):16.67;previousTime=time;
      position.current=reduce.matches?target.current:position.current+(target.current-position.current)*(1-Math.exp(-dt/115));
      if(Math.abs(position.current-target.current)<.001)position.current=target.current;
      panels.current.forEach((panel,i)=>{
        if(!panel)return;
        const d=i-position.current;
        const angle=clamp(d*.22,-.98,.98);
        const x=Math.sin(angle)*span.current/.22;
        const z=(Math.cos(angle)-1)*span.current/.22;
        const y=Math.pow(Math.min(Math.abs(d),4),2)*8;
        panel.style.transform=`translate3d(${x}px,${y}px,${z}px) rotateY(${-angle*180/Math.PI}deg)`;
        panel.style.width=`${span.current}px`;
        panel.style.visibility=Math.abs(d)>3?'hidden':'visible';
        panel.style.zIndex=String(20-Math.round(Math.abs(d)*3));
        const development=reduce.matches?1:Math.pow(clamp(1-Math.abs(d)*1.45,0,1),1.7);
        panel.style.setProperty('--development',development.toFixed(3));
        panel.style.setProperty('--sheen',String(.08+Math.min(Math.abs(d),2)*.035));
        panel.tabIndex=Math.round(position.current)===i?0:-1;
      });
      const nearest=Math.round(position.current);
      if(nearest!==activeFrame.current){activeFrame.current=nearest;setActive(nearest);}
      if(position.current!==target.current)raf=requestAnimationFrame(render);
      else previousTime=0;
    };
    const request=()=>{if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render);};requestFrame.current=request;
    const scroll=()=>{
      if(!dragging.current&&!reduce.matches){const r=root.getBoundingClientRect();const travel=root.offsetHeight-window.innerHeight;target.current=clamp(-r.top/Math.max(1,travel),0,1)*last;}request();
    };
    const resize=()=>{measure();scroll();};
    const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;previousTime=0;}else request();};
    const motionPreference=()=>{position.current=target.current;resize();};
    const observer=new IntersectionObserver(([e])=>{visible=e.isIntersecting;if(visible){previousTime=0;request();}else{cancelAnimationFrame(raf);raf=0;previousTime=0;}});observer.observe(root);
    window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',resize);reduce.addEventListener('change',motionPreference);document.addEventListener('visibilitychange',visibility);resize();
    return()=>{cancelAnimationFrame(raf);observer.disconnect();window.removeEventListener('scroll',scroll);window.removeEventListener('resize',resize);reduce.removeEventListener('change',motionPreference);document.removeEventListener('visibilitychange',visibility);requestFrame.current=()=>{};};
  },[last]);

  const finishDrag=useCallback((id:number,cancelled=false)=>{
    if(!dragging.current||pointer.current.id!==id)return;
    dragging.current=false;
    if(scene.current?.hasPointerCapture(id))scene.current.releasePointerCapture(id);
    if(cancelled){
      const root=section.current;
      if(root&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)target.current=clamp(-root.getBoundingClientRect().top/Math.max(1,root.offsetHeight-window.innerHeight),0,1)*last;
      dragged.current=false;requestFrame.current();
    }else if(dragged.current)jump(Math.round(target.current));
  },[jump,last]);

  return <section id="pellicola" ref={section} className="film-opening" style={{'--film-length':last} as CSSProperties} aria-label="Fotografie analogiche">
    <h1 className="sr-only">Alessandro Moruzzi — Fotografia e graphic design</h1>
    <div className="film-sticky">
      <div className="film-stage" ref={scene} onPointerDown={e=>{
        if(e.pointerType==='mouse'&&e.button!==0)return;
        dragging.current=true;dragged.current=false;pointer.current={x:e.clientX,y:e.clientY,value:position.current,id:e.pointerId};
      }} onPointerMove={e=>{
        if(!dragging.current||pointer.current.id!==e.pointerId)return;
        const dx=e.clientX-pointer.current.x,dy=e.clientY-pointer.current.y;
        if(!dragged.current&&Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){dragging.current=false;return;}
        if(Math.abs(dx)>8){dragged.current=true;scene.current?.setPointerCapture(e.pointerId);}
        if(dragged.current){target.current=clamp(pointer.current.value-dx/span.current,0,last);requestFrame.current();}
      }} onPointerUp={e=>finishDrag(e.pointerId)} onPointerCancel={e=>finishDrag(e.pointerId,true)}
        onPointerLeave={e=>{if(!scene.current?.hasPointerCapture(e.pointerId))finishDrag(e.pointerId);}}
        onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();jump(Math.round(target.current)+1);}if(e.key==='ArrowLeft'){e.preventDefault();jump(Math.round(target.current)-1);}}}>
        <div className="film-ribbon">
          {analogFilm.map((frame,i)=><button type="button" key={frame.src} ref={el=>{panels.current[i]=el;}} className="film-segment" aria-label={`Apri fotografia analogica ${i+1}`} onClick={()=>{
            if(dragged.current){dragged.current=false;return;}if(active!==i){jump(i);return;}
            open(analogFilm.map(f=>({image:f.src,caption:f.series,meta:'Fotografia analogica'})),i);
          }}>
            <span className="film-stock"><span className="film-edge-code" aria-hidden="true">{String(i+1).padStart(2,'0')} — 35mm</span>
              <span className="film-image"><img className="film-negative" src={frame.src} alt="" draggable={false} loading={i<3?'eager':'lazy'}/><img className="film-developed" src={frame.src} alt={`${frame.series} — fotografia ${i+1}`} draggable={false} loading={i<3?'eager':'lazy'}/></span>
              <span className="film-edge-number" aria-hidden="true">{i+1}A ▸</span><span className="film-reflection" aria-hidden="true"/>
            </span>
          </button>)}
        </div>
      </div>
      <div className="film-bottom">
        <span className="film-position" aria-live="off">{String(active+1).padStart(2,'0')}<span> / {String(analogFilm.length).padStart(2,'0')}</span></span>
        <a href="#lavori" className="film-exit">Lavori selezionati <span aria-hidden="true">↓</span></a>
        <div className="film-controls"><button type="button" onClick={()=>jump(Math.round(target.current)-1)} disabled={active===0} aria-label="Foto precedente">←</button><button type="button" onClick={()=>jump(Math.round(target.current)+1)} disabled={active===last} aria-label="Foto successiva">→</button></div>
      </div>
    </div>
  </section>;
}
