import { useState } from "react";

export default function ApiKeyGate({ onSubmit }) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = apiKeyInput.trim();

    if (!trimmed) {
      setError("Steam API key is required.");
      return;
    }

    setError("");
    onSubmit(trimmed);
  };

  return (
    <div className="api-key-gate">
      <div className="api-key-gate-card">
        <h1>Steam Dex</h1>
        <p>
          This project now requires each user to provide their own Steam Web API
          key before accessing the app.
        </p>
        <form onSubmit={handleSubmit} className="api-key-form">
          <label htmlFor="steam-api-key">Steam API Key</label>
          <input
            id="steam-api-key"
            type="password"
            autoComplete="off"
            placeholder="Paste your Steam Web API key"
            value={apiKeyInput}
            onChange={(event) => setApiKeyInput(event.target.value)}
          />
          {error && <p className="api-key-error">{error}</p>}
          <button type="submit">Enter App</button>
        </form>
      </div>
    </div>
  );
}
