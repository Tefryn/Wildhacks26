/**
 * Timeline API - Frontend API calls for timeline data
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetches timeline data for a Steam user
 * @param {string} steamId - Steam ID of the user
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Timeline data with eras
 */
export async function fetchTimeline(steamId, options = {}) {
  const params = new URLSearchParams();
  params.append('steamId', steamId);

  if (options.maxGames) {
    params.append('maxGames', options.maxGames);
  }
  if (options.mergeEras) {
    params.append('mergeEras', options.mergeEras);
  }
  if (options.useCache !== undefined) {
    params.append('useCache', options.useCache);
  }

  const url = `${API_BASE_URL}/api/timeline?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch timeline:', error);
    throw error;
  }
}

/**
 * Fetches health status of timeline API
 * @returns {Promise<Object>} - Health status
 */
export async function checkTimelineHealth() {
  const url = `${API_BASE_URL}/api/timeline/health`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to check health:', error);
    throw error;
  }
}

/**
 * Clears the timeline cache (development)
 * @returns {Promise<Object>} - Cache clear result
 */
export async function clearTimelineCache() {
  const url = `${API_BASE_URL}/api/timeline/cache/clear`;

  try {
    const response = await fetch(url, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
}
