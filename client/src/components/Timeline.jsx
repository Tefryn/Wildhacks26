/**
 * Timeline Component - Displays game eras in a timeline view
 */

import { useState } from 'react';
import EraCard from './EraCard';
import './Timeline.css';

/**
 * Timeline component that displays eras horizontally
 * @param {Object} props - Component props
 * @param {Array} props.eras - Array of era objects
 * @param {Function} props.onEraSelect - Callback when era is selected
 * @param {string} props.selectedEraId - Currently selected era ID
 */
export default function Timeline({ eras = [], onEraSelect, selectedEraId }) {
  const [hoveredEra, setHoveredEra] = useState(null);

  if (!eras || eras.length === 0) {
    return (
      <div className="timeline-empty">
        <p>No eras found. Try a different Steam ID.</p>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2>Your Gaming Timeline</h2>
        <p className="timeline-subtitle">
          {eras.length} eras spanning {eras[0]?.year} to {eras[eras.length - 1]?.year}
        </p>
      </div>

      <div className="timeline-track">
        {/* Timeline line */}
        <div className="timeline-line"></div>

        {/* Era cards */}
        <div className="timeline-cards">
          {eras.map((era, index) => (
            <div
              key={era.eraId}
              className={`timeline-card-wrapper ${index % 2 === 0 ? 'above' : 'below'}`}
              onMouseEnter={() => setHoveredEra(era.eraId)}
              onMouseLeave={() => setHoveredEra(null)}
            >
              {/* Timeline dot */}
              <div
                className={`timeline-dot ${
                  selectedEraId === era.eraId ? 'selected' : ''
                } ${hoveredEra === era.eraId ? 'hovered' : ''}`}
                onClick={() => onEraSelect?.(era.eraId)}
              >
                <div className="dot-inner"></div>
              </div>

              {/* Era card */}
              <EraCard
                era={era}
                isSelected={selectedEraId === era.eraId}
                isHovered={hoveredEra === era.eraId}
                onClick={() => onEraSelect?.(era.eraId)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Timeline stats */}
      <div className="timeline-stats">
        <div className="stat-item">
          <span className="stat-label">Total Hours</span>
          <span className="stat-value">
            {eras.reduce((sum, era) => sum + era.stats.totalHours, 0).toFixed(0)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Games</span>
          <span className="stat-value">
            {eras.reduce((sum, era) => sum + era.stats.gameCount, 0)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Eras</span>
          <span className="stat-value">{eras.length}</span>
        </div>
      </div>
    </div>
  );
}
