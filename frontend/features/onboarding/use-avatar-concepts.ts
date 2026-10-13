import { useEffect, useState } from 'react';
import {
  avatarConceptResponseSchema,
  type AvatarAnswers,
  type AvatarConceptRequest,
} from '../../../shared/avatar';
import { readApiResponse } from '@/lib/api';

export function useAvatarConcepts(
  stage: AvatarConceptRequest['stage'],
  answers: AvatarAnswers,
  subject: string,
  enabled: boolean,
) {
  const [result, setResult] = useState({ key: '', options: [] as string[], loading: false, error: '' });
  const [refresh, setRefresh] = useState(0);
  const request: AvatarConceptRequest = {
    stage,
    answers,
    subject: stage === 'detail' ? subject : undefined,
    refresh,
  };
  const requestKey = JSON.stringify(request);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55000);
    let cancelled = false;
    setResult({ key: requestKey, options: [], loading: true, error: '' });
    void (async () => {
      try {
        const response = await fetch('/api/avatar/concepts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestKey,
          signal: controller.signal,
        });
        const body = await readApiResponse(response, '头像灵感暂时不可用。');
        const parsed = avatarConceptResponseSchema.safeParse(body);
        if (!parsed.success) throw new Error('头像灵感结果不完整。');
        if (!cancelled) setResult({ key: requestKey, options: parsed.data.options, loading: false, error: '' });
      } catch (cause) {
        if (!cancelled) setResult({ key: requestKey, options: [], loading: false, error: cause instanceof Error ? cause.message : '头像灵感暂时不可用。' });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [enabled, requestKey]);

  return {
    options: enabled && result.key === requestKey ? result.options : [],
    loading: enabled && (result.key !== requestKey || result.loading),
    error: enabled && result.key === requestKey ? result.error : '',
    refresh: () => setRefresh((value) => value + 1),
  };
}
