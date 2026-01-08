import { useState, useEffect, type FormEvent } from 'react';
import axios from 'axios';
import './App.css';

interface OAuthParams {
  clientId: string;
  redirectUri: string;
  state: string | null;
}

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthParams, setOauthParams] = useState<OAuthParams | null>(null);
  const [paramsError, setParamsError] = useState<string | null>(null);

  useEffect(() => {
    // Parse OAuth parameters from URL
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client_id');
    const redirectUri = urlParams.get('redirect_uri');
    const state = urlParams.get('state');
    const responseType = urlParams.get('response_type');

    if (!clientId || !redirectUri) {
      setParamsError('Missing required OAuth parameters (client_id, redirect_uri)');
      return;
    }

    if (responseType && responseType !== 'code') {
      setParamsError('Invalid response_type. Only "code" is supported.');
      return;
    }

    setOauthParams({ clientId, redirectUri, state });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!oauthParams) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await axios.post('/oauth/login', {
        email,
        password,
        client_id: oauthParams.clientId,
        redirect_uri: oauthParams.redirectUri,
        state: oauthParams.state
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Redirect to the callback URL with the authorization code
      window.location.href = response.data.redirect_url;
    } catch (err) {
      console.error('Login error:', err);
      console.log('Request data:', { email, password: '***', client_id: oauthParams.clientId, redirect_uri: oauthParams.redirectUri });
      if (axios.isAxiosError(err)) {
        console.error('Response:', err.response?.status, err.response?.data);
        setError(err.response?.data?.error || `Server error: ${err.response?.status}`);
      } else {
        setError('Login failed. Please try again.');
      }
      setIsLoading(false);
    }
  };

  if (paramsError) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="error-state">
            <div className="error-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1>Invalid Request</h1>
            <p>{paramsError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>Sign In</h1>
          <p>Authorization Server</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="submit-button" disabled={isLoading || !oauthParams}>
            {isLoading ? (
              <span className="loading-spinner">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                </svg>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="app-info">
            Signing in to: <code>{oauthParams?.clientId || '...'}</code>
          </p>
          <p className="demo-hint">
            Demo: <code>demo@example.com</code> / <code>password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
