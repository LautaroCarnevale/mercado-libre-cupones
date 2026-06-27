import { useState } from 'react';
import type { UserSettings } from '../../types';

interface Props {
  settings: UserSettings;
  onSave: (updated: Partial<UserSettings>) => void;
}

export function CategoryPrefs({ settings, onSave }: Props) {
  const [categories, setCategories] = useState<string[]>(settings.favoriteCategories);
  const [newCat, setNewCat] = useState('');

  const addCategory = () => {
    const trimmed = newCat.trim().toLowerCase();
    if (trimmed && !categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      onSave({ favoriteCategories: updated });
      setNewCat('');
    }
  };

  const removeCategory = (cat: string) => {
    const updated = categories.filter((c) => c !== cat);
    setCategories(updated);
    onSave({ favoriteCategories: updated });
  };

  return (
    <div className="settings-section">
      <h2>Categorias favoritas</h2>
      <p className="section-desc">
        Define categorias prioritarias para filtrar cupones y habilitar auto-activacion selectiva.
      </p>

      <div className="field-group">
        <label htmlFor="new-category">Agregar categoria</label>
        <div className="input-with-btn">
          <input
            id="new-category"
            type="text"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="ej: tecnologia, hogar, indumentaria"
          />
          <button className="btn-add" onClick={addCategory}>+</button>
        </div>
      </div>

      <div className="tags-list">
        {categories.length === 0 ? (
          <p className="empty-hint">No hay categorias configuradas</p>
        ) : (
          categories.map((cat) => (
            <span key={cat} className="tag">
              {cat}
              <button className="tag-remove" onClick={() => removeCategory(cat)}>x</button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
