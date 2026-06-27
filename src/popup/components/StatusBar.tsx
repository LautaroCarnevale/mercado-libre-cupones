interface StatusBarProps {
  status: 'checking' | 'online' | 'offline';
}

export function StatusBar({ status }: StatusBarProps) {
  const config = {
    checking: { label: 'Verificando...', className: 'status-checking' },
    online: { label: 'API conectada', className: 'status-online' },
    offline: { label: 'API offline', className: 'status-offline' },
  };

  const { label, className } = config[status];

  return (
    <div className={`status-bar ${className}`}>
      <span className="status-dot" />
      <span className="status-label">{label}</span>
    </div>
  );
}
