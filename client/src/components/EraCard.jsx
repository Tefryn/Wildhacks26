/**
 * EraCard Component - Individual era card in the timeline
 */

import './EraCard.css';

/**
 * EraCard component
 * @param {Object} props - Component props
 * @param {Object} props.era - Era object with data
 * @param {boolean} props.isSelected - Whether this era is selected
 * @param {boolean} props.isHovered - Whether this era is hovered
 * @param {Function} props.onClick - Click handler
 */
export default function EraCard({ era, isSelected, isHovered, onClick }) {
  const { name, year, season, stats, dominantGenres, topGames, dateRange } = era;
  const topGamePreview = (topGames || []).slice(0, 2);

  return (
    <div
      className={`era-card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={onClick}
    >
      {/* Era header */}
      <div className="era-header">
        <h3 className="era-name">{name}</h3>
        <span className="era-year">{year}</span>
      </div>

      {/* Date range */}
      <div className="era-date-range">
        <span className="date">{dateRange.start}</span>
        <span className="separator">→</span>
        <span className="date">{dateRange.end}</span>
      </div>

      {/* Stats */}
      <div className="era-stats">
        <div className="stat">
          <span className="stat-number">{stats.achievementCount ?? 0}</span>
          <span className="stat-label">achievements</span>
        </div>
        <div className="stat">
          <span className="stat-number">{stats.gameCount}</span>
          <span className="stat-label">games</span>
        </div>
      </div>

      {/* Genres */}
      {dominantGenres.length > 0 && (
        <div className="era-genres">
          {dominantGenres.map((genre) => (
            <span key={genre} className="genre-tag">
              {genre}
            </span>
          ))}
        </div>
      )}

      {/* Top games preview */}
      {topGamePreview.length > 0 && (
        <div className="era-achievement-preview">
          <p className="achievement-preview-label">Top Games</p>
          <div className="achievement-preview-list">
            {topGamePreview.map((game) => (
              <div key={game.appId} className="achievement-preview-item">
                <p className="achievement-preview-game">{game.name}</p>
                <p className="achievement-preview-count">
                  {game.achievements?.length || 0}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover hint */}
      {!isSelected && (
        <div className="era-hint">Click to view details</div>
      )}
    </div>
  );
}
