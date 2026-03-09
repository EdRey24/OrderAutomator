import { useState, useEffect } from "react";
import type { ItemBoxProps } from "../interfaces/ItemBoxProps";

export default function ItemBox({
  item,
  quantity,
  onAdd,
  onQuantityChange,
  onEdit,
  onDelete,
}: ItemBoxProps) {
  const [inputValue, setInputValue] = useState<string>(quantity.toString());

  // Sync local state when quantity prop changes (e.g., from +/- buttons)
  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const boxStyle = {
    backgroundColor: "#f0f0f0", // fixed neutral color
    padding: "0.833vw",
    border: "1px solid #ccc",
    borderRadius: "4px",
    margin: "0.41vw",
    minWidth: "150px",
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onQuantityChange(item.id, parsed);
    } else {
      // revert to current quantity
      setInputValue(quantity.toString());
    }
  };

  return (
    <div style={boxStyle}>
      <button onClick={() => onEdit(item)} title="Edit item">
        ✎
      </button>
      <button onClick={() => onDelete(item.id)} title="Delete item">
        🗑
      </button>
      <h3>{item.name}</h3>
      <p>${item.price.toFixed(2)}</p>
      <p>{item.pdf_text}</p>
      {quantity === 0 ? (
        <button onClick={() => onAdd(item.id)}>Add to Order</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.41vw" }}>
          <button onClick={() => onQuantityChange(item.id, quantity - 1)}>
            -
          </button>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            min="0"
            style={{ width: "50px", textAlign: "center" }}
          />
          <button onClick={() => onQuantityChange(item.id, quantity + 1)}>
            +
          </button>
        </div>
      )}
    </div>
  );
}
