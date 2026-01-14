import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [pw, setPw] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/.netlify/functions/login', {
      method: 'POST',
      body: JSON.stringify({ password: pw })
    });
    const data = await res.json();
    if (data.token) {
      onLogin(data.token);
    } else {
      alert("Unauthorized");
    }
  };

  return (
    <div className="login-overlay">
      <form className="login-box" onSubmit={handleSubmit}>
        <h3>Restricted Access</h3>
        <input 
          type="password" 
          placeholder="Enter Admin Password" 
          value={pw} 
          onChange={(e) => setPw(e.target.value)} 
        />
        <button type="submit">Unlock System</button>
      </form>
    </div>
  );
};

export default Login;