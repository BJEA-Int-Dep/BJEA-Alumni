import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AlumniProfile } from '@/lib/alumni-data';
import { renderSharePoster } from './render-share-poster';

function localAddressHint(url: string) {
  const host = new URL(url).hostname;
  if (host === 'localhost' || host === '127.0.0.1')
    return '目前二维码只在这台设备上可打开；想用手机扫码，请从电脑的局域网地址访问网站后再保存。';
  if (host.startsWith('192.168.') || host.startsWith('10.') || /^172\.(1[6-9]|2\d|3[01])\./.test(host))
    return '目前使用局域网地址，只有连入同一网络的人能扫码打开；上线后海报会使用正式网址。';
  return '';
}

export function SharePosterDialog({
  open,
  onOpenChange,
  profile,
  profileUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: AlumniProfile;
  profileUrl?: string;
}) {
  const [posterUrl, setPosterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !profileUrl) return;
    let cancelled = false;
    let objectUrl = '';
    setPosterUrl('');
    setError('');
    setLoading(true);
    void renderSharePoster(profile, profileUrl)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setPosterUrl(objectUrl);
        else URL.revokeObjectURL(objectUrl);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '海报生成失败，请重试。');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, profile, profileUrl]);

  const download = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = `${profile.nickname.replace(/[^\p{L}\p{N}_-]+/gu, '-') || '校友'}-角色卡.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[26px] bg-[#f1eee6] p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">分享角色卡</DialogTitle>
          <DialogDescription>
            保存海报后发给朋友，扫一扫二维码就能打开这张 Profile。
          </DialogDescription>
        </DialogHeader>
        {!profileUrl ? (
          <p className="rounded-2xl bg-[#fff0dc] p-4 text-sm font-bold leading-6 text-[#885421]">
            请先开启上方的“公开我的 Profile”，再生成可扫码打开的海报。
          </p>
        ) : (
          <>
            {loading ? <div role="status" className="grid aspect-[18/25] w-full max-w-[330px] place-items-center self-center rounded-[24px] bg-[#24282c] text-sm font-bold text-white/80">正在制作海报…</div> : null}
            {posterUrl ? <img src={posterUrl} alt={`${profile.nickname} 的分享海报，包含 Profile 二维码`} className="mx-auto w-full max-w-[330px] rounded-[24px] shadow-[0_20px_48px_rgba(0,0,0,0.18)]" /> : null}
            {error ? <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{error}</p> : null}
            {localAddressHint(profileUrl) ? <p className="text-xs font-medium leading-5 text-muted-foreground">{localAddressHint(profileUrl)}</p> : null}
            <Button onClick={download} disabled={!posterUrl} className="h-11 w-full rounded-xl bg-[#24282c] font-black text-white hover:bg-black">
              <Download className="size-4" /> 保存图片
            </Button>
            <p className="text-center text-xs text-muted-foreground">如果手机没有直接下载，也可以长按海报图片保存。</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
