import React from 'react';
import './ChatHistory.css';
import ChatMessage from './ChatMessage';

function ChatHistory({ history }) {
  return (
    <div className="chat-history">
      <h2>Chat History</h2>
      <div className="history-list">
        {history.map((item, index) => (
          <ChatMessage key={index} msg={item}/>
        ))}
      </div>
    </div>
  );
}

export default ChatHistory;