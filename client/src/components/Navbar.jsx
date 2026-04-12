/**
 * Navbar Component - Fixed navigation bar at the top
 */

import { useNavigate } from "react-router-dom";
import { useSteamAuth } from "../hooks/useSteamAuth";
import "./Navbar.css";

export default function Navbar({ profileImage = null }) {
  const navigate = useNavigate();
  const { steamId, isSignedIn, signInUrl, signOut, avatarUrl, displayName } = useSteamAuth();
  const resolvedProfileImage = avatarUrl || profileImage;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* App Name/Logo */}
        <div className="navbar-brand" onClick={() => navigate("/")}>
          <span className="navbar-icon">🎮</span>
          <h1 className="navbar-title">Gaming Timeline</h1>
        </div>

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
