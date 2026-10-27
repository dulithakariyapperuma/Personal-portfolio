import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import AnimatedPhoto from './AnimatedPhoto';
import PhotoSurface from './PhotoSurface';
import { PHOTOGRAPHS, HERO_COLUMNS as columns } from '@/lib/photographyGallery';

const heroSizes = '(max-width: 700px) 66vw, (max-width: 1000px) 250px, (min-width: 1680px) 420px, 25vw';

type Props = { onSelect: (index: number) => void; moving: boolean; onToggleMotion: () => void };
export default function PhotographyWall({ onSelect, moving, onToggleMotion }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const interaction = useRef({ until: 0, visible: true, initialized: false, blockedClickUntil: 0, startX: 0, startScroll: 0, down: false, dragging: false });
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = viewport.current!;
    const state = interaction.current;
    const observer = new IntersectionObserver(([entry]) => { state.visible = entry.isIntersecting; });
    observer.observe(element);
    let frame = 0, previous = 0, position = element.scrollLeft;
    const tick = (time: number) => {
      const dt = previous ? Math.min(time - previous, 50) : 0;
      previous = time;
      const cycle = group.current ? group.current.offsetWidth + 12 : 0;
      if (cycle && !state.initialized) { element.scrollLeft = 100; position = element.scrollLeft; state.initialized = true; }
      if (cycle && moving && !reduced && state.visible && !document.hidden && !state.down && time > state.until && !element.contains(document.activeElement)) {
        position += dt * .014;
        if (position >= cycle) position -= cycle;
        element.scrollLeft = position;
      } else position = element.scrollLeft;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [moving, reduced]);

  function slide(direction: number) {
    const element = viewport.current!;
    interaction.current.until = performance.now() + 6500;
    element.scrollBy({ left: direction * Math.min(element.clientWidth * .7, 700), behavior: reduced ? 'instant' : 'smooth' });
  }

  return <div className="photo-wall">
    <div ref={viewport} className="photo-wall-viewport" role="region" aria-label="Photography carousel. Swipe or drag horizontally. Use arrow keys to navigate and Space to pause or resume motion." tabIndex={0}
      onKeyDown={event => { if (event.target !== event.currentTarget) return; if (event.key === ' ') { event.preventDefault(); onToggleMotion(); } if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); slide(event.key === 'ArrowRight' ? 1 : -1); } }}
      onWheel={() => { interaction.current.until = performance.now() + 6500; }}
      onTouchStart={() => { interaction.current.until = performance.now() + 6500; }}
      onTouchEnd={() => { interaction.current.until = performance.now() + 6500; }}
      onPointerDown={event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        const state = interaction.current;
        state.down = true; state.dragging = false; state.startX = event.clientX; state.startScroll = event.currentTarget.scrollLeft;
      }}
      onPointerMove={event => {
        const state = interaction.current;
        if (!state.down || event.pointerType !== 'mouse') return;
        const distance = event.clientX - state.startX;
        if (Math.abs(distance) > 6 && !state.dragging) { state.dragging = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.classList.add('is-dragging'); }
        if (state.dragging) { event.preventDefault(); event.currentTarget.scrollLeft = state.startScroll - distance; }
      }}
      onPointerUp={event => {
        const state = interaction.current;
        if (state.dragging) state.blockedClickUntil = performance.now() + 200;
        state.down = false; state.dragging = false; state.until = performance.now() + 6500;
        event.currentTarget.classList.remove('is-dragging');
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={event => { interaction.current.down = false; interaction.current.dragging = false; event.currentTarget.classList.remove('is-dragging'); }}
      onPointerLeave={() => { if (!interaction.current.dragging) interaction.current.down = false; }}>
      <div className="photo-wall-track">{[0, 1].map(copy => <div className="photo-wall-group" key={copy} ref={copy === 0 ? group : undefined} aria-hidden={copy === 1 ? true : undefined}>{columns.map((column, i) => <div className={`photo-wall-column wall-column-${i}`} key={i} style={{ animationDelay: `${-i * 2.6}s`, animationDuration: `${17 + i % 3 * 3}s` }}>{column.map((index, j) => <button key={`${index}-${j}`} tabIndex={copy === 1 ? -1 : 0} onDragStart={event => event.preventDefault()} onClick={() => { if (performance.now() > interaction.current.blockedClickUntil) onSelect(index); }} aria-label={`Open ${PHOTOGRAPHS[index].title}`}>
        {copy === 0 && i === 2 && j === 0 ? <PhotoSurface src={PHOTOGRAPHS[index].src} srcSet={PHOTOGRAPHS[index].srcSet} sizes={heroSizes} alt={PHOTOGRAPHS[index].alt} paused={!moving}/> : <AnimatedPhoto src={PHOTOGRAPHS[index].src} srcSet={PHOTOGRAPHS[index].srcSet} sizes={heroSizes} alt={PHOTOGRAPHS[index].alt} width={PHOTOGRAPHS[index].width} height={PHOTOGRAPHS[index].height} loading={copy === 0 && j === 0 && i < 3 ? 'eager' : 'lazy'} delay={i * 2.3 + j * 1.7}/>}
      </button>)}</div>)}</div>)}</div>
    </div>

  </div>;
}
