import React from 'react';
import './Buttons.css';

function Buttons({ onClearHistory }) {
  return (
    <div className="buttons">
      <button className="action-button" onClick={onClearHistory}>Clear History</button>
      <button className="action-button">Settings</button>
      <button className="action-button">Help</button>
    </div>
  );
}

export default Buttons;