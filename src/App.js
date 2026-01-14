import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import ChatHistory from './components/ChatHistory';
import Buttons from './components/Buttons';

function App() {
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const handleSearch = () => {
    // Placeholder for RAG LLM search
    const response = `Response to: ${query}`;
    setChatHistory([...chatHistory, { query, response }]);
    setQuery('');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>RAG LLM Internet Search Tool</h1>
      </header>
      <main>
        <SearchBar query={query} setQuery={setQuery} onSearch={handleSearch} />
        <Buttons />
        <ChatHistory history={chatHistory} />
      </main>
    </div>
  );
}

export default App;