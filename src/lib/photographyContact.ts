export type PhotographyContact = {
  instagram: string;
  phone: string;
  email: string;
  linkedin: string;
  phoneAction: 'call' | 'whatsapp';
};

// Owner-supplied public contact details. Empty values are never rendered as links.
export const photographyContact: PhotographyContact = {
  instagram: 'blurryblue_photography',
  phone: '+94 77 206 0474',
  email: 'dulithakariyapperuma@gmail.com',
  linkedin: 'https://www.linkedin.com/in/dulitha-kariyapperuma-9829701a6',
  phoneAction: 'call',
};

export function photographyContactLinks(contact: PhotographyContact) {
  const links: { id: string; label: string; detail: string; href: string; external: boolean }[] = [];
  const email = contact.email.trim();
  const phone = contact.phone.trim();
  const digits = phone.replace(/\D/g, '');
  const instagram = contact.instagram.trim();
  const linkedin = contact.linkedin.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) links.push({ id: 'email', label: 'Email', detail: email, href: `mailto:${email}`, external: false });
  if (digits.length >= 7) links.push({ id: 'phone', label: contact.phoneAction === 'whatsapp' ? 'WhatsApp' : 'Phone', detail: phone, href: contact.phoneAction === 'whatsapp' ? `https://wa.me/${digits}` : `tel:${phone.startsWith('+') ? '+' : ''}${digits}`, external: contact.phoneAction === 'whatsapp' });
  if (instagram) {
    const handle = instagram.replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
    if (/^[a-z\d._]+$/i.test(handle)) links.push({ id: 'instagram', label: 'Instagram', detail: `@${handle}`, href: `https://www.instagram.com/${handle}/`, external: true });
  }
  if (/^https:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/(?:in|company)\/[^\s]+$/i.test(linkedin)) links.push({ id: 'linkedin', label: 'LinkedIn', detail: 'Connect with Dulitha', href: linkedin, external: true });
  return links;
}
