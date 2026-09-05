import { useEffect, useRef, useState } from 'react';
import {
  mergeSuggestions,
  type AvatarAnswers,
  type AvatarStage,
  type AvatarState,
  type Suggestions,
} from '../../../shared/avatar';

export function useAvatarSuggestions(
  answers: AvatarAnswers,
  avatar: AvatarState,
  update: (change: (current: AvatarState) => AvatarState) => void,
  stage: AvatarStage | null,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const seenAttempt = useRef(0);
  const latest = useRef(avatar);
  latest.current = avatar;
  const key = stage ? JSON.stringify(answers) : '';

  useEffect(() => {
    const forced = attempt !== seenAttempt.current;
    seenAttempt.current = attempt;
    if (!stage) {
      setLoading(false);
      setError('');
      return;
    }
    if (!forced && latest.current.stages[stage] === key) {
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timeout = window.setTimeout(() => controller.abort(), 55000);
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/avatar/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            stage,
            answers: JSON.parse(key),
            selection: latest.current.selection,
            refresh: attempt,
          }),
        });
        const result = (await response.json()) as Suggestions & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || '头像推荐暂时不可用，请重试。');
        if (cancelled) return;
        update((current) => {
          const avatar = mergeSuggestions(current, result);
          return {
            ...avatar,
            stages: { ...avatar.stages, [stage]: key },
          };
        });
      } catch (cause) {
        if (!cancelled)
          setError(
            controller.signal.aborted
              ? '这次等待有点久，你可以重试或保留当前头像继续。'
              : cause instanceof Error
                ? cause.message
                : '头像推荐暂时不可用。',
          );
      } finally {
        window.clearTimeout(timeout);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [stage, key, attempt, update]);

  return { loading, error, refresh: () => setAttempt((value) => value + 1) };
}
