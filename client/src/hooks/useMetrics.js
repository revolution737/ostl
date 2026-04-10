import { useState, useEffect } from "react";

export function useMetrics() {
  const [games, setGames] = useState([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [totalActiveNow, setTotalActiveNow] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [gamesRes, debugRes] = await Promise.all([
          fetch("/api/games").then((res) => res.json()),
          fetch("/api/debug").then((res) => res.json()),
        ]);

        const debugData = debugRes;
        const totalRegistered = debugData.players?.length || 0;
        
        let allActiveNow = 0;

        const mappedGames = (gamesRes.games || []).map((g) => {
          let gameActiveUsers = 0;
          if (debugData.queues && debugData.queues[g.slug]) {
            gameActiveUsers += debugData.queues[g.slug].length;
          }
          if (debugData.rooms) {
            Object.values(debugData.rooms).forEach((room) => {
              if (room.gameSlug === g.slug) {
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
            image: g.thumbnail_url || "https://images.unsplash.com/photo-1612385763901-68857dd4c43c?q=80&w=1080",
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
        setLoading(false);
      }
    }

    fetchData();
    const intval = setInterval(fetchData, 10000);
    return () => clearInterval(intval);
  }, []);

  return { games, totalPlayers, totalActiveNow, loading };
}
