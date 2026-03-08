import ItemBox from "./ItemBox.tsx";
import type { ItemGridProps } from "../interfaces/ItemGridProps.ts";

export default function ItemGrid({
  items,
  quantities,
  onAdd,
  onQuantityChange,
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
        />
      ))}
    </div>
  );
}
