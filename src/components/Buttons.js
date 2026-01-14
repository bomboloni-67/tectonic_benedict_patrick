import React from 'react';
import './Buttons.css';

function Buttons() {
  return (
    <div className="buttons">
      <button className="action-button">Clear History</button>
      <button className="action-button">Settings</button>
      <button className="action-button">Help</button>
    </div>
  );
}

export default Buttons;