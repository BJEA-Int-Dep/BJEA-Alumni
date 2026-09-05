import { useEffect, useState } from 'react';
import { ArrowRight, GraduationCap } from 'lucide-react';

import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import {
  createDefaultDraft,
  draftToProfile,
  type DraftProfile,
} from '@/features/onboarding/draft';
import { HomeView } from '@/pages/home';
import { ProfileView } from '@/pages/profile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ALUMNI, type AlumniProfile } from '@/lib/alumni-data';

type View = 'home' | 'detail' | 'create' | 'complete';

interface AppHistoryState {
  alumniApp?: true;
  draft?: DraftProfile;
}

interface AppRoute {
  view: View;
  profile?: AlumniProfile;
  draft?: DraftProfile;
}

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

function readRoute(): AppRoute {
  const path = currentPath();

  if (path === '/create') return { view: 'create' };

  if (path === '/profile/my-profile') {
    const state = window.history.state as AppHistoryState | null;
    return state?.draft
      ? { view: 'complete', draft: state.draft }
      : { view: 'home' };
  }

  if (path.startsWith('/alumni/')) {
    const profileId = decodeURIComponent(path.slice('/alumni/'.length));
    const profile = ALUMNI.find((person) => person.id === profileId);
    if (profile) return { view: 'detail', profile };
  }

  return { view: 'home' };
}

export default function AlumniApp() {
  const [initialRoute] = useState(readRoute);
  const [view, setView] = useState<View>(initialRoute.view);
  const [selectedProfile, setSelectedProfile] = useState<AlumniProfile>(
    initialRoute.profile ?? ALUMNI[0],
  );
  const [identityOpen, setIdentityOpen] = useState(false);
  const [draft, setDraft] = useState(initialRoute.draft ?? createDefaultDraft);

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
      setView(route.view);
      if (route.profile) setSelectedProfile(route.profile);
      if (route.draft) setDraft(route.draft);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialRoute]);

  const navigate = (
    path: string,
    nextView: View,
    state: AppHistoryState = {},
  ) => {
    window.history.pushState({ alumniApp: true, ...state }, '', path);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => navigate('/', 'home');

  const requestCreate = () => {
    if (currentPath() !== '/') navigate('/', 'home');
    setIdentityOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startCreate = () => {
    setDraft(createDefaultDraft());
    setIdentityOpen(false);
    navigate('/create', 'create');
  };

  const openProfile = (profile: AlumniProfile) => {
    setSelectedProfile(profile);
    navigate(`/alumni/${encodeURIComponent(profile.id)}`, 'detail');
  };

  if (view === 'create') {
    return (
      <OnboardingFlow
        draft={draft}
        onDraftChange={setDraft}
        onExit={goHome}
        onComplete={() =>
          navigate('/profile/my-profile', 'complete', { draft })
        }
      />
    );
  }

  if (view === 'detail' || view === 'complete') {
    return (
      <ProfileView
        profile={view === 'complete' ? draftToProfile(draft) : selectedProfile}
        isOwner={view === 'complete'}
        onBack={goHome}
        onHome={goHome}
        onCreate={requestCreate}
        onEdit={() => navigate('/create?step=7', 'create')}
      />
    );
  }

  return (
    <>
      <HomeView onSelectProfile={openProfile} onRequestCreate={requestCreate} />

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
              onClick={startCreate}
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
    </>
  );
}
