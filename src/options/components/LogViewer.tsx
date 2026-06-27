import { useState, useEffect } from 'react';

interface LogEntry {
  level: string;
  module: string;
  message: string;
  timestamp: string;
  data?: unknown;
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    chrome.storage.local.get('ml_cupones_logs', (result) => {
      setLogs((result.ml_cupones_logs ?? []).reverse());
    });
  };

  const clearLogs = () => {
    chrome.storage.local.set({ ml_cupones_logs: [] });
    setLogs([]);
  };

  const filtered = filter === 'all'
    ? logs
    : logs.filter((l) => l.level === filter);

  const levelColor: Record<string, string> = {
    debug: '#8B949E',
    info: '#58A6FF',
    warn: '#D29922',
    error: '#F85149',
  };

  return (
    <div className="settings-section">
      <div className="logs-header">
        <h2>Logs</h2>
        <div className="logs-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
          <button className="btn-secondary btn-sm" onClick={loadLogs}>Refrescar</button>
          <button className="btn-secondary btn-sm" onClick={clearLogs}>Limpiar</button>
        </div>
      </div>

      <div className="logs-container">
        {filtered.length === 0 ? (
          <p className="empty-hint">No hay logs</p>
        ) : (
          filtered.slice(0, 200).map((log, i) => (
            <div key={i} className="log-entry">
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className="log-level"
                style={{ color: levelColor[log.level] ?? '#8B949E' }}
              >
                {log.level.toUpperCase()}
              </span>
              <span className="log-module">[{log.module}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
