import type { ReactNode } from "react";

/**
 * Shared scientific-instrument chrome: edge rulers, corner registration
 * marks, vignette and film grain. Purely decorative.
 */
export default function Frame({ children }: { children?: ReactNode }) {
  return (
    <>
      <div className="ruler left" aria-hidden />
      <div className="ruler right" aria-hidden />
      <span className="mark tl" aria-hidden>+</span>
      <span className="mark tr" aria-hidden>+</span>
      <span className="mark bl" aria-hidden>+</span>
      <span className="mark br" aria-hidden>+</span>
      <div className="vignette" aria-hidden />
      <div className="grain" aria-hidden />
      {children}
    </>
  );
}
