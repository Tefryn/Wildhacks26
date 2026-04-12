import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TimelineView from './pages/TimelineView';
import ProfilePage from './pages/ProfilePage';
import Navbar from './components/Navbar';
import './App.css';

function App() {
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