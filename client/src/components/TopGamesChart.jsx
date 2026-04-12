/**
 * TopGamesChart Component - Visual comparison of top games
 */

import './TopGamesChart.css';

/**
 * TopGamesChart component - Shows top games with visual bars and stats
 */
export default function TopGamesChart({ games = [] }) {
  if (!games || games.length === 0) {
    return null;
  }

  // Get top 10 games by playtime
  const topGames = [...games]
    .sort((a, b) => b.playtimeHours - a.playtimeHours)
    .slice(0, 10);

  const maxHours = topGames[0]?.playtimeHours || 1;

  // Determine badge based on completion
  const getCompletionBadge = (rate) => {
    if (rate === 1) return '🏅';
    if (rate >= 0.9) return '⭐';
    if (rate >= 0.7) return '🎯';
    if (rate >= 0.5) return '👍';
    return '📌';
  };

  return (
    <div className="top-games-chart">
      <div className="chart-header">
        <h3>🎮 Your Most Played Games</h3>
        <p className="chart-subtitle">
          Top {topGames.length} games by playtime with achievement completion
        </p>
      </div>

      <div className="games-chart">
        {topGames.map((game, index) => {
          const percentage = (game.playtimeHours / maxHours) * 100;
          const completionPercent = Math.round(game.achievementCompletionRate * 100);

          return (
            <div key={game.appId} className="chart-row">
              {/* Rank badge */}
              <div className="rank-badge">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && <span className="rank-number">{index + 1}</span>}
              </div>

              {/* Game info */}
              <div className="game-info">
                <h4 className="game-name">{game.name}</h4>
                <div className="game-stats">
                  <span className="playtime">{game.playtimeHours.toFixed(0)}h</span>
                  <span className="separator">•</span>
                  <span className="completion">
                    {getCompletionBadge(game.achievementCompletionRate)} {completionPercent}%
                  </span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="bar-container">
                <div
                  className="bar-fill"
                  style={{
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, hsl(${270 - index * 15}, 70%, 60%), hsl(${290 - index * 15}, 70%, 50%))`,
                  }}
                >
                  <span className="bar-label">{game.playtimeHours.toFixed(0)}h</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-badge">🏅</span>
          <span>100% Complete</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">⭐</span>
          <span>90%+ Complete</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">🎯</span>
          <span>70%+ Complete</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge">👍</span>
          <span>50%+ Complete</span>
        </div>
      </div>
    </div>
  );
}
