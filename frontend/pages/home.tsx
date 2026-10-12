import { ArrowUpRight, LogIn, Sparkles, UserRound } from 'lucide-react';
import { SchoolHeader } from '@/components/school-header';
import { Button } from '@/components/ui/button';
import { EmojiAvatar } from '@/features/avatar/emoji-avatar';
import { TONE_CLASSES, type AlumniProfile } from '@/lib/alumni-data';

interface HomeViewProps {
  profiles: AlumniProfile[];
  accountName?: string;
  hasProfile?: boolean;
  ownProfileId?: string;
  ownProfile?: AlumniProfile;
  onSelectProfile: (profile: AlumniProfile) => void;
  onOwnProfile: () => void;
  onRequestCreate: () => void;
  onLogin: () => void;
}

export function HomeView({
  profiles,
  accountName,
  hasProfile = false,
  ownProfileId,
  ownProfile,
  onSelectProfile,
  onOwnProfile,
  onRequestCreate,
  onLogin,
}: HomeViewProps) {
  return (
    <main className={`min-h-screen overflow-x-hidden bg-background text-foreground ${hasProfile ? 'pb-16' : 'pb-32'}`}>
      <SchoolHeader
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        right={
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-[#ef593c]/20 bg-[#ef593c]/8 px-3 py-1.5 text-xs font-bold text-[#c63d27] sm:inline-flex">
              内测中
            </span>
            {accountName ? (
              <button
                type="button"
                onClick={onOwnProfile}
                className="grid size-10 place-items-center overflow-hidden rounded-full bg-[#fff0e7] ring-2 ring-[#ee573c]/30 transition hover:ring-[#ee573c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/30"
                aria-label={`查看我的 Profile（${accountName}）`}
              >
                {ownProfile ? (
                  <EmojiAvatar
                    imageUrl={ownProfile.avatarImageUrl}
                    emoji={ownProfile.emoji}
                    label={`${accountName} 的头像`}
                    className="size-10 text-2xl [&>span[title]]:hidden"
                  />
                ) : (
                  <UserRound className="size-5" aria-hidden="true" />
                )}
              </button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={onLogin}
                className="h-9 rounded-xl bg-white px-3 font-black"
              >
                <LogIn className="size-4" /> 登录
              </Button>
            )}
          </div>
        }
      />

      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-8 sm:pt-10">
        <div className="relative overflow-hidden rounded-[28px] border border-black/5 bg-[#24282c] px-5 py-7 text-white shadow-[0_24px_70px_rgba(48,39,27,0.12)] sm:px-10 sm:py-10">
          <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#ef593c] opacity-80 blur-2xl" />
          <div className="absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-[#137dbb] opacity-60 blur-3xl" />
          <div className="relative max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85 ring-1 ring-white/15">
              <Sparkles className="size-3.5 text-[#ffbc32]" />
              每个人，一条不一样的路
            </div>
            <h1 className="text-balance text-[clamp(2rem,7vw,4.6rem)] font-black leading-[0.98] tracking-[-0.055em]">
              毕业以后，
              <br />
              大家都去哪儿了？
            </h1>
            <p className="mt-4 max-w-lg text-sm font-medium leading-6 text-white/68 sm:text-base">
              没有成功模板，也不是简历排行榜。先看看不同的选择、绕路与人生支线。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-9 sm:px-8 sm:pt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#df5035]">
              Meet the alumni
            </p>
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              {profiles.length ? '先认识几位吧' : '校友墙还没有公开的 Profile'}
            </h2>
          </div>
          <p className="hidden text-sm font-medium text-muted-foreground sm:block">
            点击卡片，看看他们后来的人生支线
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {profiles.map((person) => {
            const isMine = person.id === ownProfileId;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => onSelectProfile(person)}
                className="group overflow-hidden rounded-[22px] bg-card text-left shadow-[0_10px_35px_rgba(55,45,31,0.08)] ring-1 ring-black/[0.06] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(55,45,31,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/25"
                aria-label={`查看 ${person.nickname} 的校友主页${isMine ? '（我的）' : ''}`}
              >
                <div
                  className={`relative flex aspect-[5/4] items-center justify-center overflow-hidden bg-gradient-to-br ${TONE_CLASSES[person.tone]}`}
                >
                  <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-[10px] font-black text-black/70 shadow-sm backdrop-blur-sm">
                    CLASS OF &apos;{person.year.slice(-2)}
                  </span>
                  {isMine ? (
                    <span className="absolute right-3 top-3 rounded-full bg-[#ee573c] px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                      我的
                    </span>
                  ) : person.example ? (
                    <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-black text-black/70 shadow-sm">
                      示例
                    </span>
                  ) : null}
                  <span
                    className="select-none text-[clamp(3.5rem,14vw,6.5rem)] drop-shadow-[0_12px_12px_rgba(0,0,0,0.16)] transition duration-300 group-hover:scale-110 group-hover:-rotate-3"
                    aria-hidden="true"
                  >
                    {person.emoji}
                  </span>
                  <span className="absolute bottom-3 right-3 grid size-8 place-items-center rounded-full bg-white text-black shadow-md transition group-hover:rotate-45">
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="p-3.5 sm:p-4">
                  <h3 className="truncate text-base font-black tracking-tight sm:text-lg">
                    {person.nickname}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs font-medium leading-[1.55] text-foreground/72 sm:text-sm">
                    “{person.summary}”
                  </p>
                  <p className="mt-3 truncate border-t border-black/[0.06] pt-2.5 text-[10px] font-bold text-muted-foreground sm:text-xs">
                    {person.field}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-[24px] border border-dashed border-black/15 bg-white/45 p-6 text-center sm:p-8">
          <p className="text-3xl" aria-hidden="true">
            👀
          </p>
          <h2 className="mt-2 text-xl font-black">
            还有很多人生支线，正在加载
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm font-medium leading-6 text-muted-foreground">
            这里没有排名，也没有标准答案。期待更多校友把自己的经历分享出来。
          </p>
        </div>
      </section>

      {!hasProfile ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-[#fffaf1]/92 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="text-sm font-black">校友墙上还差一个你</p>
              <p className="truncate text-xs text-muted-foreground">
                大约 3 分钟，边回答边生成角色卡
              </p>
            </div>
            <Button
              size="lg"
              onClick={onRequestCreate}
              className="h-[52px] flex-1 rounded-2xl bg-[#ee573c] px-5 text-base font-black text-white shadow-[0_8px_24px_rgba(238,87,60,0.3)] hover:bg-[#d9462f] sm:flex-none"
            >
              <Sparkles className="size-4" /> 创建我的 Profile
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
