import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import AnimatedPhoto from '@/components/AnimatedPhoto';
import PhotographyMenu from '@/components/PhotographyMenu';
import PhotographyWall from '@/components/PhotographyWall';
import PhotographyLogo from '@/components/PhotographyLogo';
import PhotographyStatement from '@/components/PhotographyStatement';
import PhotographyContactSection from '@/components/PhotographyContact';
import { photographyContact, photographyContactLinks } from '@/lib/photographyContact';
import { PHOTOGRAPHS as photographs, PHOTO_COLLECTIONS, photographById } from '@/lib/photographyGallery';
import './photography.css';

const image = (id: string) => photographById(id).src;
const footerCollections = [...PHOTO_COLLECTIONS.slice(1), PHOTO_COLLECTIONS[0]];

export default function Photography() {
  const [filter, setFilter] = useState('All');
  const [menu, setMenu] = useState(false);
  const [slideshow, setSlideshow] = useState(true);
  const [footerPreview, setFooterPreview] = useState<string | null>(null);
  const previewX = useMotionValue(0);
  const previewY = useMotionValue(0);
  const previewSpringX = useSpring(previewX, { stiffness: 120, damping: 25 });
  const previewSpringY = useSpring(previewY, { stiffness: 120, damping: 25 });
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const socialLinks = photographyContactLinks(photographyContact).filter(link => link.id === 'instagram' || link.id === 'linkedin');
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Blurryblue Photography — Dulitha Kariyapperuma';
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previous = description?.content;
    if (description) description.content = 'Blurryblue Photography by Dulitha Kariyapperuma. Couples, portraits, and the moments worth keeping. Explore the photographs and get in touch.';
    return () => { if (description && previous) description.content = previous; };
  }, []);
  useEffect(() => {
    if (selected === null) return;
    const previous = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, [selected === null]);
  useEffect(() => {
    if (selected === null) return;
    // Cache adjacent frames so navigating the viewer does not wait for a fresh download.
    for (const offset of [-1, 1]) {
      const preload = new Image();
      preload.src = photographs[(selected + offset + photographs.length) % photographs.length].fullSrc;
    }
  }, [selected]);
  function movePhoto(direction: number) {
    setSelected(current => current === null ? null : (current + direction + photographs.length) % photographs.length);
  }
  function close() { dialog.current?.close(); setSelected(null); }
  function collection(value: string) { setFilter(value); setMenu(false); document.getElementById('photographs')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' }); }
  return <main className={`photo-page ${slideshow ? '' : 'photo-motion-paused'}`} id="photo-top">
    <a className="photo-skip" href="#photographs">Skip to photographs</a>
    <header className="photo-nav"><button aria-label="Explore photography collections" aria-expanded={menu} aria-controls="photo-menu" onClick={() => setMenu(!menu)}><span className={menu ? 'photo-plus open' : 'photo-plus'} aria-hidden="true">+</span><span className="photo-nav-collection-label">Collections</span></button><a className="photo-nav-emblem" href="#photo-top" aria-label="Blurryblue Photography — back to top"><PhotographyLogo compact/></a><nav aria-label="Photography navigation"><a href="#photographs">Work</a><span>/</span><a href="#photo-about">About</a><span>/</span><a href="#photo-contact" className="photo-nav-contact">Let’s talk <span aria-hidden="true">↗</span></a></nav><Link to="/">The mind <span aria-hidden="true">↗</span></Link></header>
    {menu && <PhotographyMenu onClose={() => setMenu(false)} onChoose={collection}/>}
    <section className="photo-hero" aria-label="Blurryblue Photography by Dulitha Kariyapperuma">
      <motion.h1 className="photo-hero-wordmark" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : 1.2 }} aria-label="blurry blue.">blurry <span>blue.</span></motion.h1>
      <PhotographyWall onSelect={setSelected} moving={slideshow && !menu && selected === null} onToggleMotion={() => setSlideshow(value => !value)}/>
    </section>
    <PhotographyStatement/>
    <section className="photo-work photo-work-images-only" id="photographs" aria-label="Photographs">
      <motion.div layout className="photo-grid"><AnimatePresence mode="popLayout">{photographs.filter(p => filter === 'All' || p.category === filter).map(p => <motion.button layout key={p.id} className={`photo-card card-${p.id}`} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} exit={{ opacity: 0, scale: .96 }} transition={{ duration: reduced ? 0 : .5 }} onClick={() => setSelected(photographs.indexOf(p))} aria-label={`Open ${p.title}`}><div style={{ aspectRatio: `${p.width} / ${p.height}` }}><AnimatedPhoto src={p.src} srcSet={p.srcSet} sizes="(max-width: 700px) 50vw, 33vw" width={p.width} height={p.height} alt={p.alt} delay={photographs.indexOf(p) * 2.7}/></div></motion.button>)}</AnimatePresence></motion.div>
    </section>
    <section className="photo-about" id="photo-about"><span>THE PERSON BEHIND THE FRAME</span><div><h2>I build with code.<br/>I compose with light.<br/><em>Curiosity connects both.</em></h2><p>Photography is my way of paying attention. To people. To places. To the small things that are easy to walk past. Blurryblue Photography is where I share that way of seeing.</p><Link to="/photography">Explore the brain behind the photograph <span>↗</span></Link></div></section>
    <PhotographyContactSection/>
    <footer className="photo-editorial-footer" onPointerLeave={() => setFooterPreview(null)} onPointerMove={event => { previewX.set(Math.min(window.innerWidth - 170, event.clientX + 18)); previewY.set(Math.max(70, Math.min(window.innerHeight - 220, event.clientY - 40))); }}>
      <div className="photo-footer-top"><p>Blurryblue is <em>people.</em><br/>Blurryblue is <em>perspective.</em><br/><br/>A little curiosity.<br/>A different <em>kind of blue.</em></p><div className="photo-footer-index"><div><h3>Collections</h3>{footerCollections.map(item => <button key={item.value} onPointerEnter={event => { if (event.pointerType === 'mouse') setFooterPreview(item.preview); }} onPointerLeave={() => setFooterPreview(null)} onClick={() => { setFooterPreview(null); collection(item.value); }}>{item.label}</button>)}</div><div><h3>Explore</h3><a href="#photographs">Selected work</a><a href="#photo-about">About</a><a href="#photo-contact">Contact</a><Link to="/photography">Behind the frame</Link><Link to="/">The mind ↗</Link></div><div><h3>Photography by</h3><span>Dulitha<br/>Kariyapperuma</span>{socialLinks.map(link => <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div></div></div>
      <a className="photo-footer-signature" href="#photo-top" aria-label="Blurryblue Photography — back to top"><PhotographyLogo/></a><div className="photo-footer-bottom"><span>© {new Date().getFullYear()} Blurryblue Photography</span><a href="#photo-top">Back to top ↑</a></div>
      <AnimatePresence>{footerPreview && !reduced && <motion.img className="photo-footer-preview" key={footerPreview} src={image(footerPreview)} alt="" aria-hidden="true" style={{ x: previewSpringX, y: previewSpringY }} initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}/>}</AnimatePresence>
    </footer>
    {selected !== null && <dialog ref={dialog} className="photo-dialog" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); movePhoto(event.key === 'ArrowRight' ? 1 : -1); } }} aria-label="Photograph viewer" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) movePhoto(dx < 0 ? 1 : -1); }}><button className="photo-close" onClick={close} autoFocus aria-label="Close photograph">Close ×</button><AnimatePresence mode="wait"><motion.figure key={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .2 }}><img src={photographs[selected].fullSrc} width={photographs[selected].width} height={photographs[selected].height} alt={photographs[selected].alt} decoding="async"/><figcaption><h2>{photographs[selected].title}</h2><small>{photographs[selected].category} · Photography by Dulitha Kariyapperuma</small></figcaption></motion.figure></AnimatePresence><div className="photo-viewer-nav"><span className="photo-viewer-count" aria-live="polite" aria-atomic="true">{String(selected + 1).padStart(2, '0')} / {String(photographs.length).padStart(2, '0')}</span></div></dialog>}
  </main>;
}
