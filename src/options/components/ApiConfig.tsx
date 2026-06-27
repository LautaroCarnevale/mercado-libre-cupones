import { useState } from 'react';
import type { UserSettings } from '../../types';

interface Props {
  settings: UserSettings;
  onSave: (updated: Partial<UserSettings>) => void;
}

export function ApiConfig({ settings, onSave }: Props) {
  const [url, setUrl] = useState(settings.apiBaseUrl);
  const [timeout, setTimeout_] = useState(settings.apiTimeout);
  const [retries, setRetries] = useState(settings.apiRetries);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);

  const handleSave = () => {
    onSave({ apiBaseUrl: url, apiTimeout: timeout, apiRetries: retries });
  };

  const handleTest = () => {
    setTesting(true);
    setTestResult(null);
    chrome.runtime.sendMessage({ type: 'HEALTH_CHECK' }, (res) => {
      setTesting(false);
      setTestResult(res?.success && res.data?.online ? 'ok' : 'fail');
    });
  };

  return (
    <div className="settings-section">
      <h2>Conexion API</h2>
      <p className="section-desc">
        Configura el endpoint de la API de cupones.
        Estas variables se guardan localmente y sobreescriben los valores de build.
      </p>

      <div className="field-group">
        <label htmlFor="api-url">URL base</label>
        <input
          id="api-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/api"
        />
      </div>

      <div className="field-row">
        <div className="field-group">
          <label htmlFor="api-timeout">Timeout (ms)</label>
          <input
            id="api-timeout"
            type="number"
            value={timeout}
            onChange={(e) => setTimeout_(Number(e.target.value))}
            min={1000}
            max={60000}
            step={1000}
          />
        </div>
        <div className="field-group">
          <label htmlFor="api-retries">Reintentos</label>
          <input
            id="api-retries"
            type="number"
            value={retries}
            onChange={(e) => setRetries(Number(e.target.value))}
            min={0}
            max={10}
          />
        </div>
      </div>

      <div className="field-actions">
        <button className="btn-primary" onClick={handleSave}>Guardar</button>
        <button className="btn-secondary" onClick={handleTest} disabled={testing}>
          {testing ? 'Probando...' : 'Probar conexion'}
        </button>
        {testResult === 'ok' && <span className="test-ok">Conectado</span>}
        {testResult === 'fail' && <span className="test-fail">Sin conexion</span>}
      </div>
    </div>
  );
}
