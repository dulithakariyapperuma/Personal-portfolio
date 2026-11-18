// ---------------------------------------------------------------------------
// The site's motion language.
//
// One easing curve, one set of durations, one stagger rhythm — used by all
// three pages. This is the single biggest reason a site reads as designed
// rather than assembled: when every element enters with the same physics,
// the pages feel related even when they look nothing alike.
//
// Before this file the codebase had durations of .2, .4, .5, 1.2 and 9s
// scattered across four files with no relationship between them.
// ---------------------------------------------------------------------------

import type { Transition, Variants } from 'framer-motion';

/**
 * The house curve: fast out of the gate, long gentle settle.
 *
 * Linear motion reads as cheap because nothing in the physical world moves
 * at a constant speed. This is the "expensive" curve — most of the distance
 * is covered in the first third, then it eases into place.
 */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** A softer curve for things that move *out*, where a long settle looks slow. */
export const EASE_OUT = [0.4, 0, 0.2, 1] as const;

/**
 * Durations, named by intent rather than number.
 *
 * Anything under ~150ms reads as instant; anything over ~1.2s starts to feel
 * like the page is thinking. Reaching for a name instead of a number is what
 * keeps a codebase from drifting back into 0.37s one-offs.
 */
export const DURATION = {
  instant: 0.18,   // state flips — a toggle, a pressed button
  quick: 0.36,     // small reveals, hovers, tooltips
  base: 0.7,       // the default: a card, a paragraph, a section
  slow: 1.1,       // hero elements, the first thing you see
  epic: 1.8,       // once per page, for the headline
} as const;

/** How far apart children enter. Too tight reads as one blob; too loose drags. */
export const STAGGER = { tight: 0.04, base: 0.07, loose: 0.12 } as const;

export const transition = (duration: number = DURATION.base, delay: number = 0): Transition =>
  ({ duration, delay, ease: EASE });

// --- Reusable variants -----------------------------------------------------
// `custom` carries the index so a list can stagger without the parent needing
// to know how many children it has.

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: transition(DURATION.base, i * STAGGER.base) }),
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: (i = 0) => ({ opacity: 1, transition: transition(DURATION.base, i * STAGGER.base) }),
};

/** For headlines: the line rises out of its own clipping box. */
export const riseIn: Variants = {
  hidden: { y: '110%' },
  show: (i = 0) => ({ y: '0%', transition: transition(DURATION.slow, i * STAGGER.base) }),
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: (i = 0) => ({ opacity: 1, scale: 1, transition: transition(DURATION.base, i * STAGGER.base) }),
};

/**
 * Collapses every variant above to a plain cross-fade.
 *
 * Returned when the visitor asks for reduced motion. Note it fades rather
 * than cutting to visible: people who set that preference are telling you
 * that *movement* makes them unwell, not that they want a flickering page.
 */
export const stillVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.instant } },
};

/** Standard viewport settings so sections reveal at a consistent point. */
export const VIEWPORT = { once: true, margin: '-12% 0px -12% 0px' } as const;
