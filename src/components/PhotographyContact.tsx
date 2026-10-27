import { motion, useReducedMotion } from 'framer-motion';
import { photographyContact, photographyContactLinks } from '@/lib/photographyContact';

function ContactIcon({ kind }: { kind: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'email' ? <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></> : kind === 'phone' ? <path d="m8 3 2 5-3 2c2 4 3 5 7 7l2-3 5 2c0 4-2 6-6 4C8 17 4 13 3 7 2 4 4 2 8 3Z"/> : kind === 'instagram' ? <><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></> : <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7m0-10v.2M11 17v-7m0 3c0-4 6-4 6 0v4"/></>}
  </svg>;
}

export default function PhotographyContactSection() {
  const reduced = useReducedMotion();
  const links = photographyContactLinks(photographyContact);
  return <section id="photo-contact" className="photo-contact" aria-labelledby="photo-contact-heading">
    <div className="photo-contact-intro"><span className="photo-contact-kicker">LET'S MAKE SOMETHING WORTH KEEPING</span><motion.h2 id="photo-contact-heading" initial={reduced ? false : { opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: .65 }}>Your moment.<br/><span>Our next frame.</span></motion.h2><p>A person, a place, an idea. Tell me what you have in mind, and let's see where it takes us.</p><span className="photo-contact-signoff">Dulitha Kariyapperuma <span> / blurry blue.</span></span></div>
    <div className="photo-contact-links">{links.length ? links.map((link, i) => <motion.a key={link.id} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined} initial={reduced ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .45, delay: i * .06 }} className="photo-contact-link"><span className="photo-contact-icon"><ContactIcon kind={link.id}/></span><span><small>{link.label}</small><strong>{link.detail}</strong></span><span className="photo-contact-arrow" aria-hidden="true">↗</span></motion.a>) : <p className="photo-contact-pending">Contact details are being added.</p>}</div>
  </section>;
}
