import React from 'react';
import './ChatHistory.css';

function ChatHistory({ history }) {
  return (
    <div className="chat-history">
      <h2>Chat History</h2>
      <div className="history-list">
        {history.map((item, index) => (
          <div key={index} className="chat-item">
            <div className="query">Query: {item.query}</div>
            <div className="response">Response: {item.response}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatHistory;