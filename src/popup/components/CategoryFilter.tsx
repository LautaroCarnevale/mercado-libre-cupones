import type { CategoryInfo } from '../../types';

interface CategoryFilterProps {
  categories: CategoryInfo[];
  selected: string;
  onSelect: (category: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <button
        className={`filter-chip ${selected === '' ? 'active' : ''}`}
        onClick={() => onSelect('')}
      >
        Todos
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          className={`filter-chip ${selected === cat.slug ? 'active' : ''}`}
          onClick={() => onSelect(cat.slug)}
        >
          {cat.name}
          <span className="chip-count">{cat.couponCount}</span>
        </button>
      ))}
    </div>
  );
}
