import { useState, useEffect } from "react";
import { apiBase } from "../lib/api";

export function useMetrics() {
  const [games, setGames] = useState<any[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalActiveNow, setTotalActiveNow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true; // Prevents state updates if the component unmounts

    async function fetchData() {
      try {
        const [gamesRes, debugRes] = await Promise.all([
          fetch(`${apiBase}/api/games`).then((res) => {
            if (!res.ok) throw new Error(`Games API returned ${res.status}`);
            return res.json();
          }),
          fetch(`${apiBase}/api/debug`).then((res) => {
            if (!res.ok) throw new Error(`Debug API returned ${res.status}`);
            return res.json();
          }),
        ]);

        if (!mounted) return;

        const debugData: any = debugRes;
        const totalRegistered = debugData.players?.length || 0;

        let allActiveNow = 0;

        const mappedGames = (gamesRes.games || []).map((g: any) => {
          let gameActiveUsers = 0;

          // 1. Count players waiting in the matchmaking queue
          // Check both slug and ID in case different parts of the UI emit different identifiers
          if (debugData.queues) {
            const queueData =
              debugData.queues[g.slug] || debugData.queues[g.id];
            if (queueData) {
              gameActiveUsers += queueData.length;
            }
          }

          // 2. Count players currently in active game rooms
          // CRITICAL FIX: The backend room object uses `gameId`, not `gameSlug`
          if (Array.isArray(debugData.rooms)) {
            debugData.rooms.forEach((room: any) => {
              if (room.gameId === g.slug || room.gameId === g.id) {
                gameActiveUsers += room.players ? room.players.length : 2;
              }
            });
          }

          allActiveNow += gameActiveUsers;

          return {
            id: g.id,
            slug: g.slug,
            name: g.title,
            description: g.description,
            image:
              g.thumbnail_url ||
              "https://images.unsplash.com/photo-1612385763901-68857dd4c43c?q=80&w=1080",
            totalPlays: g.total_plays || 0,
            activePlayers: gameActiveUsers,
            status: "active",
            playUrl: g.play_url,
          };
        });

        setGames(mappedGames);
        setTotalPlayers(totalRegistered || 1500);
        setTotalActiveNow(allActiveNow);
      } catch (err) {
        console.error("Failed to fetch metrics", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();

    // Poll the backend every 10 seconds for live updates
    const intval = setInterval(fetchData, 10000);

    return () => {
      mounted = false;
      clearInterval(intval);
    };
  }, []);

  return { games, totalPlayers, totalActiveNow, loading };
}
