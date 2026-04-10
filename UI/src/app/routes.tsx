import { createBrowserRouter } from "react-router";
import { LandingPage } from "./pages/LandingPage";
import { MatchmakingPage } from "./pages/MatchmakingPage";
import { GamePage } from "./pages/GamePage";
import { DeveloperAuthPage } from "./pages/DeveloperAuthPage";
import { DeveloperDashboard } from "./pages/DeveloperDashboard";
import { UploadGamePage } from "./pages/UploadGamePage";
import { GameAnalyticsPage } from "./pages/GameAnalyticsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: LandingPage,
  },
  {
    path: "/matchmaking/:gameId",
    Component: MatchmakingPage,
  },
  {
    path: "/game/:gameId",
    Component: GamePage,
  },
  {
    path: "/developers",
    Component: DeveloperAuthPage,
  },
  {
    path: "/developers/dashboard",
    Component: DeveloperDashboard,
  },
  {
    path: "/developers/upload",
    Component: UploadGamePage,
  },
  {
    path: "/developers/analytics/:gameId",
    Component: GameAnalyticsPage,
  },
]);
