import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { DURATION, EASE } from '@/design/motion';

/**
 * A panel that sweeps across the screen when the route changes.
 *
 * Two jobs, one of them not cosmetic:
 *
 *   1. It gives the site a single transition instead of three pages
 *      snapping into each other. The landing is navy, the desktop is
 *      silver — without something between them the jump is violent.
 *
 *   2. It covers the gap while a lazily-loaded route downloads its chunk.
 *      That pause exists whether or not anything is drawn over it; the
 *      choice is between a deliberate wipe and a frozen screen.
 *
 * Deliberately NOT built with AnimatePresence around <Routes>. That is the
 * usual recipe, but it requires the outgoing route to stay mounted while it
 * animates out, which fights React.lazy and Suspense and tends to produce a
 * blank frame. A curtain that lives outside the router sidesteps all of it.
 */
export default function RouteCurtain() {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const [sweeping, setSweeping] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    // Don't sweep on the very first render — the visitor has not navigated,
    // they have arrived, and a wipe over a cold page just delays it.
    if (first.current) { first.current = false; return; }
    if (reduced) return;

    setSweeping(true);
    const done = window.setTimeout(() => setSweeping(false), DURATION.slow * 1000);
    return () => window.clearTimeout(done);
  }, [pathname, reduced]);

  return (
    <AnimatePresence>
      {sweeping && (
        <motion.div
          className="route-curtain"
          aria-hidden="true"
          initial={{ scaleY: 0, transformOrigin: 'bottom' }}
          animate={{ scaleY: [0, 1, 1, 0], transformOrigin: ['bottom', 'bottom', 'top', 'top'] }}
          transition={{ duration: DURATION.slow, times: [0, 0.42, 0.52, 1], ease: EASE }}
          exit={{ opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
}
