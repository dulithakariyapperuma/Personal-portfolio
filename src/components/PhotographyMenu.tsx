import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { PHOTO_COLLECTIONS as collections, photographById } from '@/lib/photographyGallery';

export default function PhotographyMenu({ onClose, onChoose }: { onClose: () => void; onChoose: (value: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(window.innerWidth * .55);
  const y = useMotionValue(window.innerHeight * .35);
  const springX = useSpring(x, { stiffness: 95, damping: 24 });
  const springY = useSpring(y, { stiffness: 95, damping: 24 });
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    dialog.current?.showModal();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} id="photo-menu" className="photo-collection-dialog" aria-label="Explore photography collections" onCancel={event => { event.preventDefault(); onClose(); }}>
    <motion.div className="photo-collection-stage" initial={{ opacity: 0 }} animate={{ opacity: 1, backgroundColor: active === null ? '#07182e' : collections[active].color }} transition={{ duration: reduced ? 0 : .45 }} onPointerMove={event => { if (event.pointerType !== 'mouse') return; x.set(Math.max(20, Math.min(window.innerWidth - 240, event.clientX - 90))); y.set(Math.max(65, Math.min(window.innerHeight - 310, event.clientY - 110))); }}>
      <button className="photo-collection-close" onClick={onClose} autoFocus aria-label="Close collections">×</button>
      <div className="photo-collection-aside">blurryblue photography<span>Couples / Portraits / Moments</span></div>
      <nav aria-label="Collections" className="photo-collection-list" onPointerLeave={() => setActive(null)}>{collections.map((item, index) => <motion.button key={item.value} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .7, delay: reduced ? 0 : index * .07 }} onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(index); }} onFocus={() => { setActive(index); x.set(window.innerWidth * .58); y.set(window.innerHeight * .34); }} onBlur={() => setActive(null)} onClick={() => onChoose(item.value)}>{item.label}<sup>{item.count}</sup></motion.button>)}</nav>
      <AnimatePresence>{active !== null && <motion.div className="photo-floating-preview" style={{ x: reduced ? x : springX, y: reduced ? y : springY }} initial={{ opacity: 0, scale: .93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: reduced ? 0 : .25 }} aria-hidden="true"><AnimatePresence mode="wait"><motion.img key={active} src={photographById(collections[active].preview).src} alt="" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .12 }}/></AnimatePresence></motion.div>}</AnimatePresence>
      <div className="photo-menu-quick-links"><a href="#photo-contact" onClick={onClose}>Let’s talk ↗</a><a href="/">Return to the mind ↗</a></div>
    </motion.div>
  </dialog>;
}
