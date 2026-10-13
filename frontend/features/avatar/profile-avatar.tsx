import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileAvatar({
  imageUrl,
  label,
  className,
}: {
  imageUrl?: string;
  label: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  const src = imageUrl?.startsWith('/api/avatar/generated/') ? imageUrl : undefined;

  useEffect(() => {
    if (!src || loaded === src) return;
    const timeout = window.setTimeout(() => setFailed(src), 18000);
    return () => window.clearTimeout(timeout);
  }, [src, loaded]);

  return (
    <span role="img" aria-label={label} className={cn('relative inline-grid size-32 shrink-0 place-items-center', className)}>
      {(!src || loaded !== src || failed === src) && (
        <UserRound aria-hidden="true" className="size-[40%] opacity-60" />
      )}
      {src && failed !== src && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onLoad={() => { setLoaded(src); setFailed(''); }}
          onError={() => setFailed(src)}
          className={cn('absolute inset-0 size-full object-contain p-[5%] transition-opacity duration-300', loaded === src ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  );
}
