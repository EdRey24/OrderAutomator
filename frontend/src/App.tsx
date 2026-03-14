import { useEffect, useState } from "react";
import type { Item } from "./interfaces/Item";
import ItemGrid from "./components/ItemGrid";
import AddItemModal from "./components/AddItemModal";
import EditItemModal from "./components/EditItemModal";
import { API_BASE } from "./config";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [arrivalDate, setArrivalDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/items`)
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
      const response = await fetch(`${API_BASE}/items`, {
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

  const handleEditItem = (item: Item) => {
    setEditingItem(item);
  };

  const handleUpdateItem = async (id: number, updated: Omit<Item, "id">) => {
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!response.ok) throw new Error("Failed to update item");
      const updatedItem = await response.json();
      setItems((prev) =>
        prev.map((item) => (item.id === id ? updatedItem : item)),
      );
      setEditingItem(null);
    } catch (err) {
      alert("Error updating item: " + (err as Error).message);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      const response = await fetch(`${API_BASE}/items/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (quantities[id] !== undefined) {
        const { [id]: _, ...rest } = quantities;
        setQuantities(rest);
      }
    } catch (err) {
      alert("Error deleting item: " + (err as Error).message);
    }
  };

  const handleReorder = async (orderedIds: number[]) => {
    try {
      setItems((prevItems) => {
        const itemMap = new Map(prevItems.map((item) => [item.id, item]));
        return orderedIds
          .map((id) => itemMap.get(id))
          .filter(Boolean) as Item[];
      });
      const response = await fetch(`${API_BASE}/items/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_ids: orderedIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }
    } catch (err) {
      alert("Error saving order: " + (err as Error).message);
    }
  };

  const handleFinishOrder = async () => {
    const orderItems = items
      .filter((item) => quantities[item.id] > 0)
      .map((item) => ({
        id: item.id,
        quantity: quantities[item.id],
      }));

    if (orderItems.length === 0) {
      alert("No items in order");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/finish_order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          arrival_date: arrivalDate,
        }),
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

  if (loading) return <div>Loading items...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <>
      <ItemGrid
        items={items}
        quantities={quantities}
        onAdd={handleAdd}
        onQuantityChange={handleQuantityChange}
        onEdit={handleEditItem}
        onDelete={handleDeleteItem}
        onReorder={handleReorder}
      />
      <AddItemModal onSubmit={handleAddItem} />

      <label htmlFor="arrivalDate">Arrival Date:</label>
      <input
        id="arrivalDate"
        type="date"
        value={arrivalDate}
        onChange={(e) => setArrivalDate(e.target.value)}
      />

      <button
        onClick={() => setShowSettings(true)}
        style={{ marginLeft: "10px" }}
      >
        Crossing Settings
      </button>

      <button onClick={handleFinishOrder} style={{ marginTop: "1.6vw" }}>
        Finish Order
      </button>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => {
          console.log("Settings saved");
        }}
      />

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleAddItem}
          onUpdate={handleUpdateItem}
        />
      )}
    </>
  );
}
