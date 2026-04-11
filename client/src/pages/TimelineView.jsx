/**
 * TimelineView Page - Main page for timeline visualization
 */

import { useState } from 'react';
import Timeline from '../components/Timeline';
import EraDetail from '../components/EraDetail';
import { useTimeline } from '../hooks/useTimeline';
import './TimelineView.css';

/**
 * TimelineView page component
 */
export default function TimelineView() {
  const [steamId, setSteamId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedEraId, setSelectedEraId] = useState(null);

  const { timeline, loading, error, getTimeline, refetch } = useTimeline(steamId);

  /**
   * Handle search submission
   */
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      alert('Please enter a Steam ID');
      return;
    }

    setSteamId(inputValue.trim());
    setSelectedEraId(null);
  };

  /**
   * Get selected era object
   */
  const selectedEra = timeline?.eras?.find((era) => era.eraId === selectedEraId) || null;

  return (
    <div className="timeline-view">
      {/* Header */}
      <div className="view-header">
        <h1>🎮 Steam Gaming Timeline</h1>
        <p className="view-subtitle">
          Discover your gaming journey through time
        </p>
      </div>

      {/* Search section */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your Steam ID (or custom URL ID)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="steam-id-input"
              disabled={loading}
            />
            <button
              type="submit"
              className="search-button"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'View Timeline'}
            </button>
          </div>
          {steamId && (
            <button
              type="button"
              className="refresh-button"
              onClick={refetch}
              disabled={loading}
            >
              Refresh
            </button>
          )}
        </form>

        {/* Example hint */}
        <p className="search-hint">
          💡 Find your Steam ID: Visit your Steam profile, and copy the number from the URL
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your gaming timeline...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="error-state">
          <p className="error-message">❌ {error}</p>
          {error.includes('Firebase') && (
            <p className="error-hint">
              Make sure your backend server is running on http://localhost:5000
            </p>
          )}
        </div>
      )}

      {/* Timeline display */}
      {timeline && !loading && !error && (
        <div className="timeline-section">
          {/* Summary stats */}
          {timeline.timeline && (
            <div className="timeline-summary">
              <h3>Your Gaming Summary</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="label">Total Hours</span>
                  <span className="value">
                    {timeline.timeline.stats.totalHours.toFixed(0)}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="label">Games Played</span>
                  <span className="value">
                    {timeline.timeline.stats.totalGames}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="label">Gaming Eras</span>
                  <span className="value">{timeline.timeline.eraCount}</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline component */}
          <Timeline
            eras={timeline.eras || []}
            selectedEraId={selectedEraId}
            onEraSelect={setSelectedEraId}
          />
        </div>
      )}

      {/* Default empty state */}
      {!timeline && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">🕐</div>
          <h3>Your timeline awaits</h3>
          <p>Enter your Steam ID above to visualize your gaming history</p>
        </div>
      )}

      {/* Era detail modal */}
      <EraDetail era={selectedEra} onClose={() => setSelectedEraId(null)} />
    </div>
  );
}
