import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { PosterPressController, PosterPrint } from '@/lib/poster-press';
import { useLightbox } from './Lightbox';
import '@/instant-photo.css';

type InstantPhoto = PosterPrint & { galleryId: string; thumb: string };

export default function InstantPhotoExperience({ posters, collectionId = 'collezione' }: { posters: InstantPhoto[]; collectionId?: string }) {
  const root = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PosterPressController | null>(null);
  const target = useRef(0);
  const [state, setState] = useState<'loading' | 'ready' | 'static'>('loading');
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const { open } = useLightbox();

  useEffect(() => {
    const section = root.current, canvasHost = host.current;
    if (!section || !canvasHost || !posters.length) return;
    let disposed = false, started = false, visible = false, generation = 0, failed = false;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const range = Math.max(1, section.offsetHeight - section.querySelector<HTMLElement>('.instant-stage')!.offsetHeight);
      target.current = Math.max(0, Math.min(1, -section.getBoundingClientRect().top / range));
      section.style.setProperty('--instant-progress', String(target.current));
      controller.current?.setProgress(target.current, preference.matches);
    };
    const start = async () => {
      if (started || disposed || preference.matches) return;
      started = true;
      failed = false;
      const token = ++generation;
      let loadFailed = false;
      try {
        const { createInstantCamera } = await import('@/lib/instant-scene');
        if (disposed || token !== generation) return;
        const instance = await createInstantCamera(canvasHost, posters, {
          onError: () => {
            loadFailed = true;
            if (!disposed && token === generation) { failed = true; setState('static'); controller.current?.setVisible(false); }
          },
          onFrame: index => { if (!disposed && token === generation) setActive(index); },
        });
        if (disposed || preference.matches || token !== generation || loadFailed) { instance.dispose(); return; }
        controller.current = instance;
        instance.setProgress(target.current, true);
        instance.setVisible(visible && !document.hidden);
        setState('ready');
      } catch {
        if (!disposed && token === generation) { setState('static'); canvasHost.replaceChildren(); }
      }
    };
    const syncPreference = () => {
      setReduced(preference.matches);
      generation += 1;
      controller.current?.dispose(); controller.current = null; started = false;
      setState(preference.matches ? 'static' : 'loading');
      if (!preference.matches) void start();
    };
    const preload = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) void start(); }, { rootMargin: '600px 0px' });
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; controller.current?.setVisible(visible && !document.hidden && !failed); });
    preload.observe(section); visibility.observe(section);
    const documentVisibility = () => controller.current?.setVisible(visible && !document.hidden && !failed);
    if (preference.matches) { setReduced(true); setState('static'); }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    document.addEventListener('visibilitychange', documentVisibility);
    preference.addEventListener('change', syncPreference);
    update();
    return () => {
      disposed = true; visibility.disconnect(); preload.disconnect();
      window.removeEventListener('scroll', update); window.removeEventListener('resize', update);
      document.removeEventListener('visibilitychange', documentVisibility); preference.removeEventListener('change', syncPreference);
      controller.current?.dispose(); controller.current = null;
    };
  }, [posters]);

  useEffect(() => {
    const strip = root.current?.querySelector<HTMLElement>('.instant-selectors');
    const item = strip?.querySelectorAll<HTMLButtonElement>('button')[active];
    if (strip && item) {
      const bounds = strip.getBoundingClientRect(), thumb = item.getBoundingClientRect();
      const delta = thumb.left < bounds.left + 5 ? thumb.left - bounds.left - 5 : thumb.right > bounds.right - 5 ? thumb.right - bounds.right + 5 : 0;
      if (delta) strip.scrollTo({ left: strip.scrollLeft + delta, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [active, reduced]);

  const select = (index: number) => {
    if (state !== 'ready') { setActive(index); return; }
    const section = root.current;
    if (!section) return;
    const value = Math.min(1, (index + .70) / (posters.length - .23));
    const stage = section.querySelector<HTMLElement>('.instant-stage')!;
    window.scrollTo({ top: scrollY + section.getBoundingClientRect().top + value * (section.offsetHeight - stage.offsetHeight), behavior: reduced ? 'auto' : 'smooth' });
  };
  const photo = posters[Math.min(active, posters.length - 1)];
  if (!photo) return null;
  const enlarge = () => open(posters.map(item => ({ image: item.src, thumb: item.thumb, caption: item.title, meta: 'Fotografia' })), active, { title: photo.title, category: 'Fotografia', description: '' });

  return <section ref={root} className={`instant-photo-experience is-${state}`} style={{ '--instant-height': `${100 + posters.length * 115}svh` } as CSSProperties} aria-label={`Stampe fotografiche — ${photo.title}`}>
    <div className="instant-stage">
      <div className="instant-stage-heading"><span className="section-index">Fotografia / Selezione</span><a href={`#${collectionId}`}>Tutte le fotografie <span aria-hidden="true">↘</span></a></div>
      <div className="instant-canvas" ref={host} aria-hidden="true" />
      <div className="instant-fallback" aria-hidden="true"><figure><img src={photo.src} alt="" width={photo.width} height={photo.height}/></figure></div>
      <div className="instant-stage-caption"><div><span className="instant-edition">{String(active + 1).padStart(2, '0')} / {String(posters.length).padStart(2, '0')}</span><h2>{photo.title}</h2></div><button type="button" onClick={enlarge}>Ingrandisci <span aria-hidden="true">↗</span></button></div>
      <div className="instant-stage-controls"><span className="instant-scroll-hint">{state === 'ready' ? 'Scorri per stampare' : state === 'loading' ? 'La serie, in immagini' : 'Sfoglia le fotografie'} <span aria-hidden="true">↓</span></span><div className="instant-selectors" aria-label="Seleziona una fotografia">{posters.map((item, index) => <button type="button" key={item.src} onClick={() => select(index)} aria-label={`Fotografia ${index + 1}: ${item.title}`} aria-pressed={index === active}><img src={item.thumb} alt="" loading="lazy"/></button>)}</div></div>
      <div className="instant-scroll-progress" aria-hidden="true"/>
    </div>
  </section>;
}
