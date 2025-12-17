import React, { useState } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');

  const handleRegister = (e) => {
    e.preventDefault();
    // Simulate registration
    setUser({ name: 'New User', email: 'user@betterdays.app' });
    setPage('dashboard');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌿 Better Days</h1>
        <p className="tagline">Your Neighborhood, Connected</p>
      </header>

      <main className="main-content">
        {!user ? (
          // Registration/Login Page
          <div className="auth-card">
            <h2>Welcome to Better Days</h2>
            <p>Join your neighborhood forum to make decisions together and support local services.</p>
            
            <form onSubmit={handleRegister} className="auth-form">
              <input type="text" placeholder="Your Name" required />
              <input type="email" placeholder="Email Address" required />
              <input type="password" placeholder="Create Password" required />
              <button type="submit" className="btn-primary">
                Join Your Street Forum
              </button>
            </form>

            <div className="demo-notes">
              <p><strong>Demo Note:</strong> This is a prototype. Click "Join" to simulate registration.</p>
            </div>
          </div>
        ) : (
          // User Dashboard
          <div className="dashboard">
            <div className="welcome-banner">
              <h2>Welcome back, {user.name}!</h2>
              <p>You're part of the Maple Street Forum (8 members)</p>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>🏠 Your Forum</h3>
                <p>Active members: 8/10</p>
                <p>Next election: 24 days</p>
                <button className="btn-secondary">Enter Forum</button>
              </div>

              <div className="dashboard-card">
                <h3>🗳️ Active Proposals</h3>
                <ul>
                  <li>Community Garden Plan (voting ends tomorrow)</li>
                  <li>Neighborhood Watch Schedule (new)</li>
                </ul>
                <button className="btn-secondary">View All</button>
              </div>

              <div className="dashboard-card">
                <h3>🛠️ Local Services</h3>
                <p>Find trusted neighbors offering:</p>
                <ul>
                  <li>Gardening & Landscaping</li>
                  <li>Home Repairs</li>
                  <li>Tutoring</li>
                  <li>Cleaning Services</li>
                </ul>
                <button className="btn-secondary">Browse Marketplace</button>
              </div>
            </div>

            <div className="quick-actions">
              <button className="btn-primary">Propose New Idea</button>
              <button className="btn-outline">Invite Neighbors</button>
              <button onClick={() => setUser(null)} className="btn-logout">
                Logout
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Better Days – Building stronger neighborhoods, together.</p>
        <p className="footer-note">This is a functional prototype for testing.</p>
      </footer>
    </div>
  );
}
export default App;
