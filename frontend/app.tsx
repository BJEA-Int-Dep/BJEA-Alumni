import { useEffect, useState } from 'react';
import type {
  AccountUser,
  AuthPayload,
  PersistedProfileDraft,
  PublicProfilePayload,
} from '../shared/account';

import { AuthDialog, type AuthMode } from '@/features/auth/auth-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import {
  createDefaultDraft,
  draftToProfile,
  validateDraftForSave,
  type DraftProfile,
} from '@/features/onboarding/draft';
import { apiRequest } from '@/lib/api';
import type { AlumniProfile } from '@/lib/alumni-data';
import { HomeView } from '@/pages/home';
import { ProfileView } from '@/pages/profile';

type View = 'home' | 'detail' | 'create' | 'complete';

interface AppHistoryState {
  alumniApp?: true;
}

interface AppRoute {
  view: View;
  profileId?: string;
}

interface MePayload {
  user: AccountUser | null;
  draft: PersistedProfileDraft | null;
}

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

function readRoute(): AppRoute {
  const path = currentPath();
  if (path === '/create') return { view: 'create' };
  if (path === '/profile/my-profile') return { view: 'complete' };
  if (path.startsWith('/alumni/'))
    return {
      view: 'detail',
      profileId: decodeURIComponent(path.slice('/alumni/'.length)),
    };
  return { view: 'home' };
}

function profileFromPayload(payload: PublicProfilePayload): AlumniProfile {
  return { ...draftToProfile(payload.draft), id: payload.id, example: payload.example };
}

function editSnapshot(draft: DraftProfile) {
  const avatar = draft.avatar
    ? { ...draft.avatar, nicknameSuggestions: undefined }
    : undefined;
  return JSON.stringify({ ...draft, avatar });
}

interface ExitDestination {
  path: string;
  route: AppRoute;
}

export default function AlumniApp() {
  const [initialRoute] = useState(readRoute);
  const [view, setView] = useState<View>(initialRoute.view);
  const [selectedProfile, setSelectedProfile] = useState<AlumniProfile | null>(null);
  const [profiles, setProfiles] = useState<AlumniProfile[]>([]);
  const [limitedProfiles, setLimitedProfiles] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AccountUser | null>(null);
  const [savedDraft, setSavedDraft] = useState<DraftProfile | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [createAfterAuth, setCreateAfterAuth] = useState(false);
  const [draft, setDraft] = useState<DraftProfile>(createDefaultDraft);
  const [editBaseline, setEditBaseline] = useState(() => editSnapshot(draft));
  const [pendingExit, setPendingExit] = useState<ExitDestination | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');
  const hasUnsavedChanges = view === 'create' && editSnapshot(draft) !== editBaseline;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiRequest<MePayload>('/api/auth/me'),
      apiRequest<{ profiles: PublicProfilePayload[]; limited?: boolean }>('/api/profiles'),
    ])
      .then(([me, publicProfiles]) => {
        if (cancelled) return;
        const allProfiles = publicProfiles.profiles.map(profileFromPayload);
        setProfiles(allProfiles);
        setLimitedProfiles(Boolean(publicProfiles.limited));
        setAuthUser(me.user);
        if (me.draft) {
          setSavedDraft(me.draft);
          setDraft(me.draft);
          setEditBaseline(editSnapshot(me.draft));
        }

        const route = readRoute();
        if (route.view === 'detail') {
          const profile = allProfiles.find((item) => item.id === route.profileId);
          if (profile) setSelectedProfile(profile);
          else {
            window.history.replaceState({ alumniApp: true }, '', '/');
            setView('home');
          }
        }
        if (route.view === 'complete' && !me.user) {
          window.history.replaceState({ alumniApp: true }, '', '/');
          setView('home');
          setAuthOpen(true);
        } else if (route.view === 'complete' && !me.draft) {
          window.history.replaceState({ alumniApp: true }, '', '/create');
          setView('create');
        } else if (route.view === 'create' && !me.user) {
          window.history.replaceState({ alumniApp: true }, '', '/');
          setView('home');
          setAuthMode('register');
          setCreateAfterAuth(true);
          setAuthOpen(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        const route = readRoute();
        if (route.view === 'complete') {
          window.history.replaceState({ alumniApp: true }, '', '/');
          setView('home');
        }
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initialPathIsValid =
      initialRoute.view !== 'home' || currentPath() === '/';
    window.history.replaceState(
      {
        ...(window.history.state as AppHistoryState | null),
        alumniApp: true,
      },
      '',
      initialPathIsValid ? window.location.href : '/',
    );

    const handlePopState = () => {
      const route = readRoute();
      if (view === 'create' && route.view !== 'create' && hasUnsavedChanges) {
        const path = currentPath();
        window.history.pushState({ alumniApp: true }, '', '/create');
        setPendingExit({ path, route });
        return;
      }
      setAuthOpen(false);
      if ((route.view === 'complete' || route.view === 'create') && !authUser) {
        window.history.replaceState({ alumniApp: true }, '', '/');
        setView('home');
        return;
      }
      if (route.view === 'detail') {
        const profile = profiles.find((item) => item.id === route.profileId);
        if (!profile) {
          setView('home');
          return;
        }
        setSelectedProfile(profile);
      }
      if (route.view === 'complete' && savedDraft) setDraft(savedDraft);
      setView(route.view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authUser, hasUnsavedChanges, initialRoute, profiles, savedDraft, view]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const navigate = (path: string, nextView: View) => {
    window.history.pushState({ alumniApp: true }, '', path);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => navigate('/', 'home');

  const requestExit = () => {
    if (hasUnsavedChanges) setPendingExit({ path: '/', route: { view: 'home' } });
    else goHome();
  };

  const leaveEditor = (destination: ExitDestination, saved: boolean) => {
    setPendingExit(null);
    setProfileSaveError('');
    if (!saved) setDraft(savedDraft ?? createDefaultDraft());
    if (destination.route.view === 'detail') {
      const profile = profiles.find((item) => item.id === destination.route.profileId);
      if (profile) setSelectedProfile(profile);
      else destination = { path: '/', route: { view: 'home' } };
    }
    window.history.replaceState({ alumniApp: true }, '', destination.path);
    setView(destination.route.view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const beginProfile = (profileDraft = savedDraft ?? createDefaultDraft()) => {
    setDraft(profileDraft);
    setEditBaseline(editSnapshot(profileDraft));
    setProfileSaveError('');
    navigate('/create', 'create');
  };

  const requestCreate = () => {
    if (authUser) {
      beginProfile();
      return;
    }
    openAuth('register', true);
  };

  const openAuth = (mode: AuthMode, shouldContinue = false) => {
    setAuthMode(mode);
    setCreateAfterAuth(shouldContinue);
    setAuthOpen(true);
  };

  const authenticated = (payload: AuthPayload) => {
    const shouldCreate = createAfterAuth;
    setAuthUser(payload.user);
    setLimitedProfiles(false);
    void apiRequest<{ profiles: PublicProfilePayload[] }>('/api/profiles')
      .then((result) => setProfiles(result.profiles.map(profileFromPayload)))
      .catch(() => {});
    setSavedDraft(payload.draft);
    if (payload.draft) setDraft(payload.draft);
    setAuthOpen(false);
    setCreateAfterAuth(false);
    if (shouldCreate) beginProfile(payload.draft ?? createDefaultDraft());
  };

  const logout = async () => {
    try {
      await apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      setLimitedProfiles(true);
      void apiRequest<{ profiles: PublicProfilePayload[] }>('/api/profiles')
        .then((result) => setProfiles(result.profiles.map(profileFromPayload)))
        .catch(() => {});
      setSavedDraft(null);
      const freshDraft = createDefaultDraft();
      setDraft(freshDraft);
      setEditBaseline(editSnapshot(freshDraft));
      if (view === 'create' || view === 'complete') goHome();
    }
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
      const result = await apiRequest<{
        profile: PublicProfilePayload;
        published: boolean;
      }>(
        '/api/profile/me',
        { method: 'PUT', body: JSON.stringify(draft) },
      );
      const profile = profileFromPayload(result.profile);
      setProfiles((current) =>
        result.published
          ? [profile, ...current.filter((item) => item.id !== profile.id)]
          : current.filter((item) => item.id !== profile.id),
      );
      setSavedDraft(result.profile.draft);
      setDraft(result.profile.draft);
      setEditBaseline(editSnapshot(result.profile.draft));
      setAuthUser((current) =>
        current ? { ...current, hasProfile: true } : current,
      );
      return true;
    } catch (cause) {
      setProfileSaveError(
        cause instanceof Error ? cause.message : '角色卡保存失败，请重试。',
      );
      return false;
    } finally {
      setProfileSaving(false);
    }
  };

  const completeProfile = async () => {
    if (await saveProfile()) navigate('/profile/my-profile', 'complete');
  };

  const saveAndExit = async () => {
    if (!pendingExit) return;
    const destination = pendingExit;
    if (await saveProfile()) leaveEditor(destination, true);
  };

  const updateProfileVisibility = async (publicProfile: boolean) => {
    if (!authUser || !savedDraft) return;
    setVisibilitySaving(true);
    setVisibilityError('');
    try {
      const result = await apiRequest<AuthPayload>('/api/auth/preferences', {
        method: 'PUT',
        body: JSON.stringify({ ...authUser.preferences, publicProfile }),
      });
      setAuthUser(result.user);
      const profile = { ...draftToProfile(savedDraft), id: `member-${result.user.id}` };
      setProfiles((current) =>
        publicProfile
          ? [profile, ...current.filter((item) => item.id !== profile.id)]
          : current.filter((item) => item.id !== profile.id),
      );
    } catch (cause) {
      setVisibilityError(
        cause instanceof Error ? cause.message : '公开设置保存失败，请重试。',
      );
    } finally {
      setVisibilitySaving(false);
    }
  };

  const adoptAvatar = (profile: PublicProfilePayload) => {
    const updated = profile.draft;
    setDraft(updated);
    setSavedDraft(updated);
    if (authUser?.preferences.publicProfile) {
      const visible = profileFromPayload(profile);
      setProfiles((current) => [visible, ...current.filter((item) => item.id !== visible.id)]);
    }
  };

  const openProfile = (profile: AlumniProfile) => {
    if (authUser && profile.id === `member-${authUser.id}` && savedDraft) {
      setDraft(savedDraft);
      navigate('/profile/my-profile', 'complete');
      return;
    }
    setSelectedProfile(profile);
    navigate(`/alumni/${encodeURIComponent(profile.id)}`, 'detail');
  };

  const openOwnProfile = () => {
    if (!savedDraft) {
      beginProfile();
      return;
    }
    setDraft(savedDraft);
    navigate('/profile/my-profile', 'complete');
  };

  if (!authReady)
    return (
      <main className="grid min-h-screen place-items-center bg-background text-sm font-bold text-muted-foreground">
        正在加载校友宇宙…
      </main>
    );

  const authLayer = (
    <AuthDialog
      open={authOpen}
      initialMode={authMode}
      onOpenChange={setAuthOpen}
      onAuthenticated={authenticated}
      onCreateProfile={() => openAuth('register', true)}
    />
  );

  if (view === 'create') {
    return (
      <>
        <OnboardingFlow
          draft={draft}
          onDraftChange={setDraft}
          onExit={requestExit}
          onComplete={completeProfile}
          completing={profileSaving}
          completionError={profileSaveError}
        />
        <Dialog open={Boolean(pendingExit)} onOpenChange={(open) => { if (!open && !profileSaving) setPendingExit(null); }}>
          <DialogContent className="rounded-[24px] bg-[#fffaf1] p-6" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">保存刚才的修改吗？</DialogTitle>
              <DialogDescription>你修改了 Profile，离开前可以保存。</DialogDescription>
            </DialogHeader>
            {profileSaveError ? <p role="alert" className="rounded-xl bg-[#fff0dc] p-3 text-sm font-bold text-[#885421]">{profileSaveError}</p> : null}
            <div className="mt-2 grid gap-2">
              <Button onClick={() => void saveAndExit()} disabled={profileSaving} className="rounded-xl bg-[#ee573c] font-bold text-white">{profileSaving ? '正在保存…' : '保存并离开'}</Button>
              <Button variant="outline" onClick={() => pendingExit && leaveEditor(pendingExit, false)} disabled={profileSaving} className="rounded-xl bg-white font-bold">不保存</Button>
              <Button variant="ghost" onClick={() => setPendingExit(null)} disabled={profileSaving} className="rounded-xl font-bold">继续编辑</Button>
            </div>
          </DialogContent>
        </Dialog>
        {authLayer}
      </>
    );
  }

  if ((view === 'detail' && selectedProfile) || (view === 'complete' && authUser)) {
    return (
      <>
      <ProfileView
        profile={view === 'complete' ? draftToProfile(draft) : selectedProfile!}
        isOwner={view === 'complete'}
        isOwnProfile={view === 'detail' && selectedProfile?.id === `member-${authUser?.id}`}
        publicProfile={view === 'complete' && Boolean(authUser?.preferences.publicProfile)}
        visibilitySaving={visibilitySaving}
        visibilityError={visibilityError}
        onPublicProfileChange={(value) => void updateProfileVisibility(value)}
        onBack={goHome}
        onHome={goHome}
        onCreate={requestCreate}
        onEdit={() => beginProfile(savedDraft ?? draft)}
        onLogout={() => void logout()}
        shareProfileUrl={
          view === 'detail' && selectedProfile
            ? `${window.location.origin}/alumni/${encodeURIComponent(selectedProfile.id)}`
            : authUser?.preferences.publicProfile
              ? `${window.location.origin}/alumni/member-${authUser.id}`
              : undefined
        }
        avatarRecipe={view === 'complete' ? draft.avatar?.recipe : undefined}
        adoptedAvatarId={view === 'complete' ? draft.avatar?.generatedAssetId : undefined}
        onAdoptAvatar={adoptAvatar}
        commentProfileId={view === 'detail' ? selectedProfile?.id : authUser?.preferences.publicProfile ? `member-${authUser.id}` : undefined}
        loggedIn={Boolean(authUser)}
        onLogin={() => openAuth('login')}
      />
      {authLayer}
      </>
    );
  }

  return (
    <>
      <HomeView
        profiles={profiles}
        limited={limitedProfiles}
        accountName={authUser?.realName || (authUser ? '我的账号' : undefined)}
        hasProfile={authUser?.hasProfile}
        ownProfileId={authUser ? `member-${authUser.id}` : undefined}
        ownProfile={savedDraft ? draftToProfile(savedDraft) : undefined}
        onSelectProfile={openProfile}
        onOwnProfile={openOwnProfile}
        onRequestCreate={requestCreate}
        onRegister={() => openAuth('register')}
        onLogin={() => openAuth('login')}
      />

      {authLayer}
    </>
  );
}
