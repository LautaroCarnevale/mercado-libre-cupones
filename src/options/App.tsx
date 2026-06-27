import { useState, useEffect, useCallback } from 'react';
import type { UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { ApiConfig } from './components/ApiConfig';
import { CategoryPrefs } from './components/CategoryPrefs';
import { AutomationSettings } from './components/AutomationSettings';
import { LogViewer } from './components/LogViewer';

type Tab = 'api' | 'categories' | 'automation' | 'logs';

export function App() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<Tab>('api');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    chrome.storage.local.get('ml_cupones_settings', (result) => {
      if (result.ml_cupones_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...result.ml_cupones_settings });
      }
    });
  }, []);

  const saveSettings = useCallback((updated: Partial<UserSettings>) => {
    const merged = { ...settings, ...updated };
    setSettings(merged);

    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      payload: updated,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      payload: DEFAULT_SETTINGS,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'api', label: 'API' },
    { id: 'categories', label: 'Categorias' },
    { id: 'automation', label: 'Automatizacion' },
    { id: 'logs', label: 'Logs' },
  ];

  return (
    <div className="options-container">
      <header className="options-header">
        <div className="header-brand">
          <span className="header-icon">🏷️</span>
          <h1>Mercado Libre Cupones · Configuracion</h1>
        </div>
        {saved && <span className="save-indicator">Guardado</span>}
      </header>

      <nav className="options-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="options-content">
        {activeTab === 'api' && (
          <ApiConfig settings={settings} onSave={saveSettings} />
        )}
        {activeTab === 'categories' && (
          <CategoryPrefs settings={settings} onSave={saveSettings} />
        )}
        {activeTab === 'automation' && (
          <AutomationSettings settings={settings} onSave={saveSettings} />
        )}
        {activeTab === 'logs' && <LogViewer />}
      </main>

      <footer className="options-footer">
        <button className="btn-reset" onClick={resetSettings}>
          Restaurar valores por defecto
        </button>
      </footer>
    </div>
  );
}
