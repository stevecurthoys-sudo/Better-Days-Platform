import React, { useState, useEffect } from 'react';
import './App.css';
import { API_BASE_URL } from './config.js';

function App() {
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true); // true = login, false = register
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Check if user is already logged in on app load
  useEffect(() => {
    const token = localStorage.getItem('betterDaysToken');
    const savedUser = localStorage.getItem('betterDaysUser');
    
    if (token && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        // Optional: Verify token is still valid with backend
        verifyToken(token);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('betterDaysToken');
        localStorage.removeItem('betterDaysUser');
      }
    }
  }, []);

  // Verify token with backend
  const verifyToken = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        // Token invalid or expired
        localStorage.removeItem('betterDaysToken');
        localStorage.removeItem('betterDaysUser');
        setUser(null);
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const endpoint = isLogin ? '/api/signin' : '/api/register';
    const payload = isLogin 
      ? { 
          email: formData.email, 
          password: formData.password 
        }
      : { 
          email: formData.email, 
          password: formData.password,
          display_name: formData.name || 'New User'
        };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        // Save token and user data
        localStorage.setItem('betterDaysToken', data.token);
        localStorage.setItem('betterDaysUser', JSON.stringify(data.user));
        
        setUser(data.user);
        setMessage(isLogin ? 'Sign in successful!' : 'Account created successfully!');
        
        // Clear form
        setFormData({ name: '', email: '', password: '' });
      } else {
        setMessage(data.error || 'Authentication failed. Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('betterDaysToken');
    localStorage.removeItem('betterDaysUser');
    setUser(null);
    setFormData({ name: '', email: '', password: '' });
    setIsLogin(true);
    setMessage('You have been signed out.');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌿 Better Days</h1>
        <p className="tagline">Your Neighborhood, Connected</p>
      </header>

      <main className="main-content">
        {!user ? (
          // Authentication Page (Login/Register)
          <div className="auth-card">
            <h2>{isLogin ? 'Welcome Back' : 'Join Better Days'}</h2>
            <p>
              {isLogin 
                ? 'Sign in to access your neighborhood forum and local services.'
                : 'Create an account to join your street forum and connect with neighbors.'}
            </p>
           
            <form onSubmit={handleAuthSubmit} className="auth-form">
              {!isLogin && (
                <input 
                  type="text" 
                  name="name"
                  placeholder="Your Name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                />
              )}
              <input 
                type="email" 
                name="email"
                placeholder="Email Address" 
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              <input 
                type="password" 
                name="password"
                placeholder="Password" 
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength="6"
              />
              
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {message && (
              <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <div className="auth-toggle">
              <p>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={toggleAuthMode} 
                  className="btn-link"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>

            <div className="demo-notes">
              <p><strong>Live Backend:</strong> This connects to your deployed API at {API_BASE_URL}</p>
              <p>Test with the credentials you used during registration.</p>
            </div>
          </div>
        ) : (
          // User Dashboard
          <div className="dashboard">
            <div className="welcome-banner">
              <h2>Welcome back, {user.display_name}!</h2>
              <p>You're signed in as {user.email}</p>
              <p className="small">Session persists across page refreshes.</p>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-card">
                <h3>🏠 Your Forum</h3>
                <p>Ready to create or join a neighborhood forum.</p>
                <p>User ID: {user.id}</p>
                <button className="btn-secondary">Explore Forums</button>
              </div>

              <div className="dashboard-card">
                <h3>🔐 Account Status</h3>
                <ul>
                  <li>Email: {user.email}</li>
                  <li>Verified: {user.verified ? 'Yes' : 'Pending'}</li>
                  <li>Member since: {new Date(user.created_at).toLocaleDateString()}</li>
                </ul>
                <button 
                  onClick={() => console.log('View profile')} 
                  className="btn-secondary"
                >
                  View Profile
                </button>
              </div>

              <div className="dashboard-card">
                <h3>🛠️ API Ready</h3>
                <p>Your backend is fully functional:</p>
                <ul>
                  <li>✅ Authentication working</li>
                  <li>✅ Database connected</li>
                  <li>✅ JWT tokens active</li>
                  <li>✅ Protected routes ready</li>
                </ul>
                <button 
                  onClick={() => window.open(`${API_BASE_URL}/health`, '_blank')}
                  className="btn-secondary"
                >
                  Test Health Check
                </button>
              </div>
            </div>

            <div className="quick-actions">
              <button className="btn-primary">Create First Forum</button>
              <button 
                onClick={handleLogout} 
                className="btn-logout"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Better Days – Building stronger neighborhoods, together.</p>
        <p className="footer-note">
          {user 
            ? `Authenticated with ${API_BASE_URL}` 
            : 'Sign in to access the full platform'}
        </p>
      </footer>
    </div>
  );
}
