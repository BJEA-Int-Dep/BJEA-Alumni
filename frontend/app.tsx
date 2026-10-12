import { useEffect, useState } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';
import type {
  AccountUser,
  AuthPayload,
  PersistedProfileDraft,
  PublicProfilePayload,
} from '../shared/account';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuthDialog, type AuthMode } from '@/features/auth/auth-dialog';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import {
  createDefaultDraft,
  draftToProfile,
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

export default function AlumniApp() {
  const [initialRoute] = useState(readRoute);
  const [view, setView] = useState<View>(initialRoute.view);
  const [selectedProfile, setSelectedProfile] = useState<AlumniProfile | null>(null);
  const [profiles, setProfiles] = useState<AlumniProfile[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AccountUser | null>(null);
  const [savedDraft, setSavedDraft] = useState<DraftProfile | null>(null);
  const [identityOpen, setIdentityOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [saveAfterAuth, setSaveAfterAuth] = useState(false);
  const [draft, setDraft] = useState<DraftProfile>(createDefaultDraft);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [visibilityError, setVisibilityError] = useState('');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      apiRequest<MePayload>('/api/auth/me'),
      apiRequest<{ profiles: PublicProfilePayload[] }>('/api/profiles'),
    ])
      .then(([me, publicProfiles]) => {
        if (cancelled) return;
        const allProfiles = publicProfiles.profiles.map(profileFromPayload);
        setProfiles(allProfiles);
        setAuthUser(me.user);
        if (me.draft) {
          setSavedDraft(me.draft);
          setDraft(me.draft);
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
      setIdentityOpen(false);
      setAuthOpen(false);
      if (route.view === 'complete' && !authUser) {
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
  }, [authUser, initialRoute, profiles, savedDraft]);

  const navigate = (path: string, nextView: View) => {
    window.history.pushState({ alumniApp: true }, '', path);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => navigate('/', 'home');

  const beginProfile = (profileDraft = savedDraft ?? createDefaultDraft()) => {
    setDraft(profileDraft);
    setProfileSaveError('');
    setIdentityOpen(false);
    navigate('/create', 'create');
  };

  const requestCreate = () => {
    if (authUser) {
      beginProfile();
      return;
    }
    if (currentPath() !== '/') navigate('/', 'home');
    setIdentityOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: AuthMode, shouldContinue = false) => {
    setIdentityOpen(false);
    setAuthMode(mode);
    setSaveAfterAuth(shouldContinue);
    setAuthOpen(true);
  };

  const authenticated = (payload: AuthPayload) => {
    const shouldSave = saveAfterAuth;
    setAuthUser(payload.user);
    setSavedDraft(payload.draft);
    if (!shouldSave && payload.draft) setDraft(payload.draft);
    setAuthOpen(false);
    setSaveAfterAuth(false);
    if (shouldSave) void saveProfile();
  };

  const logout = async () => {
    try {
      await apiRequest<{ ok: true }>('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      setSavedDraft(null);
      setDraft(createDefaultDraft());
      if (view === 'create' || view === 'complete') goHome();
    }
  };

  const saveProfile = async () => {
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
      setSavedDraft(draft);
      setAuthUser((current) =>
        current ? { ...current, hasProfile: true } : current,
      );
      navigate('/profile/my-profile', 'complete');
    } catch (cause) {
      setProfileSaveError(
        cause instanceof Error ? cause.message : '角色卡保存失败，请重试。',
      );
    } finally {
      setProfileSaving(false);
    }
  };

  const completeProfile = () => {
    if (authUser) return saveProfile();
    openAuth('register', true);
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
      publishProfileAfterRegister={saveAfterAuth}
      onOpenChange={setAuthOpen}
      onAuthenticated={authenticated}
      onCreateProfile={() => beginProfile(createDefaultDraft())}
    />
  );

  if (view === 'create') {
    return (
      <>
        <OnboardingFlow
          draft={draft}
          onDraftChange={setDraft}
          onExit={goHome}
          onComplete={completeProfile}
          completing={profileSaving}
          completionError={profileSaveError}
        />
        {authLayer}
      </>
    );
  }

  if ((view === 'detail' && selectedProfile) || (view === 'complete' && authUser)) {
    return (
      <ProfileView
        profile={view === 'complete' ? draftToProfile(draft) : selectedProfile!}
        isOwner={view === 'complete'}
        publicProfile={view === 'complete' && Boolean(authUser?.preferences.publicProfile)}
        visibilitySaving={visibilitySaving}
        visibilityError={visibilityError}
        onPublicProfileChange={(value) => void updateProfileVisibility(value)}
        onBack={goHome}
        onHome={goHome}
        onCreate={requestCreate}
        onEdit={() => navigate(draft.avatar?.recipe?.subject ? '/create?step=9' : '/create?step=7', 'create')}
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
      />
    );
  }

  return (
    <>
      <HomeView
        profiles={profiles}
        accountName={authUser?.realName || (authUser ? '我的账号' : undefined)}
        hasProfile={authUser?.hasProfile}
        ownProfileId={authUser ? `member-${authUser.id}` : undefined}
        ownProfile={savedDraft ? draftToProfile(savedDraft) : undefined}
        onSelectProfile={openProfile}
        onOwnProfile={openOwnProfile}
        onRequestCreate={requestCreate}
        onLogin={() => openAuth('login')}
      />

      <Dialog open={identityOpen} onOpenChange={setIdentityOpen}>
        <DialogContent className="max-w-md gap-5 rounded-[26px] bg-[#fffaf1] p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              先对个暗号：你是？
            </DialogTitle>
            <DialogDescription className="text-sm leading-6">
              浏览不需要登录；创建角色卡只对校友开放。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Button
              className="h-16 justify-between rounded-2xl bg-[#ee573c] px-5 text-base font-black text-white hover:bg-[#d9462f]"
              onClick={() => beginProfile(createDefaultDraft())}
            >
              <span className="flex items-center gap-3">
                <GraduationCap className="size-5" /> 我是校友
              </span>
              <ArrowRight className="size-5" />
            </Button>
            <Button
              variant="outline"
              className="h-14 justify-start rounded-2xl border-black/10 bg-white px-5 text-base font-bold"
              onClick={() => setIdentityOpen(false)}
            >
              我是在校生，先逛逛
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {authLayer}
    </>
  );
}
