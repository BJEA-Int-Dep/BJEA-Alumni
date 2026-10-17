import { useState } from 'react';
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
  const src = imageUrl && /^\/api\/avatar\/generated\/[0-9a-f-]{36}\.png$/.test(imageUrl)
    ? imageUrl : undefined;

  return <AvatarImage key={src} src={src} label={label} className={className} />;
}

function AvatarImage({ src, label, className }: { src?: string; label: string; className?: string }) {
  const [thumbnail, setThumbnail] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [full, setFull] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const imageClass = 'absolute inset-0 size-full object-contain p-[5%]';

  return (
    <span role="img" aria-label={label} className={cn('relative inline-grid size-32 shrink-0 place-items-center', className)}>
      {(!src || (thumbnail !== 'loaded' && full !== 'loaded')) && (
        <UserRound aria-hidden="true" className="size-[40%] opacity-60" />
      )}
      {src && thumbnail !== 'failed' && full !== 'loaded' && (
        <img
          src={src.replace(/\.png$/, '.thumb.webp')}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onLoad={() => setThumbnail('loaded')}
          onError={() => setThumbnail('failed')}
          className={cn(imageClass, thumbnail === 'loaded' ? 'opacity-100' : 'opacity-0')}
        />
      )}
      {src && thumbnail !== 'loading' && full !== 'failed' && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onLoad={() => setFull('loaded')}
          onError={() => setFull('failed')}
          className={cn(imageClass, full === 'loaded' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </span>
  );
}
