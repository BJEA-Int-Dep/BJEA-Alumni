import { useState, type Dispatch, type SetStateAction } from 'react';
import type { AccountUser, PublicProfilePayload } from '../../../shared/account';
import { createDefaultDraft, draftToProfile, validateDraftForSave, type DraftProfile } from '@/features/onboarding/draft';
import { apiRequest } from '@/lib/api';
import type { AlumniProfile } from '@/lib/alumni-data';

export function profileFromPayload(payload: PublicProfilePayload): AlumniProfile {
  return { ...draftToProfile(payload.draft), id: payload.id, example: payload.example };
}

function editSnapshot(draft: DraftProfile) {
  const avatar = draft.avatar ? { ...draft.avatar, nicknameSuggestions: undefined } : undefined;
  return JSON.stringify({ ...draft, avatar });
}

export function useProfileEditor(
  authUser: AccountUser | null,
  setAuthUser: Dispatch<SetStateAction<AccountUser | null>>,
  setProfiles: Dispatch<SetStateAction<AlumniProfile[]>>,
) {
  const [savedDraft, setSavedDraft] = useState<DraftProfile | null>(null);
  const [draft, setDraft] = useState<DraftProfile>(createDefaultDraft);
  const [baseline, setBaseline] = useState(() => editSnapshot(draft));
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  const setSaved = (value: DraftProfile | null) => {
    const next = value ?? createDefaultDraft();
    setSavedDraft(value);
    setDraft(next);
    setBaseline(editSnapshot(next));
  };

  const begin = (value: DraftProfile) => {
    setDraft(value);
    setBaseline(editSnapshot(value));
    setProfileSaveError('');
  };

  const saveProfile = async (): Promise<boolean> => {
    const validationError = validateDraftForSave(draft);
    if (validationError) {
      setProfileSaveError(validationError);
      return false;
    }
    setProfileSaving(true);
    setProfileSaveError('');
    try {
      const result = await apiRequest<{ profile: PublicProfilePayload; published: boolean }>(
        '/api/profile/me',
        { method: 'PUT', body: JSON.stringify(draft) },
      );
      const profile = profileFromPayload(result.profile);
      setProfiles((current) => result.published
        ? [profile, ...current.filter((item) => item.id !== profile.id)]
        : current.filter((item) => item.id !== profile.id));
      setSaved(result.profile.draft);
      setAuthUser((current) => current ? { ...current, hasProfile: true } : current);
      return true;
    } catch (cause) {
      setProfileSaveError(cause instanceof Error ? cause.message : '角色卡保存失败，请重试。');
      return false;
    } finally {
      setProfileSaving(false);
    }
  };

  const updateProfileVisibility = async (publicProfile: boolean) => {
    if (!authUser || !savedDraft) return;
    setVisibilitySaving(true);
    setVisibilityError('');
    try {
      const result = await apiRequest<{ user: AccountUser }>('/api/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify({ ...authUser.preferences, publicProfile }),
      });
      setAuthUser(result.user);
      const profile = { ...draftToProfile(savedDraft), id: `member-${result.user.id}` };
      setProfiles((current) => publicProfile
        ? [profile, ...current.filter((item) => item.id !== profile.id)]
        : current.filter((item) => item.id !== profile.id));
    } catch (cause) {
      setVisibilityError(cause instanceof Error ? cause.message : '公开设置保存失败，请重试。');
    } finally {
      setVisibilitySaving(false);
    }
  };

  return {
    draft,
    setDraft,
    savedDraft,
    isDirty: editSnapshot(draft) !== baseline,
    profileSaving,
    profileSaveError,
    setProfileSaveError,
    visibilitySaving,
    visibilityError,
    setSaved,
    begin,
    saveProfile,
    updateProfileVisibility,
  };
}
