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
import { renderAlumniWallPoster, renderSharePoster } from './render-share-poster';

type ShareMode = 'wall' | 'profile';

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
  siteUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: AlumniProfile;
  profileUrl?: string;
  siteUrl: string;
}) {
  const [mode, setMode] = useState<ShareMode>('wall');
  const [posterUrl, setPosterUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const activeUrl = mode === 'profile' && profileUrl ? profileUrl : siteUrl;
  const addressHint = localAddressHint(activeUrl);

  useEffect(() => {
    if (open) setMode('wall');
  }, [open]);

  useEffect(() => {
    if (!open || (mode === 'profile' && (!profile || !profileUrl))) return;
    let cancelled = false;
    let objectUrl = '';
    setPosterUrl('');
    setError('');
    setLoading(true);
    void (mode === 'profile' ? renderSharePoster(profile!, profileUrl!) : renderAlumniWallPoster(siteUrl))
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
  }, [open, mode, profile, profileUrl, siteUrl]);

  const download = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.href = posterUrl;
    link.download = mode === 'profile' && profile
      ? `${profile.nickname.replace(/[^\p{L}\p{N}_-]+/gu, '-') || '校友'}-角色卡.png`
      : '亦中校友墙-分享海报.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto rounded-[26px] bg-[#f1eee6] p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">{mode === 'wall' ? '分享校友墙' : '分享 Profile'}</DialogTitle>
          <DialogDescription>
            保存海报发给朋友，扫一扫二维码就能打开{mode === 'wall' ? '网站' : '这张 Profile'}。
          </DialogDescription>
        </DialogHeader>
        {profile ? (
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/70 p-1.5" role="group" aria-label="选择分享内容">
            <button type="button" aria-pressed={mode === 'wall'} onClick={() => setMode('wall')} className={`rounded-xl px-2 py-2.5 text-sm font-black ${mode === 'wall' ? 'bg-[#24282c] text-white' : 'text-[#555c60]'}`}>
              分享校友墙
            </button>
            <button type="button" aria-pressed={mode === 'profile'} disabled={!profileUrl} onClick={() => setMode('profile')} className={`rounded-xl px-2 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${mode === 'profile' ? 'bg-[#24282c] text-white' : 'text-[#555c60]'}`}>
              分享这个 Profile
            </button>
          </div>
        ) : null}
        {profile && !profileUrl ? <p className="text-xs font-medium text-muted-foreground">公开 Profile 后才可以分享个人海报；分享校友墙无需公开个人信息。</p> : null}
        <p className="text-xs font-medium text-muted-foreground">
          {mode === 'wall' ? '通用海报不包含个人资料，二维码指向校友墙首页。' : '个人海报包含这张 Profile 的信息，二维码指向其公开页面。'}
        </p>
        {loading ? <div role="status" className="grid aspect-[18/25] w-full max-w-[330px] place-items-center self-center rounded-[24px] bg-[#24282c] text-sm font-bold text-white/80">正在制作海报…</div> : null}
        {posterUrl ? <img src={posterUrl} alt={mode === 'wall' ? '校友墙分享海报，包含首页二维码' : `${profile?.nickname} 的分享海报，包含 Profile 二维码`} className="mx-auto w-full max-w-[330px] rounded-[24px] shadow-[0_20px_48px_rgba(0,0,0,0.18)]" /> : null}
        {error ? <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{error}</p> : null}
        {addressHint ? <p className="text-xs font-medium leading-5 text-muted-foreground">{addressHint}</p> : null}
        <Button onClick={download} disabled={!posterUrl} className="h-11 w-full rounded-xl bg-[#24282c] font-black text-white hover:bg-black">
          <Download className="size-4" /> 保存图片
        </Button>
        <p className="text-center text-xs text-muted-foreground">如果手机没有直接下载，也可以长按海报图片保存。</p>
      </DialogContent>
    </Dialog>
  );
}
