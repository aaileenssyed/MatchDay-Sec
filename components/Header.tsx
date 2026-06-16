const HUB_URL = "https://side-cup-quest.vercel.app/";

function SoccerBallIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-6 w-6">
      <circle cx="32" cy="32" r="28" fill="#f8f4e8" stroke="#f4b439" strokeWidth="2" />
      <path d="M32 17L43 25L39 38H25L21 25L32 17Z" fill="#05070a" />
      <path d="M32 17V7M43 25L55 21M39 38L47 50M25 38L17 50M21 25L9 21" stroke="#05070a" strokeWidth="3" strokeLinecap="round" />
      <path d="M25 38L15 35M39 38L49 35M21 25L17 14M43 25L47 14" stroke="#05070a" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/45 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="group flex items-center gap-3 font-bold tracking-tight text-white">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#f4b439]/45 bg-[#f4b439]/10 text-[#f4b439] transition group-hover:scale-105 group-hover:rotate-12">
            <SoccerBallIcon />
          </span>
          <span className="hidden sm:inline">MatchdaySec</span>
          <span className="sm:hidden">MDS</span>
        </a>

        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 sm:gap-4">
          <a href={HUB_URL} className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
            SideQuest Cup
          </a>
          <a href="#debrief" className="rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-white">
            Debrief
          </a>
        </div>
      </nav>
    </header>
  );
}
