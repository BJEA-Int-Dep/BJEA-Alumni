import { useEffect, useRef, useState } from 'react';
import {
  nicknameSuggestionsSchema,
  type AvatarAnswers,
  type NicknameSuggestions,
} from '../../../shared/avatar';
import { ApiRequestError, readApiResponse } from '@/lib/api';

export function useNicknameSuggestions(
  answers: AvatarAnswers,
  update: (names: string[]) => void,
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
    const answers = { ...latestAnswers.current, nickname: '' };
    const key = JSON.stringify(answers);
    if (!forced && completedKey.current === key) return;
    forcedAttempt.current = attempt;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55000);
    let cancelled = false;
    setLoading(true);
    setError('');
    void (async () => {
      try {
        let result: NicknameSuggestions | undefined;
        for (let requestAttempt = 0; requestAttempt < 2; requestAttempt++) {
          try {
            const response = await fetch('/api/nicknames/suggestions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({ answers, refresh: attempt }),
            });
            const body = await readApiResponse<NicknameSuggestions>(
              response,
              '昵称灵感暂时不可用，请重试。',
            );
            const parsed = nicknameSuggestionsSchema.safeParse(body);
            if (!parsed.success)
              throw new ApiRequestError('昵称结果不完整，请重试。', response.status, true);
            result = parsed.data;
            break;
          } catch (cause) {
            const canRetry =
              !controller.signal.aborted &&
              requestAttempt === 0 &&
              (!(cause instanceof ApiRequestError) || cause.retryable);
            if (!canRetry) throw cause;
          }
        }
        if (!result) throw new Error('昵称灵感暂时不可用，请重试。');
        if (cancelled) return;
        completedKey.current = key;
        update(result.nicknameSuggestions);
      } catch (cause) {
        if (!cancelled)
          setError(
            controller.signal.aborted
              ? '这次等待有点久，请重试。'
              : cause instanceof Error
                ? cause.message
                : '昵称灵感暂时不可用。',
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
