import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ChatHistory from './components/ChatHistory';
import Buttons from './components/Buttons';

function App() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch("/.netlify/functions/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (res.ok) {
        // We use data.answer because that is what search.js returns
        setChatHistory(prev => [...prev, { query, response: data.answer }]);
        setQuery('');
      } else {
        throw new Error(data.error || "Failed to fetch");
      }
    } catch (error) {
      console.error("Search failed:", error);
      setChatHistory(prev => [...prev, { 
        query, 
        response: "Sorry, I encountered an error connecting to the search service." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RAG LLM Internet Search Tool</h1>
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