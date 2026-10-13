import { useEffect, useRef, useState } from 'react';
import { RotateCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import type { Tone } from '@/lib/alumni-data';
import type { AvatarRecipe } from '../../../shared/avatar';

interface GenerationJob {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  error: string;
  imageUrl: string | null;
}

export function GeneratedAvatarPanel({
  recipe,
  tone,
  adoptedId,
  onAdopt,
}: {
  recipe: AvatarRecipe;
  tone: Tone;
  adoptedId?: string;
  onAdopt: (id: string) => void;
}) {
  const [jobState, setJobState] = useState<{ key: string; job: GenerationJob } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const recipeKey = JSON.stringify({ recipe, tone });
  const job = jobState?.key === recipeKey ? jobState.job : null;
  const currentKey = useRef(recipeKey);
  currentKey.current = recipeKey;

  useEffect(() => {
    setError('');
  }, [recipeKey]);

  useEffect(() => {
    if (!job || (job.status !== 'queued' && job.status !== 'running')) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void apiRequest<{ job: GenerationJob }>(`/api/avatar/generations/${job.id}`)
        .then((result) => { if (!cancelled) setJobState({ key: recipeKey, job: result.job }); })
        .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : '查询生成状态失败。'); });
    }, 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [job?.id, job?.status, recipeKey]);

  const generate = async () => {
    const requestedKey = recipeKey;
    setBusy(true);
    setJobState(null);
    setError('');
    try {
      const result = await apiRequest<{ job: GenerationJob }>('/api/avatar/generations', {
        method: 'POST',
        body: JSON.stringify({ recipe, tone, refresh: true }),
      });
      if (currentKey.current === requestedKey) setJobState({ key: requestedKey, job: result.job });
    } catch (cause) {
      if (currentKey.current === requestedKey)
        setError(cause instanceof Error ? cause.message : '头像生成暂时不可用。');
    } finally { setBusy(false); }
  };

  return (
    <div className="pt-1">
      <div className="flex items-center gap-2 font-black"><Sparkles className="size-4 text-[#df5035]" /> 生成头像</div>
      <p className="mt-1 text-xs text-muted-foreground">先生成预览，喜欢再采纳。采纳后保存 Profile 才会正式生效。</p>
      <Button variant="outline" onClick={() => void generate()} disabled={busy || job?.status === 'queued' || job?.status === 'running'} className="mt-3 rounded-xl bg-white font-bold">
        <RotateCw className="size-4" /> {job?.status === 'succeeded' ? '重新生成头像' : '生成头像'}
      </Button>
      {busy || job?.status === 'queued' || job?.status === 'running' ? <p role="status" className="mt-3 text-sm font-bold">正在画头像，完成后会出现在这里。</p> : null}
      {job?.status === 'succeeded' && job.imageUrl ? (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="grid size-32 place-items-center rounded-2xl bg-white p-2 ring-1 ring-black/10">
            <img src={job.imageUrl} alt={`生成的${recipe.subject}头像预览`} className="size-full object-contain" />
          </div>
          {adoptedId === job.id
            ? <span className="text-sm font-black text-[#3f7a3c]">已采纳，保存 Profile 后生效</span>
            : <Button onClick={() => onAdopt(job.id)} className="rounded-xl bg-[#ee573c] font-black text-white">采纳新头像</Button>}
        </div>
      ) : null}
      {error || job?.error ? <p role="alert" className="mt-3 text-xs font-bold text-[#885421]">{error || job?.error}</p> : null}
    </div>
  );
}
