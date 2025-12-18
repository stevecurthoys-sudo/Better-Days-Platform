import React, { useState, useEffect } from 'react';
import './App.css';
const API_BASE_URL = 'https://better-days-backend.onrender.com';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('home');
  const [isLogin, setIsLogin] = useState(false); // false = register, true = login
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
        setPage('dashboard');
        console.log('Auto-login successful for:', userData.email);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('betterDaysToken');
        localStorage.removeItem('betterDaysUser');
      }
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
   
    const payload = {
      email: formData.email,
      password: formData.password,
      display_name: formData.name || 'New User'
    };
   
    try {
      console.log('Registering user:', payload.email);
     
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
     
      const data = await response.json();
     
      if (data.success) {
        // Auto-login after successful registration
        const signInResponse = await fetch(`${API_BASE_URL}/api/signin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: payload.email,
            password: payload.password
          })
        });
       
        const signInData = await signInResponse.json();
       
        if (signInData.success) {
          // Save token and user data
          localStorage.setItem('betterDaysToken', signInData.token);
          localStorage.setItem('betterDaysUser', JSON.stringify(signInData.user));
         
          // Set the user in state
          setUser({
            name: signInData.user.display_name,
            email: signInData.user.email,
            id: signInData.user.id
          });
          setPage('dashboard');
          setMessage('Account created successfully! You are now signed in.');
        }
      } else {
        setMessage(data.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
   
    const payload = {
      email: formData.email,
      password: formData.password
    };
   
    try {
      console.log('Signing in user:', payload.email);
     
      const response = await fetch(`${API_BASE_URL}/api/signin`, {
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
       
        // Set the user in state
        setUser({
          name: data.user.display_name,
          email: data.user.email,
          id: data.user.id
        });
        setPage('dashboard');
        setMessage('Sign in successful!');
      } else {
        setMessage(data.error || 'Sign in failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('betterDaysToken');
    localStorage.removeItem('betterDaysUser');
    setUser(null);
    setPage('home');
    setFormData({ name: '', email: '', password: '' });
    setIsLogin(false);
    setMessage('You have been signed out.');
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setMessage('');
    setFormData({ name: '', email: '', password: '' });
  };

  const handleSubmit = (e) => {
    if (isLogin) {
      handleSignIn(e);
    } else {
      handleRegister(e);
    }
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
            <div className="auth-header">
              <h2>{isLogin ? 'Welcome Back' : 'Join Better Days'}</h2>
              <p>
                {isLogin 
                  ? 'Sign in to access your neighborhood forum and local services.'
                  : 'Create an account to join your street forum and connect with neighbors.'}
              </p>
              
              <div className="auth-tabs">
                <button 
                  className={`auth-tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(false)}
                  type="button"
                >
                  Create Account
                </button>
                <button 
                  className={`auth-tab ${isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(true)}
                  type="button"
                >
                  Sign In
                </button>
              </div>
            </div>
           
            <form onSubmit={handleSubmit} className="auth-form">
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
              <div className={`auth-message ${message.includes('successful') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}

            <div className="auth-switch">
              <p>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={toggleAuthMode} 
                  className="switch-link"
                  type="button"
                >
                  {isLogin ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </div>

            <div className="demo-notes">
              <p><strong>Live Backend Connected:</strong> Using {API_BASE_URL}</p>
              <p>Test with credentials you've previously registered.</p>
            </div>
          </div>
        ) : (
          // User Dashboard
          <div className="dashboard">
            <div className="welcome-banner">
              <h2>Welcome back, {user.name}!</h2>
              <p>You're part of the Maple Street Forum (8 members)</p>
              <p className="user-email">Signed in as: {user.email}</p>
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
              <button onClick={handleLogout} className="btn-logout">
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
            : 'Sign in or create an account to access the full platform.'}
        </p>
      </footer>
    </div>
  );
}
