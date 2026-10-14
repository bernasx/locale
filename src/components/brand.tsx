import { Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/" aria-label="Locale homepage"><span className="brand-mark"><Languages size={23} strokeWidth={1.8} /></span><span>locale<span className="brand-period">.</span></span></Link>;
}
