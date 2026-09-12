import { useEffect, useRef, useState } from 'react';

export default function Header() {
  const [light, setLight] = useState(false);
  const [active, setActive] = useState('pellicola');
  const progress=useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frame=0;
    const sync=()=>{
      frame=0;
      const cutoff=window.innerWidth<=640?110:135;
      const gallery=document.getElementById('lavori');
      setLight(!!gallery&&gallery.getBoundingClientRect().top<cutoff);
      const sections=['pellicola','fotografia','grafica','curriculum','contatti'];
      let selected='pellicola';
      for(const id of sections){const el=document.getElementById(id);if(el&&el.getBoundingClientRect().top<=cutoff)selected=id;}
      if(window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-8)selected='contatti';
      setActive(selected);
      const travel=document.documentElement.scrollHeight-window.innerHeight;
      if(progress.current)progress.current.style.transform=`scaleX(${Math.min(1,Math.max(0,window.scrollY/Math.max(1,travel)))})`;
    };
    const request=()=>{if(!frame)frame=requestAnimationFrame(sync);};
    window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',request);sync();
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',request);window.removeEventListener('resize',request);};
  },[]);
  return <header className={`site-header ${light?'on-paper':''}`}>
    <a className="skip-link" href="#lavori">Vai alla galleria</a>
    <a href="#pellicola" className="wordmark" aria-label="Alessandro Moruzzi — inizio">moruzzi</a>
    <span className="header-discipline">Fotografia & graphic design<br/>Roma, Italia</span>
    <nav aria-label="Navigazione principale">
      <a href="#fotografia" aria-current={active==='fotografia'?'location':undefined}>Fotografia</a><a href="#grafica" aria-current={active==='grafica'?'location':undefined}>Grafica</a><a href="#curriculum" aria-current={active==='curriculum'?'location':undefined}>CV</a><a href="#contatti" aria-current={active==='contatti'?'location':undefined}>Contatti <span aria-hidden="true">↗</span></a>
    </nav>
    <span className="site-reading-progress" ref={progress} aria-hidden="true"/>
  </header>;
}
