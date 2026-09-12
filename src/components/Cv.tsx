import { identity, experience, education } from '@/data/site';
import SoftwareIcons from './SoftwareIcons';
import { assetUrl } from '@/lib/paths';
export default function Cv(){return <section id="curriculum" className="cv-section page-padding">
  <div className="cv-heading"><span className="section-index">03 / Curriculum</span><button type="button" className="text-button print-control" onClick={()=>window.print()}>Stampa CV <span aria-hidden="true">↗</span></button></div>
  <div className="cv-grid"><aside className="cv-portrait"><img src={assetUrl('/img/portrait-author.jpg')} alt="Alessandro Moruzzi" loading="lazy" width="1600" height="1066"/><div className="portrait-caption"><span>Alessandro Moruzzi</span><span>Roma</span></div></aside>
    <div className="cv-main"><h2>Alessandro<br/><span>Moruzzi.</span></h2><p className="cv-role">Fotografo e graphic designer</p><p className="cv-bio">Fotografia e progettazione grafica si incontrano nel mio lavoro: dalla costruzione dell’immagine alla sua forma su carta e schermo.</p><p className="cv-bio">Mi occupo di campagne, comunicazione visiva e fotografia commerciale. La ricerca personale continua su pellicola, tra ritratti, luoghi e sperimentazione.</p>
    <div className="cv-block"><h3>Esperienza</h3>{experience.map(e=><div className="cv-row" key={e.period}><span className="cv-date">{e.period}</span><div><h4>{e.title}</h4><p>{e.org}</p></div></div>)}</div>
    <div className="cv-block"><h3>Formazione</h3>{education.map(e=><div className="cv-row" key={e.year}><span className="cv-date">{e.year}</span><div><h4>{e.title}</h4><p>{e.detail.replace(' e altre 12 competenze','')}</p></div></div>)}</div>
    <div className="cv-block"><h3>Programmi e software</h3><SoftwareIcons/></div>
    <div className="cv-block cv-disciplines"><h3>Ambiti</h3><p>Fotografia di moda · Fotografia analogica · Still life · Graphic design · Progettazione editoriale · Brand identity</p></div>
    </div></div>
  <span className="sr-only">{identity.firstName} {identity.lastName}</span>
  </section>;}
