import React, { useState, useEffect } from 'react';
import './App.css';
const API_BASE_URL = 'https://better-days-backend.onrender.com';

function App() {
  // State for user authentication
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(false); // false = register, true = login
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI state
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
        console.log('Auto-login successful for:', userData.email);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('betterDaysToken');
        localStorage.removeItem('betterDaysUser');
      }
    }
  }, []);

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
   
    const formData = {
      email: email,
      password: password,
      display_name: name || 'New User'
    };
   
    try {
      console.log('Registering user:', formData.email);
     
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
     
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Registration failed: ${response.status}`);
      }
     
      const data = await response.json();
      console.log('Registration successful:', data);
     
      // Auto-login after successful registration
      const signInResponse = await fetch(`${API_BASE_URL}/api/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      });
     
      if (signInResponse.ok) {
        const signInData = await signInResponse.json();
        
        // Save token and user data to localStorage
        localStorage.setItem('betterDaysToken', signInData.token);
        localStorage.setItem('betterDaysUser', JSON.stringify(signInData.user));
       
        // Update UI state
        setUser({
          name: signInData.user.display_name,
          email: signInData.user.email,
          id: signInData.user.id
        });
        
        setMessage('Account created successfully! You are now signed in.');
      } else {
        throw new Error('Auto-login after registration failed');
      }
     
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
   
    const formData = {
      email: email,
      password: password
    };
   
    try {
      console.log('Signing in user:', formData.email);
     
      const response = await fetch(`${API_BASE_URL}/api/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
     
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Sign in failed: ${response.status}`);
      }
     
      const data = await response.json();
      console.log('Sign in successful:', data);
     
      // Save token and user data to localStorage
      localStorage.setItem('betterDaysToken', data.token);
      localStorage.setItem('betterDaysUser', JSON.stringify(data.user));
     
      // Update UI state
      setUser({
        name: data.user.display_name,
        email: data.user.email,
        id: data.user.id
      });
      
      setMessage('Sign in successful!');
     
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage(error.message || 'Sign in failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    if (isLoginMode) {
      handleSignIn(e);
    } else {
      handleRegister(e);
    }
  };

  // Handle logout - FIXED VERSION
  const handleLogout = () => {
    localStorage.removeItem('betterDaysToken');
    localStorage.removeItem('betterDaysUser');
    setUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setIsLoginMode(false);
    setMessage('You have been signed out.');
    
    // Force clear any remaining state
    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  // Toggle between login and register modes
  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    setMessage('');
    // Clear form when toggling
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌿 Better Days</h1>
        <p className="tagline">Your Neighborhood, Connected</p>
      </header>

      <main className="main-content">
        {!user ? (
          // Authentication Page with BOTH Sign Up and Sign In
          <div className="auth-card">
            <h2>{isLoginMode ? 'Welcome Back' : 'Join Better Days'}</h2>
            <p>
              {isLoginMode 
                ? 'Sign in to access your neighborhood forum and local services.'
                : 'Create an account to join your street forum and connect with neighbors.'}
            </p>
           
            {/* Auth Mode Toggle Buttons - VISIBLE ON FIRST PAGE */}
            <div className="auth-mode-toggle">
              <button 
                className={`auth-mode-btn ${!isLoginMode ? 'active' : ''}`}
                onClick={() => setIsLoginMode(false)}
                type="button"
              >
                Create Account
              </button>
              <button 
                className={`auth-mode-btn ${isLoginMode ? 'active' : ''}`}
                onClick={() => setIsLoginMode(true)}
                type="button"
              >
                Sign In
              </button>
            </div>

            {/* Combined Form for Register/Login */}
            <form onSubmit={handleSubmit} className="auth-form">
              {!isLoginMode && (
                <input 
                  type="text" 
                  placeholder="Your Name (optional)" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
              
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                {loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account')}
              </button>
            </form>

            {/* Switch between modes */}
            <div className="auth-switch">
              <p>
                {isLoginMode ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={toggleAuthMode} 
                  className="switch-link"
                  type="button"
                >
                  {isLoginMode ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>

            {/* Status messages */}
            {message && (
              <div className={`auth-message ${message.includes('successful') ? 'success' : ''}`}>
                {message}
              </div>
            )}

            <div className="demo-notes">
              <p><strong>Live Backend:</strong> Connected to {API_BASE_URL}</p>
              <p>Test with an existing account or create a new one.</p>
            </div>
          </div>
        ) : (
          // User Dashboard
          <div className="dashboard">
            <div className="welcome-banner">
              <h2>Welcome back, {user.name}!</h2>
              <p>You're part of the Maple Street Forum (8 members)</p>
              <p className="user-info">Signed in as: {user.email}</p>
              <p className="user-id">User ID: {user.id}</p>
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
              <button 
                onClick={() => console.log('Create forum clicked')} 
                className="btn-primary"
              >
                Propose New Idea
              </button>
              <button 
                onClick={() => console.log('Invite neighbors clicked')}
                className="btn-outline"
              >
                Invite Neighbors
              </button>
              <button 
                onClick={handleLogout} 
                className="btn-logout"
              >
                Sign Out
              </button>
            </div>

            <div className="debug-info">
              <p className="small">
                <strong>Debug:</strong> Token stored in localStorage. Refresh page to test persistence.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Better Days – Building stronger neighborhoods, together.</p>
        <p className="footer-note">
          {user 
            ? `Authenticated with ${API_BASE_URL}` 
            : 'Sign in or create an account to access the full platform.'}
        </p>
      </footer>
    </div>
  );
}
