import { AuthDialog } from '@/features/auth/auth-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OnboardingFlow } from '@/features/onboarding/onboarding-flow';
import { draftToProfile } from '@/features/onboarding/draft';
import { useAlumniController } from '@/features/app/use-alumni-controller';
import { HomeView } from '@/pages/home';
import { ProfileView } from '@/pages/profile';

export default function AlumniApp() {
  const {
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
  } = useAlumniController();
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
        <div key="create" className="page-enter">
          <OnboardingFlow
            draft={draft}
            onDraftChange={setDraft}
            onExit={requestExit}
            onComplete={completeProfile}
            completing={profileSaving}
            completionError={profileSaveError}
            savedAvatar={savedDraft?.avatar}
          />
        </div>
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
        <div key={view === 'detail' ? `detail-${selectedProfile!.id}` : 'complete'} className="page-enter">
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
            commentProfileId={view === 'detail' ? selectedProfile?.id : authUser?.preferences.publicProfile ? `member-${authUser.id}` : undefined}
            loggedIn={Boolean(authUser)}
            onLogin={() => openAuth('login')}
          />
        </div>
        {authLayer}
      </>
    );
  }

  return (
    <>
      <div key="home" className="page-enter">
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
      </div>

      {authLayer}
    </>
  );
}
