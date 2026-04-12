/**
 * Timeline Component - Modern wave-pattern timeline for gaming events
 */

import { useState } from "react";
import EraCard from "./EraCard";
import "./Timeline.css";

/**
 * Timeline component with modern wave-pattern design
 * @param {Object} props - Component props
 * @param {Array} props.eras - Array of era objects in chronological order
 * @param {Function} props.onEraSelect - Callback when era is selected
 * @param {string} props.selectedEraId - Currently selected era ID
 */
export default function Timeline({ eras = [], onEraSelect, selectedEraId }) {
  const [hoveredEra, setHoveredEra] = useState(null);

  if (!eras || eras.length === 0) {
    return (
      <div className="timeline-empty">
        <div className="empty-icon">~</div>
        <p>No gaming events found. Try a different Steam ID.</p>
      </div>
    );
  }

  const totalHours = eras.reduce((sum, era) => sum + era.stats.totalHours, 0);
  const totalGames = new Set(
    eras.flatMap((era) => era.games.map((g) => g.appId)),
  ).size;
  const totalAchievements = eras.reduce(
    (sum, era) => sum + era.stats.achievementCount,
    0,
  );

  // Generate wavy path that connects all nodes
  const generateWavyPath = (count) => {
    if (count === 0) return "";

    const spacing = 1200 / (count + 1);
    let pathData = `M 500 0`;

    for (let i = 1; i <= count; i++) {
      const y = spacing * i;
      const isEven = i % 2 === 0;
      const controlX = isEven ? 300 : 700; // Alternate left and right wave

      // Quadratic bezier curve to create wave effect
      pathData += ` Q ${controlX} ${y - spacing / 2}, 500 ${y}`;
    }

    return pathData;
  };

  return (
    <div className="timeline-container">
      {/* Modern header */}
      <div className="timeline-header">
        <div className="header-content">
          <h2 className="timeline-title">Steam Dex Journey</h2>
          <p className="timeline-subtitle">
            A chronological series of gaming events from {eras[0]?.year} to{" "}
            {eras[eras.length - 1]?.year}
          </p>
        </div>
      </div>

      {/* Timeline statistics */}
      <div className="timeline-footer">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">Total Hours Played</div>
              <div className="stat-value">{totalHours.toFixed(0)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-content">
              <div className="stat-label">Unique Games</div>
              <div className="stat-value">{totalGames}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-label">Achievements</div>
              <div className="stat-value">{totalAchievements}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-label">Gaming Eras</div>
              <div className="stat-value">{eras.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main timeline section */}
      <div className="timeline-main">
        {/* SVG Wave line - connects all events */}
        <svg
          className="timeline-wave-svg"
          preserveAspectRatio="none"
          viewBox="0 0 1000 1200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor="rgb(99, 102, 241)"
                stopOpacity="0.4"
              />
              <stop
                offset="50%"
                stopColor="rgb(168, 85, 247)"
                stopOpacity="0.6"
              />
              <stop
                offset="100%"
                stopColor="rgb(59, 130, 246)"
                stopOpacity="0.4"
              />
            </linearGradient>
          </defs>
          <path
            d={generateWavyPath(eras.length)}
            fill="none"
            stroke="url(#waveGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Timeline events */}
        <div className="timeline-events">
          {eras.map((era, index) => {
            const isLeft = index % 2 === 0;
            const isSelected = selectedEraId === era.eraId;
            const isHovered = hoveredEra === era.eraId;

            return (
              <div
                key={era.eraId}
                className={`timeline-event ${isLeft ? "event-left" : "event-right"}`}
                onMouseEnter={() => setHoveredEra(era.eraId)}
                onMouseLeave={() => setHoveredEra(null)}
              >
                {/* Node/Dot */}
                <div
                  className={`event-node ${isSelected ? "selected" : ""} ${isHovered ? "hovered" : ""}`}
                  onClick={() => onEraSelect?.(era.eraId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      onEraSelect?.(era.eraId);
                    }
                  }}
                  aria-label={`${era.name} - ${era.stats.gameCount} games, ${era.stats.totalHours.toFixed(0)} hours`}
                >
                  <div className="node-core"></div>
                  <div className="node-pulse"></div>
                </div>

                {/* Era card */}
                <div className="event-card-wrapper">
                  <EraCard
                    era={era}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    onClick={() => onEraSelect?.(era.eraId)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
