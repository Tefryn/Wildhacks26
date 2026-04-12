/**
 * EraDetail Component - Detailed view of a selected era
 */

import { useState, useEffect } from "react";
import "./EraDetail.css";
import { getSimilarGames, getGameDetails } from "../api/timelineApi";

/**
 * EraDetail component
 * @param {Object} props - Component props
 * @param {Object} props.era - Era object with data
 * @param {Function} props.onClose - Close handler
 */
export default function EraDetail({ era, onClose }) {
  const [similarGames, setSimilarGames] = useState(null);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Declare all hooks before any conditional logic
  const {
    name,
    year,
    season,
    stats,
    dominantGenres,
    games,
    description,
    dateRange,
    topGameAppId,
  } = era || {};

  // Sort games by playtime
  const sortedGames = [...(games || [])].sort(
    (a, b) => b.playtimeHours - a.playtimeHours,
  );

  // Get top game appId (use provided topGameAppId or fallback to most played game)
  const topGameId =
    topGameAppId || (sortedGames.length > 0 ? sortedGames[0].appId : null);

  // Fetch similar games when era changes
  useEffect(() => {
    if (!topGameId) {
      setSimilarGames(null);
      return;
    }

    const fetchSimilar = async () => {
      setLoadingSimilar(true);
      const result = await getSimilarGames(topGameId);

      // API returns: {appid, similarGames: Array}
      // Each item: {appid, similarity}
      if (result && result.similarGames && Array.isArray(result.similarGames)) {
        // Take only top 3 recommendations
        const topThree = result.similarGames.slice(0, 3);

        // Fetch game names from backend for each appid
        const gamesWithNames = await Promise.all(
          topThree.map(async (game) => {
            try {
              const gameDetails = await getGameDetails(game.appid);
              const name = gameDetails?.name || `App ${game.appid}`;
              return {
                appid: game.appid,
                title: name,
                similarity: game.similarity,
                match_percentage: Math.round(game.similarity * 100),
              };
            } catch (error) {
              console.error(
                `Failed to fetch game name for ${game.appid}:`,
                error,
              );
              return {
                appid: game.appid,
                title: `App ${game.appid}`,
                similarity: game.similarity,
                match_percentage: Math.round(game.similarity * 100),
              };
            }
          }),
        );

        setSimilarGames(gamesWithNames);
      } else {
        setSimilarGames(null);
      }
      setLoadingSimilar(false);
    };

    fetchSimilar();
  }, [topGameId]);

  // Early return after all hooks are declared
  if (!era) {
    return null;
  }

  return (
    <div className="era-detail-overlay" onClick={onClose}>
      <div
        className="era-detail-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Year Backdrop */}
        <div className="year-backdrop">{year}</div>

        {/* Header */}
        <div className="detail-header">
          <div className="header-content">
            <h2 className="detail-title">{name}</h2>
            <p className="detail-subtitle">
              {dateRange.start} to {dateRange.end}
            </p>
          </div>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="detail-content">
          {/* Description */}
          {description && (
            <div className="detail-section description-section">
              <h3 className="section-title">Era Story</h3>
              <p className="era-story">{description}</p>
            </div>
          )}

          {/* Stats grid */}
          <div className="detail-section stats-section">
            <h3 className="section-title">Stats</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">
                  {stats.achievementCount || games.reduce((sum, game) => sum + (game.achievements?.length || 0), 0)}
                </span>
                <span className="stat-label">Total Achievements</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.gameCount}</span>
                <span className="stat-label">Games Played</span>
              </div>
            </div>
          </div>

          {/* Genres */}
          {dominantGenres.length > 0 && (
            <div className="detail-section genres-section">
              <h3 className="section-title">Dominant Genres</h3>
              <div className="genres-list">
                {dominantGenres.map((genre) => (
                  <div key={genre} className="genre-chip">
                    {genre}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Games list */}
          <div className="detail-section games-section">
            <h3 className="section-title">
              Achievements in This Era ({games.length})
            </h3>
            <div className="games-list">
              {sortedGames.map((game) => (
                <div key={game.appId} className="game-item">
                  <div className="game-info">
                    <h4 className="game-name">{game.name}</h4>
                    {game.genres && game.genres.length > 0 && (
                      <div className="game-genres">
                        {game.genres.slice(0, 2).map((g) => (
                          <span key={g} className="micro-genre">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="game-hours">
                    {game.achievements.length} 
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Similar Games section */}
          {topGameId && (
            <div className="detail-section similar-games-section">
              <h3 className="section-title">
                Similar Games to "{sortedGames[0]?.name || "Top Game"}"
              </h3>
              {loadingSimilar ? (
                <div className="similar-games-loading">
                  <p>Loading recommendations...</p>
                </div>
              ) : similarGames && similarGames.length > 0 ? (
                <div className="similar-games-list">
                  {similarGames.map((game, index) => (
                    <div
                      key={`${game.appid}-${index}`}
                      className="similar-game-item"
                    >
                      <div className="similar-game-rank">{index + 1}</div>
                      <div className="similar-game-info">
                        <h4 className="similar-game-name">
                          {game.title || game.name}
                        </h4>
                        {game.match_percentage && (
                          <p className="match-percentage">
                            {game.match_percentage}% match
                          </p>
                        )}
                      </div>
                      <a
                        href={`https://store.steampowered.com/app/${game.appid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="similar-game-link"
                      >
                        View on Steam →
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-similar-games">No similar games found</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
