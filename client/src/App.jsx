import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketProvider';
import { LandingPage } from './pages/LandingPage';
import { DeveloperAuthPage } from './pages/DeveloperAuthPage';
import { DeveloperDashboard } from './pages/DeveloperDashboard';
import { DeveloperUploadPage } from './pages/DeveloperUploadPage';
import { GameListingPage } from './pages/GameListingPage';
import { MatchFindingPage } from './pages/MatchFindingPage';
import { GamePage } from './pages/GamePage';
import { ThemeProvider } from 'next-themes';

import { DeveloperAnalyticsPage } from './pages/DeveloperAnalyticsPage';

function MainApp() {
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Server emits 'rejoin' when it recognises our UUID within the 90s grace window.
  // Navigate back to /play so the game session can resume.
  useEffect(() => {
    if (!socket) return;

    const handleRejoin = ({ roomId }) => {
      const savedState = localStorage.getItem('ostl_match_state');
      if (savedState) {
        try {
          navigate('/play', { state: JSON.parse(savedState), replace: true });
        } catch (e) { localStorage.removeItem('ostl_match_state'); }
      }
    };

    socket.on('rejoin', handleRejoin);
    return () => socket.off('rejoin', handleRejoin);
  }, [socket, navigate]);

  return (
    <div className="w-full min-h-screen bg-slate-950 flex flex-col relative overflow-x-hidden selection:bg-indigo-500/30">
      <main className="flex-1 w-full flex flex-col z-10 bg-white dark:bg-black">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/developers" element={<DeveloperAuthPage />} />
          <Route path="/developers/dashboard" element={<DeveloperDashboard />} />
          <Route path="/developers/upload" element={<DeveloperUploadPage />} />
          <Route path="/developers/analytics/:gameId" element={<DeveloperAnalyticsPage />} />
          <Route path="/games" element={<GameListingPage />} />
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
