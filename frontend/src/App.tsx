import { useEffect, useState } from "react";
import type { Item } from "./interfaces/Item";
import ItemGrid from "./components/ItemGrid";
import AddItemModal from "./components/AddItemModal";

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/items")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = (id: number) => {
    setQuantities((prev) => ({ ...prev, [id]: 1 }));
  };

  const handleQuantityChange = (id: number, newQty: number) => {
    if (newQty <= 0) {
      const { [id]: _, ...rest } = quantities;
      setQuantities(rest);
    } else {
      setQuantities((prev) => ({ ...prev, [id]: newQty }));
    }
  };

  const handleAddItem = async (newItem: Omit<Item, "id">) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) throw new Error("Failed to add item");
      const createdItem = await response.json();
      setItems((prev) => [...prev, createdItem]);
    } catch (err) {
      alert("Error adding item: " + (err as Error).message);
    }
  };

  const handleFinishOrder = async () => {
    const orderItems = Object.entries(quantities).map(([id, qty]) => ({
      id: parseInt(id),
      quantity: qty,
    }));

    if (orderItems.length === 0) {
      alert("No items in order");
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:5000/api/finish_order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: orderItems }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to generate PDF: ${response.status} ${errorText}`,
        );
      }

      const blob = await response.blob();

      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const description = "CBP Form";

      const filename = `${dateStr}_${description}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error finishing order: " + (err as Error).message);
      console.error(err);
    }
  };

  return (
    <>
      <ItemGrid
        items={items}
        quantities={quantities}
        onAdd={handleAdd}
        onQuantityChange={handleQuantityChange}
      />
      <AddItemModal onSubmit={handleAddItem} />
      <button onClick={handleFinishOrder} style={{ marginTop: "1.6vw" }}>
        Finish Order
      </button>
    </>
  );
}
