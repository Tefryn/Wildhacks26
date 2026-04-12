/**
 * TimelineView Page - Main page for timeline visualization with enhanced hachathon UI
 */

import { useEffect, useState } from "react";
import Timeline from "../components/Timeline";
import EraDetail from "../components/EraDetail";
import GamingInsights from "../components/GamingInsights";
import TopGamesChart from "../components/TopGamesChart";
import SteamAuthCard from "../components/SteamAuthCard";
import { useSteamAuth } from "../hooks/useSteamAuth";
import { useTimeline } from "../hooks/useTimeline";
import "./TimelineView.css";

const AI_ENDPOINT_URL = "https://getairesponse-e4wyzyxcia-uc.a.run.app"

/**
 * TimelineView page component
 */
export default function TimelineView() {
  const {
    steamId: authedSteamId,
    signOut,
    isSignedIn,
  } = useSteamAuth();
  const [manualSteamId, setManualSteamId] = useState("");
  const [selectedEraId, setSelectedEraId] = useState(null);
  const [aiResponses, setAiResponses] = useState({}); // Store AI responses by eraId

  const activeSteamId = authedSteamId || manualSteamId;

  const { timeline, loading, error, refetch } = useTimeline(activeSteamId);

  useEffect(() => {
    if (authedSteamId) {
      setManualSteamId("");
    }
  }, [authedSteamId]);

  /**
   * Handle era selection with AI response caching
   */
  const handleEraSelect = async (eraId) => {
    setSelectedEraId(eraId);

    // Check if we already have an AI response for this era
    if (aiResponses[eraId]) {
      return;
    }

    // Find the selected era
    const era = timeline?.eras?.find((e) => e.eraId === eraId);
    if (!era) return;

    try {
      // Call getAIResponse with era information
      const response = await fetch(AI_ENDPOINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eraId: era.eraId,
          eraName: era.eraName,
          games: era.games,
          achievements: era.achievements,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Store the AI response locally
      setAiResponses((prev) => ({
        ...prev,
        [eraId]: data,
      }));
    } catch (err) {
      console.error("Error fetching AI response for era:", err);
    }
  };

  /**
   * Handle search submission
   */
  const handleSearch = async (e) => {
    e.preventDefault();

    if (!manualSteamId.trim()) {
      alert("Please enter a Steam ID");
      return;
    }

    setManualSteamId(manualSteamId.trim());
    setSelectedEraId(null);
  };

  /**
   * Get selected era object
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

      <SteamAuthCard onConnect={() => setSelectedEraId(null)} />

      {/* Search section */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-label-row">
            <span className="search-label">Manual fallback</span>
            {isSignedIn && (
              <button type="button" className="inline-link-button" onClick={signOut}>
                Disconnect Steam
              </button>
            )}
          </div>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your Steam ID (or custom URL ID)"
              value={manualSteamId}
              onChange={(e) => setManualSteamId(e.target.value)}
              className="steam-id-input"
              disabled={loading}
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? "Loading..." : "View Timeline"}
            </button>
          </div>
          {activeSteamId && (
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
          Prefer Steam sign-in above. If you need to paste it manually, use the
          17-digit SteamID64 from your profile URL.
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
              onEraSelect={handleEraSelect}
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
