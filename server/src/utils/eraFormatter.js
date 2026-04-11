/**
 * Era Formatter - Formats and enhances era data for frontend consumption
 */

const { generateEraName } = require('./gameGrouping');

/**
 * Formats era data for API response
 * @param {Object} era - Raw era object from groupGamesByEra
 * @returns {Object} Formatted era object
 */
function formatEra(era) {
  const eraName = generateEraName(era);

  return {
    eraId: era.eraId,
    name: eraName,
    year: era.year,
    season: era.season,
    dateRange: {
      start: era.startDate,
      end: era.endDate,
    },
    stats: {
      totalHours: era.totalHours,
      gameCount: era.gameCount,
      averageHoursPerGame: Math.round((era.totalHours / era.gameCount) * 100) / 100,
    },
    dominantGenres: era.dominantGenres,
    topGames: era.topGames,
    games: era.games,
  };
}

/**
 * Generates simple ad-lib descriptions for eras
 * @param {Object} era - Formatted era object
 * @returns {string} Ad-lib description
 */
function generateEraDescription(era) {
  const { name, stats, dominantGenres, topGames } = era;
  
  const templates = {
    high_hours: `You absolutely crushed it in ${era.year}! With ${stats.totalHours} hours logged, you were living and breathing ${dominantGenres[0] || 'gaming'}. ${topGames[0]?.name} was clearly your obsession.`,
    
    balanced: `The ${era.year} era was a balanced journey through ${dominantGenres.join(', ')}. ${stats.gameCount} different games kept you entertained with an average of ${stats.averageHoursPerGame} hours per game.`,
    
    genre_focused: `Talk about dedication! Your ${era.year} gaming life was dominated by ${dominantGenres[0]}. ${topGames[0]?.name} led the charge with ${topGames[0]?.playtimeHours} hours of playtime.`,
    
    diverse: `${era.year} was the year of variety! You juggled ${stats.gameCount} games across multiple genres - from ${dominantGenres[0]} to ${dominantGenres[1] || 'indie gems'}. True variety is the spice of gaming life.`,
  };

  // Select template based on metrics
  let template;
  
  if (stats.totalHours > 500) {
    template = templates.high_hours;
  } else if (dominantGenres.length >= 2) {
    template = templates.diverse;
  } else if (stats.gameCount > 15) {
    template = templates.balanced;
  } else {
    template = templates.genre_focused;
  }

  return template;
}

/**
 * Formats complete timeline data for API response
 * @param {Array} eras - Array of formatted era objects
 * @param {string} steamId - Steam ID of the user
 * @returns {Object} Complete timeline response
 */
function formatTimeline(eras, steamId) {
  const totalHours = eras.reduce((sum, era) => sum + era.stats.totalHours, 0);
  const totalGames = eras.reduce((sum, era) => sum + era.stats.gameCount, 0);
  
  // Find most played era
  const mostPlayedEra = eras.reduce((max, era) => 
    era.stats.totalHours > max.stats.totalHours ? era : max
  , eras[0]) || null;

  // Find most diverse era (most games)
  const mostDiverseEra = eras.reduce((max, era) => 
    era.stats.gameCount > max.stats.gameCount ? era : max
  , eras[0]) || null;

  // Calculate average hours per year
  const yearSpan = eras.length > 0 
    ? eras[eras.length - 1].year - eras[0].year + 1 
    : 0;

  return {
    steamId,
    timeline: {
      startYear: eras[0]?.year,
      endYear: eras[eras.length - 1]?.year,
      eraCount: eras.length,
      stats: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalGames: totalGames,
        averageHoursPerYear: yearSpan > 0 
          ? Math.round((totalHours / yearSpan) * 100) / 100 
          : 0,
      },
      highlights: {
        mostPlayedEra: mostPlayedEra ? {
          name: mostPlayedEra.name,
          hours: mostPlayedEra.stats.totalHours,
        } : null,
        mostDiverseEra: mostDiverseEra ? {
          name: mostDiverseEra.name,
          gameCount: mostDiverseEra.stats.gameCount,
        } : null,
      },
    },
    eras: eras.map(era => ({
      ...era,
      description: generateEraDescription(era),
    })),
  };
}

module.exports = {
  formatEra,
  generateEraDescription,
  formatTimeline,
};
