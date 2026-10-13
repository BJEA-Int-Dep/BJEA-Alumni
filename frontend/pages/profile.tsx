import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  Eye,
  GraduationCap,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Pencil,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SchoolHeader } from '@/components/school-header';
import { ProfileAvatar } from '@/features/avatar/profile-avatar';
import { ProfileComments } from '@/features/comments/profile-comments';
import { SharePosterDialog } from '@/features/share/share-poster-dialog';
import { TONE_CLASSES, type AlumniProfile } from '@/lib/alumni-data';

type VisibilityField = 'year' | 'place' | 'direction' | 'reflection' | 'advice';

type VisibilityState = Record<VisibilityField, boolean>;

interface ProfileViewProps {
  profile: AlumniProfile;
  isOwner?: boolean;
  isOwnProfile?: boolean;
  publicProfile?: boolean;
  visibilitySaving?: boolean;
  visibilityError?: string;
  onPublicProfileChange?: (value: boolean) => void;
  onBack: () => void;
  onHome: () => void;
  onCreate: () => void;
  onEdit: () => void;
  onLogout?: () => void;
  shareProfileUrl?: string;
  commentProfileId?: string;
  loggedIn?: boolean;
  onLogin?: () => void;
}

function PrivacyBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${
        isPublic ? 'bg-[#e8f3f8] text-[#17648e]' : 'bg-[#eceae5] text-[#666b6e]'
      }`}
    >
      {isPublic ? <Eye className="size-3" /> : <Lock className="size-3" />}
      {isPublic ? '公开' : '仅自己'}
    </span>
  );
}

export function ProfileView({
  profile,
  isOwner = false,
  isOwnProfile = false,
  publicProfile = false,
  visibilitySaving = false,
  visibilityError = '',
  onPublicProfileChange,
  onBack,
  onHome,
  onCreate,
  onEdit,
  onLogout,
  shareProfileUrl,
  commentProfileId,
  loggedIn = false,
  onLogin,
}: ProfileViewProps) {
  const [shareOpen, setShareOpen] = useState(false);
  const visibility: VisibilityState = {
    year: true,
    place: true,
    direction: true,
    reflection: true,
    advice: true,
  };

  const detailRows: Array<{
    key: VisibilityField | 'status';
    icon: typeof GraduationCap;
    label: string;
    value: string;
  }> = [
    {
      key: 'year',
      icon: GraduationCap,
      label: '毕业那年',
      value: `${profile.year} 届`,
    },
    { key: 'status', icon: Briefcase, label: '现在', value: profile.status },
    { key: 'place', icon: MapPin, label: '后来去了', value: profile.place },
    {
      key: 'direction',
      icon: BookOpen,
      label: '目前方向',
      value: profile.direction,
    },
  ];

  return (
    <main className="min-h-screen bg-background pb-16 text-foreground">
      <SchoolHeader
        onHome={onHome}
        right={
          isOwner ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${publicProfile ? 'bg-[#edf5e6] text-[#3f7a3c]' : 'bg-[#eceae5] text-[#666b6e]'}`}>
              {publicProfile ? <Check className="size-3.5" /> : <Lock className="size-3.5" />}
              {publicProfile ? '已加入校友墙' : '仅自己可见'}
            </span>
          ) : !loggedIn ? (
            <Button
              onClick={onCreate}
              className="hidden h-9 rounded-xl bg-[#ee573c] px-4 font-black text-white hover:bg-[#d9462f] sm:inline-flex"
            >
              创建我的 Profile
            </Button>
          ) : null
        }
      />

      <div className="mx-auto max-w-4xl px-4 pt-5 sm:px-8 sm:pt-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="-ml-2 h-10 rounded-xl px-3 font-bold text-muted-foreground hover:bg-black/[0.05] hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> 返回校友墙
          </Button>
          {!isOwner ? (
            <Button variant="outline" onClick={() => setShareOpen(true)} className="h-10 rounded-xl border-black/10 bg-white px-4 font-black">
              <Share2 className="size-4" /> 分享
            </Button>
          ) : null}
        </div>

        {profile.example ? (
          <p className="mb-4 rounded-xl bg-[#fff0dc] px-4 py-2 text-xs font-bold text-[#885421]">
            示例 Profile · 以下经历为虚构内容
          </p>
        ) : null}

        {isOwner ? (
          <section className="mb-5 rounded-2xl border border-[#64a94e]/25 bg-[#edf5e6] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#4f9445] shadow-sm">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black">你的 Profile 已经保存</p>
                <p className="mt-1 text-xs font-medium leading-5 text-[#52714e]">
                  {publicProfile ? '已发布到校友墙，大家可以看到。' : '目前只有你能看到。'}邮箱不会公开；随时可以调整右侧的公开开关。
                </p>
              </div>
              <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-xs font-bold text-[#52714e]">
                <input
                  type="checkbox"
                  checked={publicProfile}
                  onChange={(event) => onPublicProfileChange?.(event.target.checked)}
                  disabled={visibilitySaving}
                  className="size-5 accent-[#ee573c]"
                />
                公开
              </label>
            </div>
            {visibilitySaving ? <p role="status" className="mt-3 text-xs text-[#52714e]">正在保存公开设置…</p> : null}
            {visibilityError ? <p role="alert" className="mt-3 text-xs font-bold text-destructive">{visibilityError}</p> : null}
          </section>
        ) : null}

        <article className="overflow-hidden rounded-[30px] bg-white shadow-[0_24px_70px_rgba(54,44,30,0.12)] ring-1 ring-black/[0.06]">
          <div
            className={`relative min-h-[330px] overflow-hidden bg-gradient-to-br p-6 sm:min-h-[410px] sm:p-10 ${TONE_CLASSES[profile.tone]}`}
          >
            <div className="absolute -left-16 top-10 size-48 rounded-full border-[32px] border-white/14" />
            <div className="absolute -bottom-20 right-4 size-52 rotate-12 rounded-[48px] bg-white/13" />
            <div className="relative flex h-full min-h-[282px] flex-col justify-between sm:min-h-[330px]">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-white/88 px-3 py-1.5 text-[11px] font-black text-black/65 shadow-sm backdrop-blur-sm">
                  CLASS OF &apos;{profile.year.slice(-2)}
                </span>
                <span className="rounded-full bg-black/15 px-3 py-1.5 text-[11px] font-black text-white backdrop-blur-sm">
                  亦中校友角色卡
                </span>
              </div>
              <ProfileAvatar
                imageUrl={profile.avatarImageUrl}
                label={`${profile.nickname} 的角色头像${profile.avatarLabel ? `：${profile.avatarLabel}` : ''}`}
                className="size-44 self-center select-none drop-shadow-[0_20px_18px_rgba(0,0,0,0.2)] sm:size-56"
              />
              <div className="max-w-2xl rounded-[22px] bg-white/88 p-4 shadow-sm backdrop-blur-md sm:p-5">
                <h1 className="text-3xl font-black tracking-tight text-[#23272b] sm:text-4xl">
                  {profile.nickname}
                </h1>
                {profile.summary ? <p className="mt-1.5 text-sm font-bold leading-6 text-[#3c4246] sm:text-base">“{profile.summary}”</p> : null}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-9">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#df5035]">
              Where life went
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              后来的人生轨迹
            </h2>

            <div className="mt-6 divide-y divide-black/[0.07] rounded-2xl border border-black/[0.07] bg-[#fcfaf5] px-4 sm:px-6">
              {detailRows.filter((row) => row.value).map((row) => {
                const Icon = row.icon;
                const isPublic =
                  row.key === 'status' ? true : publicProfile && visibility[row.key];
                return (
                  <div
                    key={row.key}
                    className="grid gap-2 py-4 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4"
                  >
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                      <Icon className="size-4" /> {row.label}
                    </div>
                    <p className="text-sm font-bold leading-6 sm:text-base">
                      {row.value}
                    </p>
                    {isOwner && row.key !== 'status' ? (
                      <PrivacyBadge isPublic={isPublic} />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-10">
              {profile.reflection ? <section>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                    <MessageCircle className="size-4" /> 一点真心话
                  </p>
                  {isOwner ? (
                    <PrivacyBadge isPublic={publicProfile && visibility.reflection} />
                  ) : null}
                </div>
                <p className="mt-3 text-lg font-black leading-8">
                  {profile.reflection}
                </p>
              </section> : null}
              {profile.advice ? <section>
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-black text-muted-foreground">
                    <Sparkles className="size-4" /> 给学弟学妹的话
                  </p>
                  {isOwner ? (
                    <PrivacyBadge isPublic={publicProfile && visibility.advice} />
                  ) : null}
                </div>
                <blockquote className="mt-3 border-l-4 border-[#f6a624] pl-4 text-lg font-black leading-8">
                  “{profile.advice}”
                </blockquote>
              </section> : null}
            </div>
          </div>
        </article>

        {commentProfileId && onLogin ? <ProfileComments profileId={commentProfileId} loggedIn={loggedIn} onLogin={onLogin} /> : null}

        {isOwner ? (
          <div className="mt-5 flex gap-2 rounded-2xl border border-[#64a94e]/25 bg-[#edf5e6] p-4 sm:justify-end">
              <Button variant="outline" onClick={onEdit} className="h-10 flex-1 rounded-xl border-black/10 bg-white px-4 font-black sm:flex-none">
                <Pencil className="size-4" /> 继续修改
              </Button>
              <Button onClick={() => setShareOpen(true)} className="h-10 flex-1 rounded-xl bg-[#24282c] px-4 font-black text-white hover:bg-black sm:flex-none">
                <Share2 className="size-4" /> 分享
              </Button>
          </div>
        ) : null}

        {!isOwner && !isOwnProfile ? <aside className="mt-6 rounded-[24px] border border-[#1680bd]/18 bg-[#eaf5fa] p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-[#176e9e] shadow-sm">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2 className="font-black">想和这位校友聊聊？</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[#476b7f]">
                为保护隐私，网站不展示直接联系方式。可以联系学校升学指导老师，由老师在合适的情况下帮助牵线。
              </p>
            </div>
          </div>
        </aside> : null}

        {!isOwner && !loggedIn ? (
          <div className="mt-8 text-center">
            <p className="text-sm font-bold text-muted-foreground">
              校友墙上还差一个你
            </p>
            <Button
              onClick={onCreate}
              className="mt-3 h-12 rounded-2xl bg-[#ee573c] px-7 text-base font-black text-white hover:bg-[#d9462f]"
            >
              <Sparkles className="size-4" /> 创建我的 Profile
            </Button>
          </div>
        ) : null}

        {isOwner && onLogout ? (
          <div className="mt-8 text-center">
            <Button variant="ghost" onClick={onLogout} className="text-sm font-bold text-muted-foreground">
              <LogOut className="size-4" /> 退出登录
            </Button>
          </div>
        ) : null}
      </div>

      <SharePosterDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        profile={profile}
        profileUrl={shareProfileUrl}
        siteUrl={`${window.location.origin}/`}
      />
    </main>
  );
}
