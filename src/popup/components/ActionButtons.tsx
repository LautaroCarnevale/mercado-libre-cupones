interface ActionButtonsProps {
  availableCount: number;
  activating: boolean;
  onActivateAll: () => void;
  onRefresh: () => void;
  onAutoApplyWeb: () => void;
}

export function ActionButtons({
  availableCount,
  activating,
  onActivateAll,
  onRefresh,
  onAutoApplyWeb,
}: ActionButtonsProps) {
  return (
    <div className="action-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <button
        className="btn-primary"
        onClick={onAutoApplyWeb}
        style={{
          background: '#FF9800',
          borderColor: '#E65100',
          color: '#FFFFFF',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(255,152,0,.25)',
        }}
      >
        🤖 Auto-aplicar Cupones (Web)
      </button>

      <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
        <button
          className="btn-primary"
          onClick={onActivateAll}
          disabled={activating || availableCount === 0}
          style={{ flex: 1 }}
        >
          {activating
            ? 'Activando...'
            : `Activar todos (${availableCount})`}
        </button>
        <button
          className="btn-secondary"
          onClick={onRefresh}
          disabled={activating}
          style={{ flex: 1 }}
        >
          Refrescar
        </button>
      </div>
    </div>
  );
}
