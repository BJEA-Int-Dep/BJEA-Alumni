import { useEffect, useRef, useState } from 'react';
import {
  mergeSuggestions,
  type AvatarAnswers,
  type AvatarState,
  type Suggestions,
} from '../../../shared/avatar';

export function useAvatarSuggestions(
  answers: AvatarAnswers,
  update: (change: (current: AvatarState) => AvatarState) => void,
  enabled: boolean,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const completedKey = useRef('');
  const latestAnswers = useRef(answers);
  latestAnswers.current = answers;
  const forcedAttempt = useRef(0);

  useEffect(() => {
    const forced = attempt !== forcedAttempt.current;
    if (!enabled && !forced) {
      setLoading(false);
      setError('');
      return;
    }
    const key = JSON.stringify(latestAnswers.current);
    if (!forced && completedKey.current === key) return;
    forcedAttempt.current = attempt;
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
            answers: latestAnswers.current,
            refresh: attempt,
          }),
        });
        const result = (await response.json()) as Suggestions & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(result.error || '头像推荐暂时不可用，请重试。');
        if (cancelled) return;
        completedKey.current = key;
        update((current) => mergeSuggestions(current, result));
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
  }, [attempt, enabled, update]);

  return { loading, error, refresh: () => setAttempt((value) => value + 1) };
}
