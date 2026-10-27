import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width?: number;
  height?: number;
  delay?: number;
  loading?: 'eager' | 'lazy';
};

export default function AnimatedPhoto({ src, srcSet, sizes, alt, width, height, delay = 0, loading = 'lazy' }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '50px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <img ref={ref} className="photo-drifting-image" decoding="async" src={src} srcSet={srcSet} sizes={sizes} width={width} height={height} alt={alt} loading={loading} draggable={false} style={{ animationDelay: `${-delay}s`, animationPlayState: visible ? 'running' : 'paused' }}/>;
}
