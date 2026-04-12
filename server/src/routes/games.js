/**
 * Games Routes - API endpoints for game-related data
 * Acts as a proxy to Steam API to bypass CORS restrictions
 */

const express = require('express');
const axios = require('axios');

const router = express.Router();

/**
 * GET /api/games/details/:appId
 * Fetches game details from Steam API
 * 
 * @param {number} appId - Steam App ID
 * @returns {Object} Game details with name and metadata
 */
router.get('/details/:appId', async (req, res) => {
  try {
    const { appId } = req.params;

    if (!appId || !/^\d+$/.test(appId)) {
      return res.status(400).json({
        error: 'Invalid appId - must be numeric',
        appId,
      });
    }

    // Fetch from Steam API
    const steamResponse = await axios.get(
      `https://store.steampowered.com/api/appdetails`,
      {
        params: {
          appids: appId,
        },
        timeout: 10000,
      }
    );

    const gameData = steamResponse.data[appId];

    if (!gameData || !gameData.success) {
      return res.status(404).json({
        error: 'Game not found',
        appId,
      });
    }

    const { data } = gameData;

    // Extract relevant data
    const gameDetails = {
      appId: parseInt(appId),
      name: data.name || `App ${appId}`,
      headerImage: data.header_image || null,
      releaseDate: data.release_date?.date || null,
      developers: data.developers || [],
      publishers: data.publishers || [],
      genres: (data.genres || []).map(g => g.description),
      categories: (data.categories || []).map(c => c.description),
      shortDescription: data.short_description || null,
    };

    return res.status(200).json(gameDetails);
  } catch (error) {
    console.error('Game details fetch error:', error.message);

    const statusCode = error.response?.status === 404 ? 404 : 500;
    const errorMessage = error.response?.status === 404
      ? 'Game not found on Steam'
      : 'Failed to fetch game details';

    return res.status(statusCode).json({
      error: errorMessage,
      appId: req.params.appId,
    });
  }
});

module.exports = router;
