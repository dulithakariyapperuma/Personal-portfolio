import { motion, useReducedMotion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';
import { VIEWPORT, fadeUp, stillVariants } from '@/design/motion';

type Props = {
  children: ReactNode;
  /** Position in a list — drives the stagger. */
  index?: number;
  /** Override the default rise; pass any variant from design/motion. */
  variants?: Variants;
  as?: 'div' | 'section' | 'article' | 'li' | 'span';
  className?: string;
};

/**
 * Reveals its children when they scroll into view.
 *
 * Two things make this worth having rather than repeating `whileInView`
 * inline everywhere:
 *
 *   1. `once: true` and a consistent margin, so sections across all three
 *      pages trigger at the same point on screen. Inconsistent trigger
 *      points are why some scroll animations feel jumpy.
 *   2. One place to honour prefers-reduced-motion. A visitor who asks for
 *      less movement gets a cross-fade instead — never a blank page,
 *      which is the usual bug when animation is disabled by removing it.
 */
export default function Reveal({
  children,
  index = 0,
  variants = fadeUp,
  as = 'div',
  className,
}: Props) {
  const reduced = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      custom={index}
      variants={reduced ? stillVariants : variants}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
    >
      {children}
    </Tag>
  );
}
