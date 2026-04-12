/**
 * useTimeline Hook - Custom hook for fetching and managing timeline data
 */

import { useState, useEffect } from "react";
import { fetchTimeline } from "../api/timelineApi";

/**
 * Custom hook to fetch and manage timeline data
 * @param {string} steamId - Steam ID to fetch (optional)
 * @param {Object} options - Hook options
 * @returns {Object} Hook state and methods
 */
export function useTimeline(steamId = null, options = {}) {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch timeline data
   */
  const getTimeline = async (id) => {
    if (!id) {
      setError("Steam ID is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchTimeline(id, options);
      setTimeline(data);
      return data;
    } catch (err) {
      const errorMessage = err.message || "Failed to fetch timeline";
      setError(errorMessage);
      console.error("Timeline fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refetch timeline data
   */
  const refetch = () => {
    if (steamId || timeline?.steamId) {
      return getTimeline(steamId || timeline.steamId);
    }
  };

  /**
   * Reset state
   */
  const reset = () => {
    setTimeline(null);
    setError(null);
    setLoading(false);
  };

  // Auto-fetch when steamId changes
  useEffect(() => {
    if (steamId) {
      getTimeline(steamId);
      return;
    }

    reset();
  }, [steamId]);

  return {
    timeline,
    loading,
    error,
    getTimeline,
    refetch,
    reset,
  };
}
