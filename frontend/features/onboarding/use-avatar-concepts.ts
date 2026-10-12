import { useEffect, useRef, useState } from 'react';
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
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const completed = useRef('');
  const latest = useRef({ answers, subject });
  latest.current = { answers, subject };
  const answerKey = JSON.stringify(answers);

  useEffect(() => {
    if (!enabled) return;
    const input: AvatarConceptRequest = {
      stage,
      answers: latest.current.answers,
      subject: stage === 'detail' ? latest.current.subject : undefined,
      refresh,
    };
    const key = JSON.stringify(input);
    if (completed.current === key) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55000);
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        const response = await fetch('/api/avatar/concepts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        const body = await readApiResponse(response, '头像灵感暂时不可用。');
        const parsed = avatarConceptResponseSchema.safeParse(body);
        if (!parsed.success) throw new Error('头像灵感结果不完整。');
        if (!cancelled) {
          completed.current = key;
          setOptions(parsed.data.options);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : '头像灵感暂时不可用。');
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [answerKey, enabled, refresh, stage, subject]);

  return { options, loading, error, refresh: () => setRefresh((value) => value + 1) };
}
