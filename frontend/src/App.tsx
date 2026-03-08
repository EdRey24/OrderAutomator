import { useState } from "react";
import type { Item } from "./interfaces/Item.ts";
import ItemGrid from "./components/ItemGrid.tsx";
import AddItemModal from "./components/AddItemModal.tsx";

const mockItems: Item[] = [
  {
    id: 1,
    name: "Test Apple",
    price: 0.99,
    pdf_text: "A crisp apple",
    color: "#FF0000",
  },
  {
    id: 2,
    name: "Test F",
    price: 9.99,
    pdf_text: "A crisp g",
    color: "#4F0060",
  },
];

export default function App() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const handleAdd = (id: number) => {
    setQuantities((prev) => ({ ...prev, [id]: 1 }));
  };

  const handleQuantityChange = (id: number, newQty: number) => {
    if (newQty <= 0) {
      // remove from order
      const { [id]: _, ...rest } = quantities;
      setQuantities(rest);
    } else {
      setQuantities((prev) => ({ ...prev, [id]: newQty }));
    }
  };

  const handleNewItem = (newItem: Omit<Item, "id">) => {
    console.log("New item submitted:", newItem);
    // Later, you'll replace this with a fetch to your backend
  };

  return (
    <>
      <ItemGrid
        items={mockItems}
        quantities={quantities}
        onAdd={handleAdd}
        onQuantityChange={handleQuantityChange}
      />
      <AddItemModal onSubmit={handleNewItem} />
    </>
  );
}
