import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { Play, Copy, Check, Terminal, Wifi, Code2 } from 'lucide-react';
import { usePyodide } from './usePyodide';
import './index.css';

export default function App() {
  const [roomId, setRoomId] = useState('demo-room');
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState('');
  const [isError, setIsError] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const editorRef = useRef(null);
  const { loading: pyodideLoading, runPythonCode } = usePyodide();

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Yjs Document & WebSocket connection provider
    const ydoc = new Y.Doc();
    const wsUrl = `ws://${window.location.hostname}:5000/ws/rooms/`;
    const provider = new WebsocketProvider(wsUrl, roomId, ydoc);
    const ytext = ydoc.getText('monaco');

    // Bind Yjs CRDT model to Monaco Editor
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="navbar">
        <div className="brand">
          <Code2 size={24} color="#818cf8" />
          <span>Atelier</span>
        </div>

        <div className="room-info">
          <span className="room-title">Room:</span>
          <span className="room-name">{roomId}</span>
          <div className={`status-badge ${connected ? 'connected' : 'connecting'}`}>
            <span className="status-dot"></span>
            {connected ? 'Sync Connected' : 'Connecting...'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleCopyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied' : 'Share Room'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRunCode}
            disabled={isRunning || pyodideLoading}
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
            <span>Real-time Yjs Sync Active</span>
          </div>
          <div className="editor-container">
            <Editor
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
    </div>
  );
}
