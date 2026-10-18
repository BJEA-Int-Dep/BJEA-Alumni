import type { ReactNode } from 'react';

interface SchoolHeaderProps {
  onHome: () => void;
  right?: ReactNode;
}

export function SchoolHeader({ onHome, right }: SchoolHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/5 bg-[#fffaf1]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-8">
        <button
          type="button"
          onClick={onHome}
          className="flex min-w-0 items-center gap-2.5 rounded-xl text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1680bd]/20"
          aria-label="返回校友墙首页"
        >
          <img
            src="/school-logo.svg"
            alt="北京亦庄实验中学校徽"
            width={196}
            height={112}
            className="h-8 w-auto shrink-0 object-contain sm:h-10"
          />
          <span className="min-w-0 border-l border-black/10 pl-2.5">
            <span className="block truncate text-sm font-black tracking-tight sm:text-base">
              亦中校友宇宙
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Alumni beta
            </span>
          </span>
        </button>
        {right}
      </div>
    </header>
  );
}
