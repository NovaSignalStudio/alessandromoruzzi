const software=[
  {name:'Photoshop',mark:'Ps',background:'#001e36',color:'#31a8ff',purpose:'Immagine'},
  {name:'Illustrator',mark:'Ai',background:'#330000',color:'#ff9a00',purpose:'Grafica vettoriale'},
  {name:'InDesign',mark:'Id',background:'#49021f',color:'#ff3366',purpose:'Impaginazione'},
  {name:'Lightroom',mark:'Lr',background:'#001e36',color:'#31a8ff',purpose:'Fotografia'},
  {name:'Figma',mark:'',background:'#242424',color:'#fff',purpose:'Interfacce'},
];
export default function SoftwareIcons(){return <div className="software-grid">{software.map(s=><div className="software-item" key={s.name}>
  {s.mark?<svg viewBox="0 0 64 64" className="software-icon" role="img" aria-label={s.name}><rect width="64" height="64" rx="13" fill={s.background}/><text x="32" y="43" textAnchor="middle" fill={s.color} fontFamily="Arial,sans-serif" fontSize="34" fontWeight="600" letterSpacing="-1">{s.mark}</text></svg>:
    <svg viewBox="0 0 64 64" className="software-icon" role="img" aria-label="Figma"><rect width="64" height="64" rx="13" fill="#242424"/><g transform="translate(18 11)"><path d="M7 0h7v14H7A7 7 0 0 1 7 0" fill="#f24e1e"/><path d="M14 0h7a7 7 0 0 1 0 14h-7" fill="#ff7262"/><path d="M7 14h7v14H7a7 7 0 0 1 0-14" fill="#a259ff"/><circle cx="21" cy="21" r="7" fill="#1abcfe"/><path d="M7 28h7v7a7 7 0 1 1-7-7" fill="#0acf83"/></g></svg>}
  <div><h4>{s.name}</h4><span>{s.purpose}</span></div>
  </div>)}</div>;}
