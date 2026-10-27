import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import './journey.css';
export default function Portfolio() {
  const { pathname } = useLocation();
  const photography = pathname.endsWith('photography');
  useEffect(() => { window.scrollTo(0, 0); document.title = `${photography ? 'Photography' : 'Programming'} portfolio — Dulitha Kariyapperuma`; }, [photography]);
  return <main className={`journey j-portfolio ${photography ? 'j-warm' : ''}`}>
    <header className="j-header"><Link className="j-brand" to="/"><b>dk</b><span>DULITHA<br/>KARIYAPPERUMA</span></Link><Link to="/">← Return to the mind</Link></header>
    <section className="j-section"><span className="j-kicker">{photography ? '02 / PHOTOGRAPHY PORTFOLIO' : '01 / PROGRAMMING PORTFOLIO'}</span><h1>{photography ? <>Stories told<br/><em>through light.</em></> : <>Ideas made<br/><em>into software.</em></>}</h1><p>{photography ? 'Light, composition, and a different perspective.' : 'Engineering, software, and the craft of solving problems.'}</p><div className="j-portfolio-pending"><span className="j-kicker">SELECTED WORK</span><h2>The collection is being prepared.</h2><p>{photography ? 'Original photographs and the photography portfolio link have not been added yet.' : 'Project case studies and the programming portfolio link have not been added yet.'}</p></div><Link className="j-pill" to={photography ? '/photography' : '/programming'}>Meanwhile, explore the brain behind {photography ? 'photography' : 'coding'} ↗</Link></section>
  </main>;
}
