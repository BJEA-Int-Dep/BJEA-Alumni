import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  emptyAvatar,
  mergeSuggestions,
  type AvatarAnswers,
  type AvatarStage,
  type Suggestions,
} from '../../shared/avatar';
import type { DraftProfile } from '@/components/onboarding-flow';
import { PERSONALITIES, STATUS_OPTIONS } from '@/lib/alumni-data';

function answersFor(draft: DraftProfile, stage: AvatarStage): AvatarAnswers {
  const personality = PERSONALITIES.find(
    (item) => item.id === draft.personalityId,
  );
  return {
    personality: personality ? `${personality.label}：${personality.note}` : '',
    nickname: draft.nickname,
    description: draft.avatarDescription,
    style: draft.avatarStyle || 'playful',
    ...(stage >= 2
      ? {
          year: draft.year,
          status:
            STATUS_OPTIONS.find((item) => item.id === draft.statusId)?.label ||
            '',
          place: draft.place,
          direction: draft.direction,
        }
      : {}),
    ...(stage >= 3
      ? { reflection: draft.reflection, advice: draft.advice }
      : {}),
  };
}

export function useAvatarSuggestions(
  draft: DraftProfile,
  update: Dispatch<SetStateAction<DraftProfile>>,
  stage: AvatarStage | null,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const seenAttempt = useRef(0);
  const latest = useRef(draft);
  latest.current = draft;
  const key = stage ? JSON.stringify(answersFor(draft, stage)) : '';

  useEffect(() => {
    const forced = attempt !== seenAttempt.current;
    seenAttempt.current = attempt;
    if (!stage) {
      setLoading(false);
      setError('');
      return;
    }
    if (!forced && latest.current.avatar?.stages[stage] === key) {
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
            selection: (latest.current.avatar ?? emptyAvatar()).selection,
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
          const avatar = mergeSuggestions(
            current.avatar ?? emptyAvatar(),
            result,
          );
          return {
            ...current,
            avatar: { ...avatar, stages: { ...avatar.stages, [stage]: key } },
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
