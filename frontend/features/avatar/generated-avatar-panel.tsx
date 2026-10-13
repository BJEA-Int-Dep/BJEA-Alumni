import { useEffect, useState } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { PublicProfilePayload } from '../../../shared/account';
import type { AvatarRecipe } from '../../../shared/avatar';

interface GenerationJob {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string;
  imageUrl: string | null;
}

export function GeneratedAvatarPanel({
  recipe,
  adoptedId,
  onAdopt,
}: {
  recipe: AvatarRecipe;
  adoptedId?: string;
  onAdopt: (profile: PublicProfilePayload) => void;
}) {
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const recipeKey = JSON.stringify(recipe);

  useEffect(() => {
    let cancelled = false;
    setJob(null);
    setError('');
    void apiRequest<{ job: GenerationJob }>('/api/avatar/generations', {
      method: 'POST',
      body: JSON.stringify({ refresh: false }),
    }).then((result) => { if (!cancelled) setJob(result.job); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '头像生成暂时不可用。'); });
    return () => { cancelled = true; };
  }, [recipeKey]);

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return;
    const timer = window.setInterval(() => {
      void apiRequest<{ job: GenerationJob }>(`/api/avatar/generations/${job.id}`)
        .then((result) => setJob(result.job))
        .catch((cause) => setError(cause instanceof Error ? cause.message : '查询生成状态失败。'));
    }, 3000);
    return () => window.clearInterval(timer);
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (job?.status !== 'succeeded' || adoptedId) return;
    void apiRequest<{ draft: PublicProfilePayload['draft'] }>('/api/auth/me')
      .then((result) => {
        if (result.draft?.avatar?.generatedAssetId === job.id)
          onAdopt({ id: 'my-profile', draft: result.draft });
      }).catch(() => { /* The image is still saved; the next page load will show it. */ });
  }, [job?.id, job?.status, adoptedId, onAdopt]);

  const retry = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ job: GenerationJob }>('/api/avatar/generations', {
        method: 'POST',
        body: JSON.stringify({ refresh: true }),
      });
      setJob(result.job);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '重新生成失败。');
    } finally { setBusy(false); }
  };
  const adopt = async () => {
    if (!job) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<{ profile: PublicProfilePayload }>(`/api/avatar/generations/${job.id}/adopt`, { method: 'POST' });
      onAdopt(result.profile);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '采用头像失败。');
    } finally { setBusy(false); }
  };

  return (
    <section className="mb-5 rounded-2xl border border-[#1680bd]/20 bg-[#eaf5fa] p-4 sm:p-5">
      <div className="flex items-center gap-2 font-black"><Sparkles className="size-4 text-[#17648e]" /> 你的 AI 头像</div>
      <p className="mt-1 text-xs text-muted-foreground">{recipe.subject}{recipe.detail ? ` · ${recipe.detail}` : ''}</p>
      {!job && !error ? <p role="status" className="mt-3 text-sm font-bold">正在启动生成…</p> : null}
      {job?.status === 'queued' || job?.status === 'running' ? <p role="status" className="mt-3 text-sm font-bold">正在画头像，完成后会出现在这里。你可以先浏览其他内容。</p> : null}
      {job?.status === 'succeeded' && job.imageUrl ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="grid size-32 place-items-center rounded-2xl bg-white/70 p-2">
            <img src={job.imageUrl} alt={`生成的${recipe.subject}头像预览`} className="size-full object-contain" />
          </div>
          <div className="flex flex-wrap gap-2">
            {adoptedId === job.id ? <span className="self-center text-sm font-black text-[#3f7a3c]">已自动采用这张头像</span> : <Button onClick={() => void adopt()} disabled={busy} className="rounded-xl bg-[#ee573c] font-black text-white">采用这张</Button>}
            <Button variant="outline" onClick={() => void retry()} disabled={busy} className="rounded-xl bg-white font-bold"><RotateCw className="size-4" /> 再生成</Button>
          </div>
        </div>
      ) : null}
      {job?.status === 'failed' ? <Button variant="outline" onClick={() => void retry()} disabled={busy} className="mt-3 rounded-xl bg-white font-bold">重试生成</Button> : null}
      {error || job?.error ? <p role="alert" className="mt-3 text-xs font-bold text-[#885421]">{error || job?.error}</p> : null}
    </section>
  );
}
