type Props = { compact?: boolean; className?: string };

/** The navigation uses a transparent wordmark; the full artwork remains available below. */
export default function PhotographyLogo({ compact = false, className = '' }: Props) {
  return <span className={`photo-logo ${compact ? 'photo-logo-compact' : ''} ${className}`}>
    <img src={compact ? '/brand/blurryblue-transparent.png' : '/brand/blurryblue-original.png'} alt={compact ? 'Blurry Blue' : 'Blurry Blue by Dulitha Kariyapperuma'} width={compact ? 2172 : 1563} height={compact ? 724 : 1563} draggable={false}/>
  </span>;
}
