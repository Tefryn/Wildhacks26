/**
 * GamingInsights Component - Shows player gaming profile and insights
 */

import './GamingInsights.css';

/**
 * GamingInsights component - Displays gaming stats and badges
 */
export default function GamingInsights({ timeline, eras }) {
  if (!timeline || !eras || eras.length === 0) {
    return null;
  }

  const era = eras[0]; // Current era
  const games = era.games || [];

  // Calculate insights
  const masterpieces = games.filter(g => g.achievementCompletionRate >= 0.9); // 90%+ completion
  const perfectGames = games.filter(g => g.achievementCompletionRate === 1); // 100% completion
  const averageCompletion = (
    games.reduce((sum, g) => sum + g.achievementCompletionRate, 0) / games.length * 100
  ).toFixed(1);

  const totalHours = timeline.stats.totalHours;
  const dayEquivalent = (totalHours / 24).toFixed(1);
  const avgHoursPerGame = (totalHours / games.length).toFixed(1);

  // Gaming profile determination
  let profileType = 'Completionist';
  let profileEmoji = '🏆';
  let profileDescription = 'You strive for perfection!';

  if (perfectGames.length >= 5) {
    profileType = 'Achievement Hunter';
    profileEmoji = '🎯';
    profileDescription = 'A master of 100% completions!';
  } else if (masterpieces.length >= 15) {
    profileType = 'Completionist';
    profileEmoji = '🏆';
    profileDescription = 'High standards, excellent taste!';
  } else if (avgHoursPerGame > 50) {
    profileType = 'Deep Diver';
    profileEmoji = '🌊';
    profileDescription = 'Goes ALL IN on games!';
  } else if (games.length > 40) {
    profileType = 'Adventure Seeker';
    profileEmoji = '🗺️';
    profileDescription = 'Love variety and exploration!';
  }

  return (
    <div className="gaming-insights">
      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-emoji">{profileEmoji}</div>
          <div className="profile-info">
            <h3 className="profile-type">{profileType}</h3>
            <p className="profile-description">{profileDescription}</p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="insights-grid">
          <div className="insight-box milestone">
            <span className="insight-label">Total Playtime</span>
            <span className="insight-value">{totalHours.toFixed(0)}h</span>
            <span className="insight-subtext">{dayEquivalent} days straight! 🔥</span>
          </div>

          <div className="insight-box">
            <span className="insight-label">Avg Per Game</span>
            <span className="insight-value">{avgHoursPerGame}h</span>
            <span className="insight-subtext">Deep commitment</span>
          </div>

          <div className="insight-box">
            <span className="insight-label">Achievement Avg</span>
            <span className="insight-value">{averageCompletion}%</span>
            <span className="insight-subtext">Completion rate</span>
          </div>

          <div className="insight-box">
            <span className="insight-label">Perfect Games</span>
            <span className="insight-value">{perfectGames.length}</span>
            <span className="insight-subtext">100% Complete</span>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="badges-section">
        <h4 className="badges-title">Achievements Unlocked</h4>
        <div className="badges-grid">
          {perfectGames.length > 0 && (
            <div className="badge gold">
              <span className="badge-emoji">🏅</span>
              <span className="badge-label">{perfectGames.length} Masterpieces</span>
              <span className="badge-desc">Games with 100% completion</span>
            </div>
          )}

          {masterpieces.length > 0 && (
            <div className="badge silver">
              <span className="badge-emoji">⭐</span>
              <span className="badge-label">{masterpieces.length} High Masters</span>
              <span className="badge-desc">90%+ completion rate</span>
            </div>
          )}

          {games.length > 30 && (
            <div className="badge bronze">
              <span className="badge-emoji">📚</span>
              <span className="badge-label">Epic Collector</span>
              <span className="badge-desc">{games.length} games played</span>
            </div>
          )}

          {totalHours > 1000 && (
            <div className="badge platinum">
              <span className="badge-emoji">⚡</span>
              <span className="badge-label">Time Lord</span>
              <span className="badge-desc">{dayEquivalent}+ days of gameplay</span>
            </div>
          )}
        </div>
      </div>

      {/* Fun Facts */}
      <div className="fun-facts">
        <h4 className="facts-title">Your Gaming Story</h4>
        <div className="facts-content">
          <p>
            🎮 You've invested <strong>{totalHours.toFixed(0)} hours</strong> into gaming this year—that's {dayEquivalent} days of pure play time!
          </p>
          <p>
            🎯 You have <strong>{perfectGames.length} games with 100% achievement completion</strong>, showing your mastery and dedication!
          </p>
          <p>
            📊 Your average completion rate is <strong>{averageCompletion}%</strong>, which is {parseFloat(averageCompletion) > 50 ? 'impressive!' : 'respectable!'}
          </p>
          <p>
            🏆 As a <strong>{profileType}</strong>, you balance breadth and depth beautifully—{games.length} games with serious commitment to each!
          </p>
        </div>
      </div>
    </div>
  );
}
