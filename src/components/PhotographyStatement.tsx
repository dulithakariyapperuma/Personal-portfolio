import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';

export const PHOTOGRAPHY_STATEMENT = "You can't create blue from other colors but through blue, every moment finds its tone & making every moment perfect!";

type RevealProps = { children: ReactNode; progress: MotionValue<number>; start: number; end: number; reduced: boolean; className?: string };
function RevealPiece({ children, progress, start, end, reduced, className = '' }: RevealProps) {
  const opacity = useTransform(progress, [start, end], [0, 1]);
  const y = useTransform(progress, [start, end], [36, 0]);
  const clipPath = useTransform(progress, [start, end], ['inset(-15% 100% -20% -8%)', 'inset(-15% -15% -20% -8%)']);
  return <motion.span className={className} style={{ opacity: reduced ? 1 : opacity, y: reduced ? 0 : y, clipPath: reduced ? 'none' : clipPath }}>{children}</motion.span>;
}

/** The blue brush lettering is displayed directly from the owner's logo artwork. */
function SignatureBlue() {
  return <span className="photo-ink-logo"><span className="photo-ink-mask"/><span className="photo-ink-fallback">blue</span></span>;
}

export default function PhotographyStatement() {
  const composition = useRef<HTMLDivElement>(null);
  const reduced = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: composition, offset: ['start 88%', 'end 72%'] });
  const reveal = { progress: scrollYProgress, reduced };
  return <section className="photo-statement" aria-label="The Blurryblue philosophy">
    <p className="photo-statement-accessible">{PHOTOGRAPHY_STATEMENT}</p>
    <div ref={composition} className="photo-type-composition" aria-hidden="true">
      <div className="photo-type-opening">
        <RevealPiece {...reveal} start={0} end={.15} className="photo-type-note">You can't<br/>create</RevealPiece>
        <RevealPiece {...reveal} start={.06} end={.27} className="photo-type-signature"><SignatureBlue/></RevealPiece>
        <RevealPiece {...reveal} start={.16} end={.34} className="photo-type-note photo-type-colors">from other<br/><strong>colors</strong></RevealPiece>
      </div>
      <div className="photo-type-bridge">
        <RevealPiece {...reveal} start={.26} end={.43} className="photo-type-note">but through</RevealPiece>
        <RevealPiece {...reveal} start={.32} end={.5} className="photo-type-signature photo-type-signature-small"><SignatureBlue/><span className="photo-type-comma">,</span></RevealPiece>
      </div>
      <RevealPiece {...reveal} start={.43} end={.64} className="photo-type-moment">every moment</RevealPiece>
      <RevealPiece {...reveal} start={.56} end={.76} className="photo-type-tone">finds its tone</RevealPiece>
      <div className="photo-type-ending">
        <RevealPiece {...reveal} start={.69} end={.88} className="photo-type-note"><span className="photo-type-amp">&</span> making<br/>every moment</RevealPiece>
        <RevealPiece {...reveal} start={.79} end={1} className="photo-type-perfect">perfect!</RevealPiece>
      </div>
    </div>
  </section>;
}
