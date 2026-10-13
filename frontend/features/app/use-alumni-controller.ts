import { useEffect, useState } from 'react';
import type {
  AccountUser,
  AuthPayload,
  PublicProfilePayload,
} from '../../../shared/account';

import type { AuthMode } from '@/features/auth/auth-dialog';
import {
  createDefaultDraft,
  type DraftProfile,
} from '@/features/onboarding/draft';
import { apiRequest } from '@/lib/api';
import type { AlumniProfile } from '@/lib/alumni-data';
import { profileFromPayload, useProfileEditor } from './use-profile-editor';
import { currentPath, readRoute, type ExitDestination, type View } from './routes';

interface AppHistoryState {
  alumniApp?: true;
}

interface MePayload { user: AccountUser | null; draft: DraftProfile | null }

export function useAlumniController() {
  const [initialRoute] = useState(readRoute);
  const [view, setView] = useState<View>(initialRoute.view);
  const [selectedProfile, setSelectedProfile] = useState<AlumniProfile | null>(null);
  const [profiles, setProfiles] = useState<AlumniProfile[]>([]);
  const [limitedProfiles, setLimitedProfiles] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authUser, setAuthUser] = useState<AccountUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [createAfterAuth, setCreateAfterAuth] = useState(false);
  const [pendingExit, setPendingExit] = useState<ExitDestination | null>(null);
  const editor = useProfileEditor(authUser, setAuthUser, setProfiles);
  const { draft, setDraft, savedDraft, profileSaving, profileSaveError, setProfileSaveError,
    visibilitySaving, visibilityError, saveProfile, updateProfileVisibility } = editor;
  const hasUnsavedChanges = view === 'create' && editor.isDirty;

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
        if (me.draft) editor.setSaved(me.draft);

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
    editor.begin(profileDraft);
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
    editor.setSaved(payload.draft);
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
      editor.setSaved(null);
      if (view === 'create' || view === 'complete') goHome();
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

  return {
    authReady,
    view,
    authUser,
    selectedProfile,
    profiles,
    limitedProfiles,
    savedDraft,
    draft,
    authOpen,
    authMode,
    pendingExit,
    profileSaving,
    profileSaveError,
    visibilitySaving,
    visibilityError,
    setAuthOpen,
    setPendingExit,
    setDraft,
    authenticated,
    openAuth,
    requestExit,
    completeProfile,
    saveAndExit,
    leaveEditor,
    updateProfileVisibility,
    goHome,
    requestCreate,
    beginProfile,
    logout,
    openProfile,
    openOwnProfile,
  };
}
