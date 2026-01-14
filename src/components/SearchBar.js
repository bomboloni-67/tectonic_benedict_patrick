import React from 'react';
import './SearchBar.css';

function SearchBar({ query, setQuery, onSearch }) {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="search-bar">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Enter your search query..."
        className="search-input"
      />
      <button onClick={onSearch} className="search-button">Search</button>
    </div>
  );
}

export default SearchBar;