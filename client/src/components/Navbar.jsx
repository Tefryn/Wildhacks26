/**
 * Navbar Component - Fixed navigation bar at the top
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSteamAuth } from "../hooks/useSteamAuth";
import "./Navbar.css";

const MANUAL_STEAM_ID_KEY = "manualSteamId";

const readStoredManualSteamId = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(MANUAL_STEAM_ID_KEY) || "";
};

export default function Navbar({ profileImage = null }) {
  const navigate = useNavigate();
  const { steamId, isSignedIn, signInUrl, signOut, avatarUrl, displayName } = useSteamAuth();
  const [manualSteamId, setManualSteamId] = useState(() => readStoredManualSteamId());
  const resolvedProfileImage = avatarUrl || profileImage;

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

  const handleManualSubmit = (event) => {
    event.preventDefault();

    const nextSteamId = manualSteamId.trim();
    if (!nextSteamId) {
      return;
    }

    window.localStorage.setItem(MANUAL_STEAM_ID_KEY, nextSteamId);
    window.dispatchEvent(new Event("manual-steam-id-changed"));
  };

  const handleManualChange = (event) => {
    setManualSteamId(event.target.value);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* App Name/Logo */}
        <div className="navbar-brand" onClick={() => navigate("/")}>
          <span className="navbar-icon">🎮</span>
          <h1 className="navbar-title">Steam Dex</h1>
        </div>

        {!isSignedIn && (
          <form className="navbar-search" onSubmit={handleManualSubmit}>
            <input
              className="navbar-search-input"
              type="text"
              value={manualSteamId}
              onChange={handleManualChange}
              placeholder="Enter Steam ID"
              aria-label="Enter Steam ID"
            />
            <button className="navbar-search-button" type="submit">
              Load
            </button>
          </form>
        )}

        {/* Profile Section */}
        <div className="navbar-profile">
          <div className="navbar-auth">
            {isSignedIn ? (
              <>
                <button className="steam-id-chip" type="button" onClick={() => navigate("/profile")}>
                  {steamId.slice(0, 6)}…{steamId.slice(-4)}
                </button>
                <button className="navbar-signout" type="button" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <a className="navbar-signin" href={signInUrl}>
                Connect Steam
              </a>
            )}
          </div>
          <button
            className="profile-avatar"
            onClick={() => navigate("/profile")}
            title={displayName ? `${displayName}'s profile` : "View Profile"}
          >
            {resolvedProfileImage ? (
              <img src={resolvedProfileImage} alt="Steam profile" className="profile-img" />
            ) : (
              <span className="profile-placeholder">👤</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
