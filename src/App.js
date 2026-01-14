import React, { useState, useRef } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ChatHistory from './components/ChatHistory';
import Buttons from './components/Buttons';
import Login from './components/Login'; 

function App() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  const currentResponseRef = useRef("");

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    const currentQuery = query;
    setQuery('');
    currentResponseRef.current = ""; 

    setChatHistory(prev => [{ query: currentQuery, response: "" }, ...prev]);
    
    const historyForContext = chatHistory.map(entry => [
      {role: 'user', content: entry.query},
      {role: 'assistant', content: entry.response}
    ]).flat();

    const fullMessages= [...historyForContext, {role:'user', content: currentQuery}];

    try {
      const res = await fetch("/.netlify/functions/search", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ messages: fullMessages }),
      });

      if (res.status === 401) {
        handleLogout(); // Force them back to login screen
        throw new Error("Session expired. Please log in again.");
      }

      if (!res.ok) throw new Error("Search failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        currentResponseRef.current += chunk;

        setChatHistory(prev => {
          const updated = [...prev];
          updated[0].response = currentResponseRef.current;
          return updated;
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
      setChatHistory(prev => {
        const updated = [...prev];
        updated[0].response = "Error: " + error.message;
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- THE GATEKEEPER ---
  // If no token exists, we return ONLY the Login screen. 
  // This prevents anyone from seeing your app's internal UI.
  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Random Autonomous Gazebo</h1>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </header>
      <main>
        <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} />
        {isLoading && <div className="loading-indicator">Searching the web and thinking...</div>}
        <Buttons />
        <ChatHistory history={chatHistory} />
      </main>
    </div>
  );
}

export default App;