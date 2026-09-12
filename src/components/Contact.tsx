import { identity } from '@/data/site';
import { Link } from 'react-router-dom';
export default function Contact(){return <footer id="contatti" className="contact-section page-padding">
  <span className="section-index">04 / Contatti</span><div className="contact-row"><h2>Parliamone.</h2><div className="contact-links"><a href="tel:+393246004741">{identity.phone} <span aria-hidden="true">↗</span></a>{identity.email&&<a href={`mailto:${identity.email}`}>{identity.email} ↗</a>}{identity.socials.map(s=><a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label} <span aria-hidden="true">↗</span></a>)}</div></div>
  <div className="footer-line"><span>© {new Date().getFullYear()} Alessandro Moruzzi</span><span>Fotografia & graphic design</span><Link to="/#pellicola">Torna all’inizio ↑</Link></div>
  </footer>;}
