import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { SocketProvider } from './context/SocketProvider';
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
