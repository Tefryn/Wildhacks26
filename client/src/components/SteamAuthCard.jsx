import { useSteamAuth } from "../hooks/useSteamAuth";
import "./SteamAuthCard.css";

export default function SteamAuthCard({ onConnect }) {
  const { steamId, isSignedIn, signInUrl, signOut } = useSteamAuth();

  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    }
  };

  return (
    <section className="steam-auth-card">
      <div className="steam-auth-glow steam-auth-glow-left" />
      <div className="steam-auth-glow steam-auth-glow-right" />

      <div className="steam-auth-content">
        <div className="steam-auth-copy">
          <span className="steam-auth-kicker">Steam OpenID</span>
          <h2>Sign in to unlock your timeline</h2>
          <p>
            Authenticate with Steam to pull your ID automatically and keep the
            timeline linked to your profile.
          </p>
        </div>

        <div className="steam-auth-actions">
          {isSignedIn ? (
            <>
              <div className="steam-auth-pill">
                <span className="steam-auth-pill-label">Connected</span>
                <span className="steam-auth-pill-value">{steamId}</span>
              </div>
              <button type="button" className="steam-auth-secondary" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <a className="steam-auth-primary" href={signInUrl} onClick={handleConnect}>
                <span className="steam-auth-button-icon">◎</span>
                Sign in with Steam
              </a>
              <p className="steam-auth-note">
                You will be redirected to Steam and returned here with your 17-digit SteamID.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
