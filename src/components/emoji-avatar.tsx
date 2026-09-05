import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export function EmojiAvatar({
  imageUrl,
  emoji,
  label,
  className,
}: {
  imageUrl?: string;
  emoji: string;
  label: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState('');
  const [failed, setFailed] = useState('');
  // A same-origin path is the only accepted image source, including restored history state.
  const src = imageUrl?.startsWith('/api/avatar/images/')
    ? imageUrl
    : undefined;
  useEffect(() => {
    if (!src || loaded === src) return;
    const timeout = window.setTimeout(() => setFailed(src), 18000);
    return () => window.clearTimeout(timeout);
  }, [src, loaded]);
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'relative inline-grid size-32 shrink-0 place-items-center text-7xl',
        className,
      )}
    >
      {(!src || loaded !== src || failed === src) && (
        <span aria-hidden="true">{emoji}</span>
      )}
      {src && failed !== src && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          onLoad={() => {
            setLoaded(src);
            setFailed('');
          }}
          onError={() => setFailed(src)}
          className={cn(
            'absolute inset-0 size-full object-contain transition-opacity duration-300',
            loaded === src ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
      {src && failed === src && (
        <span
          title="已保留你的组合"
          className="absolute -bottom-4 whitespace-nowrap text-[10px] font-medium text-foreground/60"
        >
          图片暂不可用
        </span>
      )}
    </span>
  );
}
