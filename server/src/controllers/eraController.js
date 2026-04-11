/**
 * Era Controller - Orchestrates fetching and processing game data into eras
 */

const axios = require('axios');
const { groupGamesByEra, mergeAdjacentSimilarEras } = require('../utils/gameGrouping');
const { formatEra, formatTimeline } = require('../utils/eraFormatter');

/**
 * Fetches user's game data from Cloud Function and computes eras
 * @param {string} steamId - Steam ID of the user
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - Timeline data with eras
 */
async function getTimeline(steamId, options = {}) {
  const {
    maxGames = 50,
    mergeEras = false,
    cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL || 'http://localhost:5001/wildhacks26/us-central1/getUserFeatureModel',
  } = options;

  try {
    // Step 1: Call Cloud Function to get user's game data
    console.log(`[TIMELINE] Fetching game data for Steam ID: ${steamId}`);
    console.log(`[TIMELINE] Cloud Function URL: ${cloudFunctionUrl}`);
    console.log(`[TIMELINE] Max games: ${maxGames}`);
    
    const cloudFunctionResponse = await axios.get(cloudFunctionUrl, {
      params: {
        steamId,
        maxGames,
      },
      timeout: 60000, // 60 second timeout for Cloud Function
    });

    console.log(`[TIMELINE] Cloud Function response status: ${cloudFunctionResponse.status}`);
    
    const { games } = cloudFunctionResponse.data;

    if (!games || games.length === 0) {
      return {
        steamId,
        error: 'No games found for this Steam ID',
        eras: [],
      };
    }

    console.log(`Retrieved ${games.length} games from Cloud Function`);

    // Step 2: Group games into eras
    let eras = groupGamesByEra(games);
    console.log(`Grouped into ${eras.length} eras`);

    // Step 3: Optionally merge adjacent similar eras
    if (mergeEras) {
      const original = eras.length;
      eras = mergeAdjacentSimilarEras(eras);
      console.log(`Merged eras: ${original} → ${eras.length}`);
    }

    // Step 4: Format eras for response
    const formattedEras = eras.map(era => formatEra(era));

    // Step 5: Build complete timeline response
    const timeline = formatTimeline(formattedEras, steamId);

    return timeline;
  } catch (error) {
    console.error('=== TIMELINE ERROR ===');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Status Text:', error.response.statusText);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.request) {
      console.error('Request Failed - No Response from Server');
      console.error('Request URL:', error.request._currentUrl || error.config?.url);
    }
    
    console.error('Full Error Stack:', error.stack);
    console.error('=====================');

    // Provide helpful error messages
    let errorMessage = 'Failed to fetch timeline data';
    let debugInfo = '';
    
    if (error.response?.status === 400) {
      errorMessage = 'Invalid Steam ID or missing parameters';
      debugInfo = error.response.data?.error || '';
    } else if (error.response?.status === 500) {
      errorMessage = 'Cloud Function error - check your Steam API key';
      debugInfo = error.response.data?.error || error.response.data || '';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot reach Cloud Function - make sure it\'s deployed or running locally';
      debugInfo = `Tried URL: ${cloudFunctionUrl}`;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Invalid Cloud Function URL';
      debugInfo = `URL not found: ${cloudFunctionUrl}`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      errorMessage = 'Cloud Function took too long to respond - it might be starting up';
      debugInfo = 'Try again in a few seconds';
    }

    const fullError = debugInfo ? `${errorMessage} (${debugInfo})` : errorMessage;
    throw new Error(fullError);
  }
}

/**
 * Get timeline with caching (optional - for performance)
 * @param {string} steamId
 * @param {Object} cache - Simple cache object (default: in-memory)
 * @returns {Promise<Object>} - Timeline data
 */
async function getTimelineWithCache(steamId, cache = {}) {
  const cacheKey = `timeline_${steamId}`;
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Check cache
  if (cache[cacheKey]) {
    const { data, timestamp } = cache[cacheKey];
    if (Date.now() - timestamp < CACHE_DURATION) {
      console.log(`Returning cached timeline for ${steamId}`);
      return data;
    }
  }

  // Fetch fresh data
  const timeline = await getTimeline(steamId);

  // Store in cache
  cache[cacheKey] = {
    data: timeline,
    timestamp: Date.now(),
  };

  return timeline;
}

module.exports = {
  getTimeline,
  getTimelineWithCache,
};
