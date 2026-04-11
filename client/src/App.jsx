import { useEffect, useState } from "react";

function App() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.message))
      .catch(() => setStatus("Could not connect to API"));
  }, []);

  return (
    <main className="app">
      <h1>Node + React Starter</h1>
      <p>Backend status: {status}</p>
      <p>Edit <code>client/src/App.jsx</code> to start building.</p>
    </main>
  );
}

export default App;