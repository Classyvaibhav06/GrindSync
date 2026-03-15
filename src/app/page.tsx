import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="text-xl font-bold tracking-tighter text-zinc-100">Social Grind</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="#features" className="hover:text-zinc-100 transition-colors">Features</Link>
          <Link href="#" className="hover:text-zinc-100 transition-colors">Community</Link>
          <Link href="#" className="hover:text-zinc-100 transition-colors">Pricing</Link>
        </div>
        <Link 
          href="/login" 
          className="px-6 py-2 rounded-full bg-zinc-100 text-black text-sm font-bold hover:bg-zinc-300 transition-all font-sans"
        >
          Login
        </Link>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden">
          {/* Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-blue/10 blur-[120px] rounded-full -z-10" />
          <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-brand-purple/10 blur-[120px] rounded-full -z-10" />
          
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
              Grind Smarter, <br />
              <span className="text-gradient">Together.</span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed font-sans">
              The elite social network where high achievers turn productivity into power. 
              Gamify your workflow, connect with visionaries, and climb the global ranks.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple text-white font-bold text-lg hover:scale-105 transition-transform neon-glow-blue"
              >
                Get Started
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 rounded-full glass text-white font-bold text-lg hover:bg-white/5 transition-all">
                View Live Demo
              </button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Master Your Workflow</h2>
              <p className="text-zinc-500 font-sans">Everything you need to turn your grind into a profession.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="p-8 rounded-3xl glass hover:border-brand-blue/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-6 group-hover:neon-glow-blue transition-all">
                  <svg className="w-6 h-6 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-100">Gamified Workflow</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-sans">
                  Earn XP for every deep work session. Unlock achievements and level up your professional profile.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-8 rounded-3xl glass hover:border-brand-purple/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-brand-purple/10 flex items-center justify-center mb-6 group-hover:neon-glow-purple transition-all">
                  <svg className="w-6 h-6 text-brand-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-100">Elite Networking</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-sans">
                  Connect with pre-vetted founders, developers, and creators in a high-signal environment.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-8 rounded-3xl glass hover:border-brand-neon/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-brand-neon/10 flex items-center justify-center mb-6 transition-all">
                  <svg className="w-6 h-6 text-brand-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-zinc-100">Deep Analytics</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-sans">
                  Visualize your productivity trends with neural-style data charts and peak-performance tracking.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-20 border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-brand-blue to-brand-purple" />
            <span className="font-bold text-white">Social Grind</span>
          </div>
          <p className="text-zinc-600 text-sm font-sans">© 2026 Social Grind. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Discord</Link>
            <Link href="#" className="text-zinc-500 hover:text-white transition-colors">Github</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
