import React, { useState } from 'react';
import { 
  Code2, 
  Terminal, 
  Zap, 
  Cpu, 
  Users, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  FolderGit2, 
  User, 
  LogOut 
} from 'lucide-react';

export default function LandingPage({
  user,
  onCreateRoom,
  onJoinRoom,
  onOpenAuth,
  onOpenMyRooms,
  onLogout,
  isSubmitting,
  actionError,
}) {
  const [quickRoomName, setQuickRoomName] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('python');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    onCreateRoom(quickRoomName, selectedLanguage);
  };

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (quickRoomName.trim()) {
      onJoinRoom(quickRoomName.trim());
    }
  };

  return (
    <div className="landing-container">
      {/* Top OpenRouter-style Navigation Bar */}
      <header className="landing-nav">
        <div className="landing-nav-left">
          <div className="landing-brand">
            <span className="brand-dot"></span>
            <span className="brand-text">atelier</span>
          </div>
        </div>

        <nav className="landing-nav-links">
          <a href="#features">Engines</a>
          <a href="#architecture">Architecture</a>
          <a href="#sync">CRDT Sync</a>
          <a href="#docs">Docs</a>
        </nav>

        <div className="landing-nav-right">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button 
                className="btn-nav-outline"
                onClick={onOpenMyRooms}
              >
                <FolderGit2 size={15} />
                Workspaces
              </button>
              <div className="landing-user-badge" title={user.email}>
                <span className="landing-user-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <span>{user.username}</span>
              </div>
              <button 
                className="btn-nav-icon"
                onClick={onLogout}
                title="Log out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button 
                className="btn-nav-ghost"
                onClick={onOpenAuth}
              >
                Sign In
              </button>
              <button 
                className="btn-accent-lime"
                onClick={onOpenAuth}
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-hero">
        <h1 className="hero-headline">
          The Collaborative Sandbox<br />
          For Every Developer
        </h1>

        <p className="hero-subtitle">
          Real-time conflict-free CRDT sync. Zero cloud queue latency. Zero compute cost.
        </p>

        {actionError && (
          <div className="alert-error" style={{ maxWidth: '520px', margin: '0 auto 1.5rem' }}>
            {actionError}
          </div>
        )}

        {/* Hero Quick Room Generator Form */}
        <form onSubmit={handleCreateSubmit} className="hero-cta-box">
          <div className="hero-input-wrap">
            <input
              type="text"
              placeholder="Workspace name (or leave empty for slug)"
              value={quickRoomName}
              onChange={(e) => setQuickRoomName(e.target.value)}
              className="hero-input"
              disabled={isSubmitting}
            />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="hero-select"
              disabled={isSubmitting}
            >
              <option value="python">Python 3.11 (WASM)</option>
              <option value="javascript">JavaScript (ES6)</option>
            </select>
          </div>

          <div className="hero-actions">
            <button
              type="submit"
              className="btn-accent-lime hero-btn"
              disabled={isSubmitting}
            >
              <Zap size={16} />
              {isSubmitting ? 'Starting...' : 'Create Instant Room'}
            </button>

            <button
              type="button"
              className="btn-dark-outline hero-btn"
              onClick={handleJoinSubmit}
              disabled={isSubmitting || !quickRoomName.trim()}
            >
              Join Session <ArrowRight size={16} />
            </button>
          </div>
        </form>

        {/* Metric Ribbons */}
        <div className="metrics-strip">
          <div className="metric-item">
            <span className="metric-value">0ms</span>
            <span className="metric-label">Cloud Queue Delay</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <span className="metric-value">100%</span>
            <span className="metric-label">Client WASM Compute</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <span className="metric-value">$0.00</span>
            <span className="metric-label">Execution Cost</span>
          </div>
          <div className="metric-divider"></div>
          <div className="metric-item">
            <span className="metric-value">CRDT</span>
            <span className="metric-label">Yjs Real-Time State</span>
          </div>
        </div>

        {/* Live IDE Visual Preview Mockup */}
        <div className="hero-mockup-wrapper">
          <div className="hero-mockup-header">
            <div className="mockup-traffic-lights">
              <span className="traffic-dot red"></span>
              <span className="traffic-dot yellow"></span>
              <span className="traffic-dot green"></span>
            </div>
            <div className="mockup-tab">
              <Code2 size={13} color="#c8ff00" />
              <span>swift-python-492 • main.py</span>
            </div>
            <div className="mockup-collab-avatars">
              <span className="collab-avatar user-1">K</span>
              <span className="collab-avatar user-2">A</span>
              <span className="collab-count">+2 syncing</span>
            </div>
          </div>

          <div className="hero-mockup-body">
            <div className="mockup-code-lines">
              <div className="code-line">
                <span className="line-num">1</span>
                <span className="code-keyword">import</span> <span className="code-var">math</span>
              </div>
              <div className="code-line">
                <span className="line-num">2</span>
                <span className="code-keyword">def</span> <span className="code-func">calculate_primes</span>(limit):
              </div>
              <div className="code-line">
                <span className="line-num">3</span>
                <span className="code-indent"></span>
                <span className="code-comment"># In-browser Pyodide WASM execution</span>
              </div>
              <div className="code-line">
                <span className="line-num">4</span>
                <span className="code-indent"></span>
                <span className="code-keyword">return</span> [x <span className="code-keyword">for</span> x <span className="code-keyword">in</span> range(2, limit) <span className="code-keyword">if</span> all(x % d != 0 <span className="code-keyword">for</span> d <span className="code-keyword">in</span> range(2, int(math.isqrt(x)) + 1))]
                <span className="cursor-tag cursor-green">Kunal</span>
              </div>
              <div className="code-line">
                <span className="line-num">5</span>
                <span className="code-func">print</span>(<span className="code-str">"Prime numbers up to 50:"</span>, calculate_primes(50))
                <span className="cursor-tag cursor-blue">Alex</span>
              </div>
            </div>

            <div className="mockup-terminal">
              <div className="terminal-header">
                <Terminal size={12} color="#c8ff00" />
                <span>TERMINAL (0ms LATENCY)</span>
              </div>
              <div className="terminal-body">
                <span className="terminal-prompt">$ python3 main.py</span>
                <span className="terminal-output">Prime numbers up to 50: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]</span>
                <span className="terminal-meta">[Execution time: 4.8ms | Memory: 0MB Server Cost]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Bento Grid */}
        <section id="features" className="bento-section">
          <div className="bento-card">
            <div className="bento-icon-box">
              <Zap size={22} color="#c8ff00" />
            </div>
            <h3>Peerless CRDT Synchronization</h3>
            <p>
              Powered by Yjs and WebSockets. Every keystroke is resolved mathematically without merge conflicts or lost edits.
            </p>
          </div>

          <div className="bento-card">
            <div className="bento-icon-box">
              <Cpu size={22} color="#c8ff00" />
            </div>
            <h3>Client-Side WebAssembly</h3>
            <p>
              Run Python 3.11 with Pyodide and ES6 JavaScript straight in the user's browser thread with native speed and zero server costs.
            </p>
          </div>

          <div className="bento-card">
            <div className="bento-icon-box">
              <Layers size={22} color="#c8ff00" />
            </div>
            <h3>Extensible Strategy Pattern</h3>
            <p>
              Clean runner contracts allow seamless scaling to server-side containers and Docker backends whenever needed.
            </p>
          </div>

          <div className="bento-card">
            <div className="bento-icon-box">
              <ShieldCheck size={22} color="#c8ff00" />
            </div>
            <h3>Persistent Workspaces</h3>
            <p>
              PostgreSQL debounced document flush with JWT session authentication keeps your shared sessions safe and recoverable.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="footer-left">
            <span className="brand-dot small"></span>
            <span>Atelier • Real-Time Collaborative Sandbox</span>
          </div>
          <div className="footer-right">
            <span>Built with React, Yjs, Monaco &amp; WebAssembly</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
