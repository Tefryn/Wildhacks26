/**
 * TimelineView Page - Main page for timeline visualization with enhanced hachathon UI
 */

import { useEffect, useState } from "react";
import Timeline from "../components/Timeline";
import EraDetail from "../components/EraDetail";
import GamingInsights from "../components/GamingInsights";
import TopGamesChart from "../components/TopGamesChart";
import { useSteamAuth } from "../hooks/useSteamAuth";
import { useTimeline } from "../hooks/useTimeline";
import "./TimelineView.css";

const MANUAL_STEAM_ID_KEY = "manualSteamId";

const readStoredManualSteamId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(MANUAL_STEAM_ID_KEY) || "";
};

/**
 * TimelineView page component
 */
export default function TimelineView() {
  const {
    steamId: authedSteamId,
  } = useSteamAuth();
  const [manualSteamId, setManualSteamId] = useState(() => readStoredManualSteamId());
  const [selectedEraId, setSelectedEraId] = useState(null);

  const activeSteamId = authedSteamId || manualSteamId;

  const { timeline, loading, error } = useTimeline(activeSteamId);

  useEffect(() => {
    if (authedSteamId) {
      setManualSteamId("");
    }
  }, [authedSteamId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleManualSteamIdChanged = () => {
      setManualSteamId(readStoredManualSteamId());
    };

    window.addEventListener("manual-steam-id-changed", handleManualSteamIdChanged);

    return () => {
      window.removeEventListener("manual-steam-id-changed", handleManualSteamIdChanged);
    };
  }, []);

  /**
   * Handle search submission
   */
  const selectedEra =
    timeline?.eras?.find((era) => era.eraId === selectedEraId) || null;

  return (
    <div className="timeline-view">
      {/* Header */}
      <div className="view-header">
        <h1>Steam Gaming Timeline</h1>
        <p className="view-subtitle">
          Discover your gaming journey through time
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
          {error.includes("Firebase") && (
            <p className="error-hint">
              Make sure your backend server is running on http://localhost:5000
            </p>
          )}
        </div>
      )}

      {/* Timeline display */}
      {timeline && !loading && !error && (
        <div className="timeline-section">
          {/* Gaming Insights - Player Profile & Achievements */}
          <GamingInsights
            timeline={timeline.timeline}
            eras={timeline.eras || []}
          />

          {/* Top Games Chart */}
          {timeline.eras?.[0]?.games && (
            <TopGamesChart games={timeline.eras[0].games} />
          )}

          {/* Timeline visualization */}
          <div className="timeline-wrapper">
            <h3 className="timeline-title">📅 Your Gaming Timeline</h3>
            <Timeline
              eras={timeline.eras || []}
              selectedEraId={selectedEraId}
              onEraSelect={setSelectedEraId}
            />
          </div>
        </div>
      )}

      {/* Default empty state */}
      {!timeline && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">⌁</div>
          <h3>Your timeline awaits</h3>
          <p>Sign in with Steam or enter a Steam ID above to visualize your gaming history</p>
        </div>
      )}

      {/* Era detail modal */}
      <EraDetail era={selectedEra} onClose={() => setSelectedEraId(null)} />
    </div>
  );
}
