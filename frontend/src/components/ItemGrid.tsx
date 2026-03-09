import ItemBox from "./ItemBox";
import type { ItemGridProps } from "../interfaces/ItemGridProps";

export default function ItemGrid({
  items,
  quantities,
  onAdd,
  onQuantityChange,
  onEdit,
  onDelete,
}: ItemGridProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" }}>
      {items.map((item) => (
        <ItemBox
          key={item.id}
          item={item}
          quantity={quantities[item.id] || 0}
          onAdd={onAdd}
          onQuantityChange={onQuantityChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
