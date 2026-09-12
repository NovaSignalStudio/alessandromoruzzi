import { Routes, Route, useLocation, useNavigationType } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import Index from './pages/Index';
import Project from './pages/Project';
import NotFound from './pages/NotFound';
const scrollPositions=new Map<string,number>();
function ScrollReset(){
  const location=useLocation();const navigation=useNavigationType();
  useLayoutEffect(()=>{
    const previous=window.history.scrollRestoration;window.history.scrollRestoration='manual';
    return()=>{window.history.scrollRestoration=previous;};
  },[]);
  useLayoutEffect(()=>{
    let hash=location.hash.slice(1);try{hash=decodeURIComponent(hash);}catch{}
    const stored=scrollPositions.get(location.key);
    const anchor=hash?document.getElementById(hash):null;
    if(navigation==='POP'&&stored!==undefined)window.scrollTo({top:stored,behavior:'instant'});
    else if(anchor)anchor.scrollIntoView({behavior:'instant'});
    else window.scrollTo({top:0,behavior:'instant'});
    const save=()=>{scrollPositions.set(location.key,window.scrollY);};
    save();window.addEventListener('scroll',save,{passive:true});
    if(scrollPositions.size>60){const first=scrollPositions.keys().next().value;if(first)scrollPositions.delete(first);}
    return()=>window.removeEventListener('scroll',save);
  },[location.key,location.pathname,location.hash,navigation]);
  return null;
}
export default function App(){return <><ScrollReset/><Routes>
  <Route path="/" element={<Index/>}/><Route path="/local-preview.html" element={<Index/>}/><Route path="/index.html" element={<Index/>}/>
  <Route path="/lavori/:id" element={<Project/>}/><Route path="*" element={<NotFound/>}/>
</Routes></>;}
