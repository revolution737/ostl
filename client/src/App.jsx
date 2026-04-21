import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketProvider';
import { LandingPage } from './pages/LandingPage';
import { DeveloperAuthPage } from './pages/DeveloperAuthPage';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { DeveloperUploadPage } from './pages/DeveloperUploadPage';
import { MatchFindingPage } from './pages/MatchFindingPage';
import { GamePage } from './pages/GamePage';
import { ThemeProvider } from 'next-themes';

import { DeveloperAnalyticsPage } from './pages/DeveloperAnalyticsPage';

function MainApp() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Instant crash recovery router: If a valid match exists in local storage, route to it natively instantly.
  useEffect(() => {
    const savedState = localStorage.getItem('ostl_match_state');
    
    if (savedState && window.location.pathname !== '/play') {
      try {
        navigate('/play', { state: JSON.parse(savedState), replace: true });
      } catch (e) { localStorage.removeItem('ostl_match_state'); }
    }
  }, [navigate]);

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30">
      <main className="flex-1 w-full flex flex-col z-10 bg-white dark:bg-black">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/developers" element={<DeveloperAuthPage />} />
          <Route path="/developers/dashboard" element={<DeveloperDashboard />} />
          <Route path="/developers/upload" element={<DeveloperUploadPage />} />
          <Route path="/developers/analytics/:gameId" element={<DeveloperAnalyticsPage />} />
          <Route path="/matchmaking/:gameId" element={<MatchFindingPage />} />
          <Route path="/play" element={<GamePage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SocketProvider>
        <Router>
          <MainApp />
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;
