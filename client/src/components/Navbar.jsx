/**
 * Navbar Component - Fixed navigation bar at the top
 */

import { useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar({ profileImage = null }) {
  const navigate = useNavigate();

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
          <button
            className="profile-avatar"
            onClick={() => navigate("/profile")}
            title="View Profile"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-img" />
            ) : (
              <span className="profile-placeholder">👤</span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
