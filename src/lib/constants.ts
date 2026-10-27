/**
 * Site-wide constants.
 *
 * PHOTOGRAPHY_URL: the connector links out to your existing photography
 * website. Replace the placeholder below with your actual domain —
 * the site is intentionally NOT rebuilt here, it is simply linked to.
 */
export const PHOTOGRAPHY_URL = "https://www.your-photography-domain.com";

export const SITE_NAME = "DULITHA KARIYAPPERUMA";
export const TAGLINE = "Engineer by logic. Photographer by perspective.";
export const MOTTO = "Two Minds. One Vision.";

/** Approximate origin coordinates used for the scientific readout (Colombo, Sri Lanka). */
export const ORIGIN_COORDS = "06.9271°N — 79.8612°E";

export type HemisphereId = "L" | "R";

export interface HemisphereMeta {
  id: HemisphereId;
  index: string;
  title: string;
  subtitle: string;
  hue: "cyan" | "amber";
}

export const HEMISPHERES: Record<HemisphereId, HemisphereMeta> = {
  L: {
    id: "L",
    index: "01",
    title: "PROGRAMMING",
    subtitle: "Engineering · Software · AI",
    hue: "cyan",
  },
  R: {
    id: "R",
    index: "02",
    title: "PHOTOGRAPHY",
    subtitle: "Light · Composition · Stories",
    hue: "amber",
  },
};
