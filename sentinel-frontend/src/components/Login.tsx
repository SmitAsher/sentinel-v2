import React, { useState } from 'react';
import '../styles/Login.css';

export default function Login({ onLogin }: { onLogin: (org: string) => void }) {
  const [org, setOrg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (org.trim()) {
      onLogin(org.trim());
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>SENTINEL <span>ENTERPRISE</span></h1>
        <p>Threat Mapping Platform</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="organization">Organization Name</label>
            <input 
              type="text" 
              id="organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="e.g. Google, Microsoft, Amazon"
              autoComplete="off"
              autoFocus
            />
          </div>
          <button type="submit" className="login-submit" disabled={!org.trim()}>
            ⚔ ACCESS DASHBOARD
          </button>
        </form>
      </div>
    </div>
  );
}
