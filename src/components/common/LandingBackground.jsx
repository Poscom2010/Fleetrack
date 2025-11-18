/**
 * Shared animated background component for Landing and Login pages
 */
const LandingBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid Floor */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_2px,transparent_2px),linear-gradient(90deg,rgba(14,165,233,0.05)_2px,transparent_2px)] bg-[size:80px_80px] opacity-40" style={{ perspective: '1000px', transform: 'rotateX(60deg) translateY(20%)' }}></div>
      
      {/* Glowing Dashboard Elements */}
      <div className="absolute top-1/2 right-1/4 w-96 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl blur-2xl animate-pulse"></div>
      
      {/* Floating Data Visualization */}
      <div className="absolute bottom-20 right-20 w-64 h-48 border border-cyan-500/30 rounded-2xl bg-slate-900/30 backdrop-blur-sm p-4 animate-float">
        <div className="space-y-2">
          <div className="h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full w-3/4"></div>
          <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full w-1/2"></div>
          <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-2/3"></div>
        </div>
        <div className="mt-4 flex gap-2">
          <div className="flex-1 h-16 bg-gradient-to-t from-cyan-500/50 to-transparent rounded"></div>
          <div className="flex-1 h-20 bg-gradient-to-t from-blue-500/50 to-transparent rounded"></div>
          <div className="flex-1 h-12 bg-gradient-to-t from-purple-500/50 to-transparent rounded"></div>
        </div>
      </div>

      {/* Circular Chart */}
      <div className="absolute bottom-32 left-1/3 w-32 h-32 animate-float-delayed">
        <div className="relative w-full h-full">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="56" fill="none" stroke="rgba(14,165,233,0.2)" strokeWidth="8"/>
            <circle cx="64" cy="64" r="56" fill="none" stroke="url(#gradient)" strokeWidth="8" strokeDasharray="352" strokeDashoffset="88" className="animate-spin-slow"/>
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4"/>
                <stop offset="100%" stopColor="#3b82f6"/>
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-bold text-xl">75%</div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-cyan-400 rounded-full animate-ping"></div>
      <div className="absolute top-40 right-20 w-2 h-2 bg-blue-400 rounded-full animate-ping delay-500"></div>
      <div className="absolute bottom-40 left-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-1000"></div>
      
      {/* World Map Silhouette */}
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 opacity-10">
        <svg viewBox="0 0 800 400" className="w-full h-full">
          <path d="M100,200 Q200,150 300,200 T500,200 Q600,250 700,200" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500"/>
          <circle cx="150" cy="180" r="3" fill="currentColor" className="text-cyan-400 animate-pulse"/>
          <circle cx="350" cy="210" r="3" fill="currentColor" className="text-blue-400 animate-pulse delay-500"/>
          <circle cx="550" cy="190" r="3" fill="currentColor" className="text-purple-400 animate-pulse delay-1000"/>
        </svg>
      </div>
    </div>
  );
};

export default LandingBackground;
