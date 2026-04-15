/**
 * ProfilePage Component - User profile page
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSteamAuth } from '../hooks/useSteamAuth';
import {
  clearStoredSteamApiKey,
  getStoredSteamApiKey,
  setStoredSteamApiKey,
} from '../utils/steamApiKey';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { steamId, isSignedIn, signInUrl, signOut, avatarUrl, displayName } = useSteamAuth();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyStatus, setApiKeyStatus] = useState('');

  const currentApiKey = getStoredSteamApiKey();

  useEffect(() => {
    setApiKeyStatus('');
  }, [currentApiKey]);

  const handleApiKeySave = (event) => {
    event.preventDefault();
    const nextKey = apiKeyInput.trim();

    if (!nextKey) {
      setApiKeyStatus('Enter a Steam API key to save.');
      return;
    }

    setStoredSteamApiKey(nextKey);
    setApiKeyInput('');
    setApiKeyStatus('Steam API key updated.');
  };

  const handleApiKeyClear = () => {
    clearStoredSteamApiKey();
    setApiKeyInput('');
    setApiKeyStatus('Steam API key cleared. Enter a new key to continue.');
  };

  const profileData = {
    username: displayName || 'SteamUser',
    steamId: steamId || 'Not connected',
    profileImage: avatarUrl || null,
    stats: {
      totalGames: 142,
      totalHours: 1950,
      totalAchievements: 1369,
    },
  };

  return (
    <div className="profile-page">
      {/* Back Button */}
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          {profileData.profileImage ? (
            <img src={profileData.profileImage} alt="Profile" />
          ) : (
            <span>👤</span>
          )}
        </div>

        <div className="profile-info">
          <h1 className="profile-username">{profileData.username}</h1>
          <p className="profile-steamid">Steam ID: {profileData.steamId}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <span className="stat-label">Total Games</span>
            <span className="stat-value">{profileData.stats.totalGames}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-label">Total Hours</span>
            <span className="stat-value">
              {Math.round(profileData.stats.totalHours)}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏆</div>
          <div className="stat-content">
            <span className="stat-label">Achievements</span>
            <span className="stat-value">
              {profileData.stats.totalAchievements}
            </span>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="profile-section">
        <h2 className="section-title">About</h2>
        <p className="section-content">
          Your gaming profile showcasing your complete gaming history and achievements across Steam games.
        </p>
      </div>

      {/* Settings Section */}
      <div className="profile-section">
        <h2 className="section-title">Settings</h2>
        <div className="settings-list">
          <div className="api-key-settings">
            <p className="api-key-label">Steam API Key</p>
            <p className="api-key-hint">
              Current key: {currentApiKey ? 'Saved' : 'Not set'}
            </p>
            <form className="api-key-inline-form" onSubmit={handleApiKeySave}>
              <input
                className="api-key-input"
                type="password"
                autoComplete="off"
                placeholder="Paste new Steam API key"
                value={apiKeyInput}
                onChange={(event) => setApiKeyInput(event.target.value)}
              />
              <button className="settings-item" type="submit">
                <span>Update API Key</span>
                <span className="arrow">→</span>
              </button>
            </form>
            <button className="settings-item" type="button" onClick={handleApiKeyClear}>
              <span>Clear API Key</span>
              <span className="arrow">→</span>
            </button>
            {apiKeyStatus && <p className="api-key-status">{apiKeyStatus}</p>}
          </div>
          <button className="settings-item">
            <span>Privacy Settings</span>
            <span className="arrow">→</span>
          </button>
          <button className="settings-item">
            <span>Export Profile Data</span>
            <span className="arrow">→</span>
          </button>
          {isSignedIn ? (
            <button className="settings-item logout" onClick={signOut}>
              <span>Sign Out</span>
              <span className="arrow">→</span>
            </button>
          ) : (
            <a className="settings-item logout" href={signInUrl}>
              <span>Connect Steam</span>
              <span className="arrow">→</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
