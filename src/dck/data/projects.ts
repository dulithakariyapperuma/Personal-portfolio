/**
 * The projects shown in DCK CORP OS.
 *
 * The three below are placeholders with stock photography, kept only so the
 * explorer is not empty. `sample: true` is what drives the "Concept study"
 * badge — set it to false and the badge is replaced by the real `status`,
 * so nothing can quietly present a demo as shipped work.
 *
 * The shape is built for engineering work rather than concept art: a real
 * entry wants to say who it was for, what it was built with, what the
 * person actually did, and what changed as a result. That last field is the
 * one most portfolios skip and the one a reader actually wants.
 */
export type Project = {
  /** Short, and how you would say it out loud. Shown as the window title. */
  name: string;
  /** One line of what kind of thing it is, uppercase in the UI. */
  category: string;
  /** Year, or a range like '2023–24'. */
  year: string;
  /** Discipline and stack, one line: 'API integration / WSO2, Java'. */
  type: string;
  /** Who it was for. Omit if it cannot be named — see `clientNote`. */
  client?: string;
  /** Use when a client is under NDA: 'A Sri Lankan commercial bank'. */
  clientNote?: string;
  /** What YOU did. Not what the team did. */
  role?: string;
  /** Technologies, for the chip row. Four or five, not fifteen. */
  stack?: string[];
  /** Two or three sentences. What the problem was, and what you built. */
  desc: string;
  /** What changed because it exists. Numbers if you have them. */
  outcome?: string;
  /** 'Shipped' | 'In production' | 'Prototype' | 'Archived' — your words. */
  status?: string;
  /** Public link, if there is one. */
  link?: string;
  /** Put files in public/dck/projects/ and reference '/dck/projects/x.webp'. */
  image: string;
  /** Always set this. Leaving it true on real work understates you. */
  sample: boolean;
};

export const projects: Project[] = [
  {
    name: 'MONOLITH',
    category: 'DIGITAL EXPERIENCE',
    year: '2026',
    type: 'Web design / Development',
    image: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=1300&q=85',
    desc: 'An architectural study in clarity. A concept digital experience exploring the space between physical structures and the interfaces we inhabit.',
    sample: true,
  },
  {
    name: 'FORM / 02',
    category: 'IDENTITY SYSTEM',
    year: '2026',
    type: 'Art direction / Identity',
    image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=85',
    desc: 'A concept identity system built from structure, repetition, and restraint. An exploration of how simple forms become a distinctive visual language.',
    sample: true,
  },
  {
    name: 'SIGNAL',
    category: 'EXPERIMENTAL LAB',
    year: '2025',
    type: 'Creative coding / Three.js',
    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85',
    desc: 'An ongoing concept experiment in generative movement. Organic rhythms and digital systems meet in an ever-changing visual landscape.',
    sample: true,
  },
];

/*
TEMPLATE — copy this, fill it in, delete the placeholders above.
Only name, category, year, type, desc, image and sample are required.

  {
    name: 'WSO2 API Gateway Migration',
    category: 'SYSTEM INTEGRATION',
    year: '2024',
    type: 'Integration engineering / WSO2 API Manager, Java',
    clientNote: 'A Sri Lankan commercial bank',
    role: 'Led the migration and wrote the mediation layer.',
    stack: ['WSO2 API Manager', 'Java', 'Docker', 'Oracle'],
    desc: 'Legacy SOAP services were exposed directly to partner banks with '
        + 'no throttling or central auth. Built a gateway layer that fronted '
        + 'them with REST, OAuth2 and per-partner rate limits.',
    outcome: 'Cut partner onboarding from three weeks to two days.',
    status: 'In production',
    image: '/dck/projects/gateway.webp',
    sample: false,
  },
*/
