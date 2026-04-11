/**
 * EraDetail Component - Detailed view of a selected era
 */

import './EraDetail.css';

/**
 * EraDetail component
 * @param {Object} props - Component props
 * @param {Object} props.era - Era object with data
 * @param {Function} props.onClose - Close handler
 */
export default function EraDetail({ era, onClose }) {
  if (!era) {
    return null;
  }

  const { name, year, season, stats, dominantGenres, games, description, dateRange } = era;

  // Sort games by playtime
  const sortedGames = [...games].sort((a, b) => b.playtimeHours - a.playtimeHours);

  return (
    <div className="era-detail-overlay" onClick={onClose}>
      <div className="era-detail-container" onClick={(e) => e.stopPropagation()}>
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
                <span className="stat-value">{stats.totalHours.toFixed(0)}</span>
                <span className="stat-label">Total Hours</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.gameCount}</span>
                <span className="stat-label">Games Played</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{stats.averageHoursPerGame.toFixed(1)}</span>
                <span className="stat-label">Avg Hours/Game</span>
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
              Games in This Era ({games.length})
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
                    {game.playtimeHours.toFixed(0)}h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
