"use client";

import Link from "next/link";
import Image from "next/image";

export default function HomePage() {
  // Mock User Data
  const user = {
    name: "Vaibhav Ghoshi",
    email: "vaibhav@gmail.com",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vaibhav" // Placeholder for Google photo
  };

  return (
    <div className="flex min-h-screen bg-black">
      {/* Sidebar - Optional but adds to 'Command Center' feel */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-white/5 p-6 space-y-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
            <span className="text-zinc-100 font-bold">G</span>
          </div>
          <span className="font-bold text-zinc-100 tracking-tight">Social Grind</span>
        </div>
        
        <nav className="space-y-2">
          <NavItem icon={<DashboardIcon />} label="Dashboard" active />
          <NavItem icon={<ChallengesIcon />} label="Challenges" />
          <NavItem icon={<NetworkIcon />} label="Social Network" />
          <NavItem icon={<StatsIcon />} label="Analytics" />
          <NavItem icon={<SettingsIcon />} label="Settings" />
        </nav>

        <div className="mt-auto p-4 rounded-3xl bg-white/5 border border-white/5">
          <p className="text-xs text-zinc-500 mb-2 font-sans uppercase tracking-widest">Your Rank</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-neon/20 flex items-center justify-center border border-brand-neon/30 text-brand-neon font-bold">#42</div>
            <div>
              <p className="text-zinc-100 font-bold text-sm">Platinum Tier</p>
              <p className="text-zinc-500 text-xs font-sans">Top 5% this month</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between glass sticky top-0 z-30">
          <div className="lg:hidden flex items-center gap-2">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center" />
             <span className="font-bold text-zinc-100 tracking-tight">Grind</span>
          </div>
          <div className="hidden md:flex flex-1 max-w-md ml-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search challenges, visionaries..." 
                className="w-full bg-white/5 border border-white/5 rounded-full px-12 py-2 text-sm text-zinc-300 focus:outline-none focus:border-brand-blue/30 transition-all font-sans"
              />
              <svg className="absolute left-4 top-2.5 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/5 text-zinc-400">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/5">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-zinc-100">{user.name}</p>
                <p className="text-[10px] text-zinc-500 font-sans">{user.email}</p>
              </div>
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-brand-blue/30 shadow-lg shadow-brand-blue/10">
                <img 
                  src={user.image} 
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 space-y-8 overflow-y-auto">
          {/* Welcome Greeting */}
          <div>
            <h2 className="text-3xl font-black text-zinc-100 mb-2">Command Center</h2>
            <p className="text-zinc-500 font-sans">Ready to dominate your goals today, {user.name.split(' ')[0]}?</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard label="Deep Work Time" value="4h 32m" trend="+12%" color="blue" />
            <StatsCard label="Community Karma" value="1,240 XP" trend="+450" color="purple" />
            <StatsCard label="Active Streaks" value="14 Days" trend="Peak" color="neon" />
            <StatsCard label="Ranking Score" value="Top 5%" trend="+2.4%" color="blue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass rounded-[32px] p-8 border-white/5">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold text-zinc-100">Focus Progress</h3>
                  <button className="text-xs text-brand-blue font-bold uppercase tracking-wider">Configure Goals</button>
                </div>
                <div className="h-64 flex items-end gap-2 px-2">
                   {[40, 70, 45, 90, 65, 80, 55].map((h, i) => (
                     <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                        <div className="w-full bg-brand-blue/20 rounded-t-xl transition-all group-hover:bg-brand-blue/40 relative" style={{ height: `${h}%` }}>
                          <div className={`absolute top-0 w-full h-1 bg-brand-blue ${h > 75 ? 'neon-glow-blue' : ''}`} />
                        </div>
                        <span className="text-[10px] text-zinc-600 font-sans">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold text-zinc-100 px-2">Community Activity</h3>
                <ActivityCard user="Emily Chen" action="started a 'No Distractions' sprint" time="2m ago" />
                <ActivityCard user="Marcus J." action="reached level 40 in Backend Mastery" time="15m ago" />
                <ActivityCard user="Sarah Blake" action="contributed to the Global Leaderboard" time="1h ago" />
              </div>
            </div>

            {/* Sidebar Cards */}
            <div className="space-y-6">
              <div className="p-1 rounded-[32px] bg-gradient-to-tr from-brand-blue to-brand-purple">
                <div className="bg-black rounded-[31px] p-6">
                  <h3 className="text-lg font-bold text-zinc-100 mb-4">Start Quick Grind</h3>
                  <p className="text-zinc-500 text-sm mb-6 font-sans">Instant 50min focus session with the community.</p>
                  <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-brand-blue/20">
                    Jump In
                  </button>
                </div>
              </div>

              <div className="glass rounded-[32px] p-6 border-white/5">
                <h3 className="text-lg font-bold text-zinc-100 mb-4">Trending Visionaries</h3>
                <div className="space-y-4">
                  <UserMiniCard name="Alex Rivera" role="Founder @ Apex" />
                  <UserMiniCard name="Sofia Gao" role="Senior Architect" />
                  <UserMiniCard name="Leo Knight" role="Product Designer" />
                </div>
                <button className="w-full mt-6 py-3 rounded-xl border border-white/10 text-white text-sm font-medium hover:bg-white/5 transition-all font-sans">
                  Browse All
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href="#" className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${active ? 'bg-brand-blue/10 text-brand-blue' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
      {icon}
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}

function StatsCard({ label, value, trend, color }: { label: string, value: string, trend: string, color: 'blue' | 'purple' | 'neon' }) {
  const colorMap = {
    blue: 'text-brand-blue bg-brand-blue/10',
    purple: 'text-brand-purple bg-brand-purple/10',
    neon: 'text-brand-neon bg-brand-neon/10'
  };

  return (
    <div className="glass p-6 rounded-[28px] border-white/5">
      <p className="text-xs text-zinc-500 font-medium font-sans mb-3">{label}</p>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-black text-zinc-100">{value}</h4>
        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${colorMap[color]}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function ActivityCard({ user, action, time }: { user: string, action: string, time: string }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all">
      <div className="w-10 h-10 rounded-full bg-zinc-800" />
      <div className="flex-1">
        <p className="text-sm text-zinc-100 font-medium">
          <span className="font-bold">{user}</span> {action}
        </p>
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">{time}</p>
      </div>
      <button className="text-zinc-500 hover:text-white">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
      </button>
    </div>
  );
}

function UserMiniCard({ name, role }: { name: string, role: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-zinc-800" />
      <div>
        <p className="text-[13px] font-bold text-white">{name}</p>
        <p className="text-[10px] text-zinc-500 font-sans">{role}</p>
      </div>
    </div>
  );
}

// Icons
function DashboardIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> }
function ChallengesIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> }
function NetworkIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> }
function StatsIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> }
function SettingsIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }
