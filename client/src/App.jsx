import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import TimelineView from './pages/TimelineView';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import ApiKeyGate from './components/ApiKeyGate';
import {
  addSteamApiKeyChangeListener,
  getStoredSteamApiKey,
  setStoredSteamApiKey,
} from './utils/steamApiKey';
import './App.css';

function App() {
  const [steamApiKey, setSteamApiKey] = useState(() => getStoredSteamApiKey());

  useEffect(() => {
    const syncKey = () => {
      setSteamApiKey(getStoredSteamApiKey());
    };

    const unsubscribe = addSteamApiKeyChangeListener(syncKey);
    syncKey();

    return unsubscribe;
  }, []);

  if (!steamApiKey) {
    return <ApiKeyGate onSubmit={setStoredSteamApiKey} />;
  }

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<TimelineView />} />
        <Route path="/timeline" element={<TimelineView />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;