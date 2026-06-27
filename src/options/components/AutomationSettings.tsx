import type { UserSettings } from '../../types';

interface Props {
  settings: UserSettings;
  onSave: (updated: Partial<UserSettings>) => void;
}

export function AutomationSettings({ settings, onSave }: Props) {
  const toggles: {
    key: keyof UserSettings;
    label: string;
    desc: string;
  }[] = [
    {
      key: 'autoAnalyzePage',
      label: 'Analizar pagina automaticamente',
      desc: 'Detecta categoria, producto y promociones al entrar a ML.',
    },
    {
      key: 'autoActivate',
      label: 'Activacion automatica',
      desc: 'Activa cupones al detectar categorias configuradas. Usar con cuidado.',
    },
    {
      key: 'showFloatingPanel',
      label: 'Panel flotante en pagina',
      desc: 'Muestra un boton flotante en las paginas de ML.',
    },
    {
      key: 'showNotifications',
      label: 'Notificaciones del sistema',
      desc: 'Muestra notificaciones al activar cupones.',
    },
  ];

  return (
    <div className="settings-section">
      <h2>Automatizacion</h2>
      <p className="section-desc">
        Controla el comportamiento automatico de la extension.
        La activacion automatica solo funciona con las categorias configuradas.
      </p>

      <div className="toggles-list">
        {toggles.map((t) => (
          <div key={t.key} className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-label">{t.label}</span>
              <span className="toggle-desc">{t.desc}</span>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={settings[t.key] as boolean}
                onChange={(e) => onSave({ [t.key]: e.target.checked })}
              />
              <span className="slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="field-group" style={{ marginTop: 20 }}>
        <label htmlFor="log-level">Nivel de log</label>
        <select
          id="log-level"
          value={settings.logLevel}
          onChange={(e) => onSave({ logLevel: e.target.value as UserSettings['logLevel'] })}
        >
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>
    </div>
  );
}
