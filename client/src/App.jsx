import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { SocketProvider } from './context/SocketProvider';
import { LandingPage } from './pages/LandingPage';
import { GameListingPage } from './pages/GameListingPage';
import { MatchFindingPage } from './pages/MatchFindingPage';
import { GamePage } from './pages/GamePage';
import { Globe } from 'lucide-react';

function NavigationBar() {
  const location = useLocation();
  // Don't show global nav inside the actual game wrapper layout to save space
  if (location.pathname === '/play') return null;

  return (
    <header className="w-full max-w-7xl mx-auto flex justify-between items-center py-6 px-6 border-b border-slate-800/60 relative z-50">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 transition-all duration-300">
          <Globe className="text-white w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-sm flex items-baseline">
          ostl<span className="text-indigo-400">.</span>
        </h1>
      </Link>
      
      <div className="hidden sm:flex items-center gap-8 text-sm font-semibold text-slate-400">
         <Link to="/games" className="hover:text-indigo-400 transition-colors">Games</Link>
         <Link to="/" className="hover:text-indigo-400 transition-colors">Architecture</Link>
         <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> 
            System Norm
         </div>
      </div>
    </header>
  );
}

function MainApp() {
  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30">
      {/* Dynamic ambient background globs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>

      <NavigationBar />
      
      <main className="flex-1 w-full flex flex-col z-10">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/games" element={<GameListingPage />} />
          <Route path="/matchmaking" element={<MatchFindingPage />} />
          <Route path="/play" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <MainApp />
      </Router>
    </SocketProvider>
  );
}

export default App;
