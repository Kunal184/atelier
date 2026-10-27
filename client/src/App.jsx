import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Play, Copy, Check, Terminal, Code2, PlusCircle, LogIn, User, LogOut, FolderGit2, X, ChevronLeft } from 'lucide-react';
import { getRunner } from './runners/runnerFactory';
import LandingPage from './LandingPage';
import './index.css';

// Base backend API URL
const BACKEND_URL = `http://${window.location.hostname}:5000`;

export default function App() {
  // Room state
  const [roomData, setRoomData] = useState(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState('');
  
  // Creation modal state
  const [inputRoomName, setInputRoomName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // Selected language (synchronized with roomData)
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [runnerReady, setRunnerReady] = useState(false);

  // Editor and execution state
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('codespace_token') || '');
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authUsername, setAuthUsername] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // User Rooms State
  const [showMyRoomsModal, setShowMyRoomsModal] = useState(false);
  const [myRooms, setMyRooms] = useState([]);
  const [loadingMyRooms, setLoadingMyRooms] = useState(false);

  const editorRef = useRef(null);

  // Verify stored auth token on mount
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    async function verifyAuth() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token invalid or expired, clear it
          localStorage.removeItem('codespace_token');
          setToken('');
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
      }
    }

    verifyAuth();
  }, [token]);

  // Pre-initialize runner in background when selected language changes
  useEffect(() => {
    async function initRunner() {
      setRunnerReady(false);
      try {
        const runner = getRunner(selectedLanguage);
        await runner.init();
        setRunnerReady(true);
      } catch (err) {
        console.error('Failed to initialize code runner:', err);
      }
    }
    initRunner();
  }, [selectedLanguage]);

  // Parse room query parameter on mount and whenever search parameters change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');

    if (!roomParam) {
      setRoomData(null);
      setLoadingRoom(false);
      return;
    }

    async function fetchRoom() {
      setLoadingRoom(true);
      setRoomError('');
      try {
        const response = await fetch(`${BACKEND_URL}/api/rooms/${encodeURIComponent(roomParam)}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(`Room '${roomParam}' not found.`);
          }
          throw new Error('Failed to load room details.');
        }

        const data = await response.json();
        setRoomData(data.room);
        if (data.room.language) {
          setSelectedLanguage(data.room.language);
        }
      } catch (err) {
        setRoomError(err.message);
      } finally {
        setLoadingRoom(false);
      }
    }

    fetchRoom();
  }, []);

  // Handle changing language and persist back to PostgreSQL
  const handleLanguageChange = async (newLanguage) => {
    setSelectedLanguage(newLanguage);
    if (!roomData) return;

    try {
      await fetch(`${BACKEND_URL}/api/rooms/${encodeURIComponent(roomData.room_id)}/language`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: newLanguage }),
      });
    } catch (err) {
      console.error('Failed to persist language change:', err);
    }
  };

  // Handle Monaco editor mounting and bind Yjs collaborative document
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    if (!roomData) return;

    // Initialize Yjs Document and WebSocket provider using the unique room_id
    const ydoc = new Y.Doc();
    const wsUrl = `ws://${window.location.hostname}:5000/ws/rooms/`;
    const provider = new WebsocketProvider(wsUrl, roomData.room_id, ydoc);
    const ytext = ydoc.getText('monaco');

    // Bind Yjs CRDT model to Monaco editor instance
    const binding = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    provider.on('status', (event) => {
      setConnected(event.status === 'connected');
    });

    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  };

  // Execute code using the Strategy Pattern runner
  const handleRunCode = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();

    setIsRunning(true);
    setIsError(false);
    setOutput(`Running ${selectedLanguage} code...`);

    try {
      const runner = getRunner(selectedLanguage);
      const result = await runner.run(code);

      if (result.stderr) {
        setIsError(true);
        setOutput(`${result.stdout ? result.stdout + '\n' : ''}${result.stderr}\n\n[Execution time: ${result.executionTimeMs}ms]`);
      } else {
        setOutput(`${result.stdout || '(Code executed with no output)'}\n\n[Execution time: ${result.executionTimeMs}ms]`);
      }
    } catch (err) {
      setIsError(true);
      setOutput(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Copy shareable room link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Create a new room via backend API (supports custom name & language from landing page)
  const handleCreateRoom = async (customName = '', customLang = selectedLanguage) => {
    setIsSubmitting(true);
    setActionError('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          name: customName && customName.trim() ? customName.trim() : inputRoomName, 
          language: customLang 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room.');
      }

      // Update URL query parameter and set room state
      const newUrl = `${window.location.pathname}?room=${encodeURIComponent(data.room.name)}`;
      window.history.pushState({}, '', newUrl);
      setRoomData(data.room);
      if (data.room.language) {
        setSelectedLanguage(data.room.language);
      }
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join existing room by name or UUID
  const handleJoinExistingRoom = (identifier) => {
    const target = identifier || inputRoomName;
    if (!target.trim()) return;

    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(target.trim())}`;
    window.location.href = newUrl;
  };

  // Handle Authentication submission (Login or Register)
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login' 
      ? { email: authEmail, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword };

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      // Save token and user
      localStorage.setItem('codespace_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setShowAuthModal(false);
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('codespace_token');
    setToken('');
    setUser(null);
  };

  // Fetch rooms owned by user
  const handleOpenMyRooms = async () => {
    setShowMyRoomsModal(true);
    setLoadingMyRooms(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/rooms/user/my-rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Failed to load user rooms:', err);
    } finally {
      setLoadingMyRooms(false);
    }
  };


  // If not currently inside an active room session, render the OpenRouter-style landing page
  if (!roomData) {
    return (
      <div className="app-container">
        <LandingPage
          user={user}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinExistingRoom}
          onOpenAuth={() => {
            setAuthError('');
            setShowAuthModal(true);
          }}
          onOpenMyRooms={handleOpenMyRooms}
          onLogout={handleLogout}
          isSubmitting={isSubmitting}
          actionError={actionError || roomError}
        />

        {/* User Authentication Modal */}
        {showAuthModal && (
          <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem' }}
                  onClick={() => setShowAuthModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="tab-group">
                <button
                  className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                  }}
                >
                  Sign In
                </button>
                <button
                  className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError('');
                  }}
                >
                  Register
                </button>
              </div>

              {authError && <div className="alert-error">{authError}</div>}

              <form className="form-group" onSubmit={handleAuthSubmit}>
                {authMode === 'register' && (
                  <>
                    <label htmlFor="auth-username">Username</label>
                    <input
                      id="auth-username"
                      className="input-field"
                      type="text"
                      required
                      placeholder="Your developer username"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      disabled={authLoading}
                    />
                  </>
                )}

                <label htmlFor="auth-email">Email Address</label>
                <input
                  id="auth-email"
                  className="input-field"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  disabled={authLoading}
                />

                <label htmlFor="auth-password">Password</label>
                <input
                  id="auth-password"
                  className="input-field"
                  type="password"
                  required
                  placeholder="Enter password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  disabled={authLoading}
                />

                <button
                  type="submit"
                  className="btn-accent-lime"
                  style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.65rem' }}
                  disabled={authLoading}
                >
                  {authLoading
                    ? 'Please wait...'
                    : authMode === 'login'
                    ? 'Sign In'
                    : 'Create Account'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* User's Created Rooms Modal */}
        {showMyRoomsModal && (
          <div className="modal-overlay" onClick={() => setShowMyRoomsModal(false)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2>My Workspaces</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Rooms created under your account
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem' }}
                  onClick={() => setShowMyRoomsModal(false)}
                >
                  <X size={16} />
                </button>
              </div>

              {loadingMyRooms ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading rooms...</div>
              ) : myRooms.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                  You have not created any rooms yet. Any new room you create while logged in will appear here.
                </div>
              ) : (
                <div className="room-list">
                  {myRooms.map((room) => (
                    <div
                      key={room.id}
                      className="room-card-item"
                      onClick={() => {
                        setShowMyRoomsModal(false);
                        window.location.href = `/?room=${encodeURIComponent(room.name)}`;
                      }}
                    >
                      <div>
                        <div className="room-item-title">{room.name}</div>
                        <div className="room-item-meta">
                          <span>Language: {room.language}</span>
                          <span>•</span>
                          <span>{new Date(room.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Open →</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, render the active Collaborative Workspace (IDE)
  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="navbar">
        <div 
          className="brand" 
          onClick={() => { window.location.href = '/'; }}
          style={{ cursor: 'pointer' }}
          title="Return to Home"
        >
          <ChevronLeft size={18} color="var(--text-muted)" />
          <span className="brand-dot small"></span>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800 }}>atelier</span>
        </div>

        {roomData && (
          <div className="room-info">
            <span className="room-title">Room:</span>
            <span className="room-name">{roomData.name}</span>
            <select
              className="input-field"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="python">Python 3.11 (WASM)</option>
              <option value="javascript">JavaScript (ES6)</option>
            </select>
            <div className={`status-badge ${connected ? 'connected' : 'connecting'}`}>
              <span className="status-dot"></span>
              {connected ? 'Sync Connected' : 'Connecting...'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {roomData && (
            <button className="btn btn-secondary" onClick={handleCopyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Share Room'}
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRunCode}
            disabled={!roomData || isRunning || !runnerReady}
          >
            <Play size={16} />
            {!runnerReady ? 'Initializing Engine...' : isRunning ? 'Running...' : 'Run Code'}
          </button>

          {/* User Authentication Status */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                onClick={handleOpenMyRooms}
                title="View your created rooms"
              >
                <FolderGit2 size={16} />
                My Rooms
              </button>
              <div className="user-badge" title={user.email}>
                <div className="user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span>{user.username}</span>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleLogout}
                title="Log out"
                style={{ padding: '0.5rem' }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAuthError('');
                setShowAuthModal(true);
              }}
            >
              <User size={16} />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-workspace">
        {/* Editor Area */}
        <div className="editor-section">
          <div className="editor-toolbar">
            <span>
              {selectedLanguage === 'python'
                ? 'Python 3.11 (Pyodide WASM Engine)'
                : 'JavaScript (Browser Worker Sandbox)'}
            </span>
            <span>{roomData ? 'Real-time Yjs Sync Active' : 'No Room Connected'}</span>
          </div>
          <div className="editor-container">
            {roomData ? (
              <Editor
                key={`${roomData.room_id}-${selectedLanguage}`}
                height="100%"
                language={selectedLanguage}
                theme="vs-dark"
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 12 },
                }}
                onMount={handleEditorDidMount}
              />
            ) : (
              <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                Please select or create a room to begin coding.
              </div>
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="output-section">
          <div className="output-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Terminal size={16} />
              <span>Execution Output</span>
            </div>
          </div>
          <div className={`output-content ${isError ? 'error' : ''}`}>
            {output || 'Click "Run Code" to execute script...'}
          </div>
        </div>
      </div>



      {/* User Authentication Modal (Sign In / Register) */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{authMode === 'login' ? 'Sign In' : 'Create Account'}</h2>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setShowAuthModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="tab-group">
              <button
                className={`tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
              >
                Sign In
              </button>
              <button
                className={`tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
              >
                Register
              </button>
            </div>

            {authError && <div className="alert-error">{authError}</div>}

            <form className="form-group" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <>
                  <label htmlFor="auth-username">Username</label>
                  <input
                    id="auth-username"
                    className="input-field"
                    type="text"
                    required
                    placeholder="Your developer username"
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    disabled={authLoading}
                  />
                </>
              )}

              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                className="input-field"
                type="email"
                required
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                disabled={authLoading}
              />

              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                className="input-field"
                type="password"
                required
                placeholder="Enter password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                disabled={authLoading}
              />

              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: '0.5rem', justifyContent: 'center' }}
                disabled={authLoading}
              >
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* User's Created Rooms Modal */}
      {showMyRoomsModal && (
        <div className="modal-overlay" onClick={() => setShowMyRoomsModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>My Workspaces</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Rooms created under your account
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem' }}
                onClick={() => setShowMyRoomsModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            {loadingMyRooms ? (
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>Loading rooms...</div>
            ) : myRooms.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                You have not created any rooms yet. Any new room you create while logged in will appear here.
              </div>
            ) : (
              <div className="room-list">
                {myRooms.map((room) => (
                  <div
                    key={room.id}
                    className="room-card-item"
                    onClick={() => {
                      setShowMyRoomsModal(false);
                      window.location.href = `/?room=${encodeURIComponent(room.name)}`;
                    }}
                  >
                    <div>
                      <div className="room-item-title">{room.name}</div>
                      <div className="room-item-meta">
                        <span>Language: {room.language}</span>
                        <span>•</span>
                        <span>{new Date(room.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>Open →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

