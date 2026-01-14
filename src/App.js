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
  const currentQuery = query;
  setQuery('');

  // 1. Create a placeholder in history for the AI to "type" into
  setChatHistory(prev => [...prev, { query: currentQuery, response: "" }]);
  const historyIndex = chatHistory.length;

  try {
    const res = await fetch("/.netlify/functions/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: currentQuery }),
    });

    if (!res.ok) throw new Error("Search failed");

    // 2. Attach a reader to the stream
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // 3. Decode the chunk (this will contain parts of <think> or the answer)
      const chunk = decoder.decode(value, { stream: true });

      // 4. Update the UI incrementally
      setChatHistory(prev => {
        const updated = [...prev];
        updated[historyIndex].response += chunk;
        return updated;
      });
    }
  } catch (error) {
    console.error("Search failed:", error);
    setChatHistory(prev => {
      const updated = [...prev];
      updated[historyIndex].response = "Error connecting to search service.";
      return updated;
    });
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