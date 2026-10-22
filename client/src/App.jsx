import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Play, Copy, Check, Terminal, Code2, PlusCircle, LogIn } from 'lucide-react';
import { usePyodide } from './usePyodide';
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

  // Editor and execution state
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef(null);
  const { loading: pyodideLoading, runPythonCode } = usePyodide();

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
      } catch (err) {
        setRoomError(err.message);
      } finally {
        setLoadingRoom(false);
      }
    }

    fetchRoom();
  }, []);

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

  // Execute Python code in the browser via Pyodide
  const handleRunCode = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();

    setIsRunning(true);
    setIsError(false);
    setOutput('Running Python code in browser WASM engine...');

    try {
      const result = await runPythonCode(code);
      setOutput(result);
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

  // Create a new room via the backend API
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inputRoomName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room.');
      }

      // Update URL query parameter and set room state
      const newUrl = `${window.location.pathname}?room=${encodeURIComponent(data.room.name)}`;
      window.history.pushState({}, '', newUrl);
      setRoomData(data.room);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Join existing room by name or UUID
  const handleJoinExistingRoom = (e) => {
    e.preventDefault();
    if (!inputRoomName.trim()) return;

    const newUrl = `${window.location.pathname}?room=${encodeURIComponent(inputRoomName.trim())}`;
    window.location.href = newUrl;
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="navbar">
        <div className="brand">
          <Code2 size={24} color="#818cf8" />
          <span>Atelier</span>
        </div>

        {roomData && (
          <div className="room-info">
            <span className="room-title">Room:</span>
            <span className="room-name">{roomData.name}</span>
            <div className={`status-badge ${connected ? 'connected' : 'connecting'}`}>
              <span className="status-dot"></span>
              {connected ? 'Sync Connected' : 'Connecting...'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {roomData && (
            <button className="btn btn-secondary" onClick={handleCopyLink}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Share Room'}
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleRunCode}
            disabled={!roomData || isRunning || pyodideLoading}
          >
            <Play size={16} />
            {pyodideLoading ? 'Loading Pyodide...' : isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="main-workspace">
        {/* Editor Area */}
        <div className="editor-section">
          <div className="editor-toolbar">
            <span>Python 3.11 (WASM Pyodide Engine)</span>
            <span>{roomData ? 'Real-time Yjs Sync Active' : 'No Room Connected'}</span>
          </div>
          <div className="editor-container">
            {roomData ? (
              <Editor
                key={roomData.room_id}
                height="100%"
                defaultLanguage="python"
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
            {output || 'Click "Run Code" to execute Python script...'}
          </div>
        </div>
      </div>

      {/* Room Selection or Creation Modal when no valid room is active */}
      {(!roomData || roomError) && !loadingRoom && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Welcome to CodeSpace</h2>
              <p>Create a collaborative Python room or join an existing session.</p>
            </div>

            {roomError && <div className="alert-error">{roomError}</div>}
            {actionError && <div className="alert-error">{actionError}</div>}

            <form className="form-group" onSubmit={handleCreateRoom}>
              <label htmlFor="room-name-input">Room Name (Leave blank for random title)</label>
              <input
                id="room-name-input"
                className="input-field"
                type="text"
                placeholder="e.g. data-science-lab"
                value={inputRoomName}
                onChange={(e) => setInputRoomName(e.target.value)}
                disabled={isSubmitting}
              />

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={isSubmitting}
                >
                  <PlusCircle size={16} />
                  {isSubmitting ? 'Creating...' : 'Create Room'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleJoinExistingRoom}
                  disabled={isSubmitting || !inputRoomName.trim()}
                >
                  <LogIn size={16} />
                  Join Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
