/**
 * EraCard Component - Individual era card in the timeline
 */

import "./EraCard.css";

/**
 * EraCard component
 * @param {Object} props - Component props
 * @param {Object} props.era - Era object with data
 * @param {boolean} props.isSelected - Whether this era is selected
 * @param {boolean} props.isHovered - Whether this era is hovered
 * @param {Function} props.onClick - Click handler
 */
export default function EraCard({ era, isSelected, isHovered, onClick }) {
  const { name, year, season, stats, dominantGenres, topGames, dateRange } =
    era;

  return (
    <div
      className={`era-card ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
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
          <span className="stat-number">{stats.totalHours.toFixed(0)}</span>
          <span className="stat-label">hours</span>
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
      {topGames.length > 0 && (
        <div className="top-games">
          <p className="top-games-label">Top Game</p>
          <p className="top-game-name">{topGames[0].name}</p>
          <p className="top-game-hours">
            {topGames[0].playtimeHours.toFixed(0)}h
          </p>
        </div>
      )}

      {/* Hover hint */}
      {!isSelected && <div className="era-hint">Click to view details</div>}
    </div>
  );
}
