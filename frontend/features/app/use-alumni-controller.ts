import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const editorReturnDestination = useRef<ExitDestination>({ path: '/', route: { view: 'home' } });
  const homeScrollY = useRef(0);
  const previousView = useRef<View | null>(null);
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
      const actualRoute = readRoute();
      const destination = view === 'create' && actualRoute.view !== 'create'
        ? editorReturnDestination.current
        : { path: currentPath(), route: actualRoute };
      const { route } = destination;
      if (view === 'create' && route.view !== 'create' && hasUnsavedChanges) {
        window.history.pushState({ alumniApp: true }, '', '/create');
        setPendingExit(destination);
        return;
      }
      if (currentPath() !== destination.path) {
        window.history.replaceState({ alumniApp: true }, '', destination.path);
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
      if (view === 'home' && route.view !== 'home') homeScrollY.current = window.scrollY;
      setView(route.view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [authUser, hasUnsavedChanges, initialRoute, profiles, savedDraft, view]);

  useLayoutEffect(() => {
    if (view === 'home' && previousView.current && previousView.current !== 'home') {
      window.scrollTo(0, homeScrollY.current);
    } else if (view === 'complete' || (view === 'detail' && selectedProfile)) {
      window.scrollTo(0, 0);
    }
    previousView.current = view;
  }, [view, selectedProfile?.id]);

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
    if (view === 'home' && nextView !== 'home') homeScrollY.current = window.scrollY;
    window.history.pushState({ alumniApp: true }, '', path);
    setView(nextView);
  };

  const goHome = () => navigate('/', 'home');

  const requestExit = () => {
    const destination = editorReturnDestination.current;
    if (hasUnsavedChanges) setPendingExit(destination);
    else leaveEditor(destination, false);
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
  };

  const beginProfile = (profileDraft = savedDraft ?? createDefaultDraft()) => {
    editorReturnDestination.current = view === 'complete'
      ? { path: '/profile/my-profile', route: { view: 'complete' } }
      : { path: '/', route: { view: 'home' } };
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
