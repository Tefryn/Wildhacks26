/**
 * Timeline Routes - API endpoints for timeline/era data
 */

const express = require('express');
const { getTimeline, getTimelineWithCache } = require('../controllers/eraController');

const router = express.Router();

// In-memory cache (simple implementation for prototype)
const cache = {};

/**
 * GET /api/timeline
 * Fetches and computes game eras for a Steam user
 * 
 * Query Parameters:
 *   - steamId (required): Steam ID of the user
 *   - maxGames (optional): Maximum number of games to process (default: 50, max: 100)
 *   - mergeEras (optional): Whether to merge similar adjacent eras (default: false)
 *   - useCache (optional): Whether to use caching (default: true)
 * 
 * Example: GET /api/timeline?steamId=76561198123456789&maxGames=50
 */
router.get('/', async (req, res) => {
  try {
    const { steamId, maxGames, mergeEras, useCache } = req.query;

    // Validate steamId
    if (!steamId) {
      return res.status(400).json({
        error: 'Missing steamId parameter',
        example: '/api/timeline?steamId=76561198123456789',
      });
    }

    // Validate steamId format (should be numeric)
    if (!/^\d+$/.test(steamId)) {
      return res.status(400).json({
        error: 'Invalid steamId format - must be numeric',
      });
    }

    // Parse optional parameters
    const options = {
      maxGames: maxGames ? Math.min(parseInt(maxGames), 100) : 50,
      mergeEras: mergeEras === 'true',
    };

    // Decide whether to use cache
    const useCache_ = useCache !== 'false'; // Default true

    let timeline;
    if (useCache_) {
      timeline = await getTimelineWithCache(steamId, cache);
    } else {
      timeline = await getTimeline(steamId, options);
    }

    // Return success response
    return res.status(200).json(timeline);
  } catch (error) {
    console.error('Timeline route error:', error);

    const statusCode = error.message?.includes('Invalid Steam ID') ? 400 : 500;
    const errorMessage = error.message || 'Internal Server Error';

    return res.status(statusCode).json({
      error: errorMessage,
      steamId: req.query.steamId,
    });
  }
});

/**
 * GET /api/timeline/health
 * Simple health check endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Timeline API is running',
    endpoints: {
      timeline: 'GET /api/timeline?steamId={steamId}',
      health: 'GET /api/timeline/health',
    },
  });
});

/**
 * POST /api/timeline/cache/clear
 * Clears the cache (development utility)
 */
router.post('/cache/clear', (req, res) => {
  const cleared = Object.keys(cache).length;
  for (const key in cache) {
    delete cache[key];
  }

  res.status(200).json({
    message: `Cache cleared`,
    entriesCleared: cleared,
  });
});

/**
 * GET /api/timeline/debug
 * Debug endpoint to test Cloud Function URL
 */
router.get('/debug', async (req, res) => {
  const axios = require('axios');
  const cloudFunctionUrl = process.env.CLOUD_FUNCTION_URL || 'http://localhost:5001/wildhacks26/us-central1/getUserFeatureModel';
  const testSteamId = '76561198123456789'; // Valve test account
  
  console.log('\n=== DEBUG INFO ===');
  console.log('Cloud Function URL:', cloudFunctionUrl);
  console.log('Environment Variables:', {
    CLOUD_FUNCTION_URL: process.env.CLOUD_FUNCTION_URL || 'NOT SET',
    PORT: process.env.PORT || '5000',
  });
  console.log('==================\n');

  try {
    console.log('[DEBUG] Testing Cloud Function connection...');
    const response = await axios.get(cloudFunctionUrl, {
      params: {
        steamId: testSteamId,
        maxGames: 5,
      },
      timeout: 10000,
    });

    console.log('[DEBUG] Success! Cloud Function is reachable');
    
    return res.status(200).json({
      status: 'success',
      message: 'Cloud Function is working',
      cloudFunctionUrl,
      responseStatus: response.status,
      responseKeys: Object.keys(response.data),
      gameCount: response.data?.response?.game_count || 'N/A',
    });
  } catch (error) {
    console.error('[DEBUG] Error connecting to Cloud Function:');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    
    if (error.request) {
      console.error('Request failed (no response from server)');
      console.error('Request was sent to:', error.config?.url);
    }

    return res.status(400).json({
      status: 'error',
      message: 'Cannot reach Cloud Function',
      cloudFunctionUrl,
      error: error.message,
      errorCode: error.code,
      errorType: error.constructor.name,
      suggestions: [
        '1. Make sure Cloud Functions are running locally: firebase functions:config:get',
        '2. Check the URL format matches your project ID',
        '3. If using deployed functions, use the HTTPS URL from Firebase Console',
        '4. Try: curl "' + cloudFunctionUrl + '?steamId=' + testSteamId + '"',
        '5. Check firewall/network settings',
      ],
    });
  }
});

module.exports = router;
