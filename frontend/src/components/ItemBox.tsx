import { useState, useEffect } from "react";
import type { ItemBoxProps } from "../interfaces/ItemBoxProps";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getContrastText } from "../utils/contrast";

export default function ItemBox({
  item,
  quantity,
  onAdd,
  onQuantityChange,
  onEdit,
  onDelete,
  isOverlay,
}: ItemBoxProps) {
  const [inputValue, setInputValue] = useState<string>(quantity.toString());

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  // Sync local state when quantity prop changes (e.g., from +/- buttons)
  useEffect(() => {
    setInputValue(quantity.toString());
  }, [quantity]);

  const bgColor = item.bg_color || "#f0f0f0";
  const textColor = getContrastText(bgColor);

  const boxStyle = {
    backgroundColor: bgColor,
    color: textColor,
    padding: "0.833vw",
    border: "1px solid #ccc",
    borderRadius: "4px",
    margin: "0.41vw",
    minWidth: "150px",
    transform: isOverlay ? "scale(1.02)" : CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.5 : 1,
    boxShadow: isOverlay ? "0 10px 20px rgba(0,0,0,0.2)" : "none",
  };

  const handleBlur = () => {
    const parsed = parseInt(inputValue);
    if (!isNaN(parsed) && parsed >= 0) {
      onQuantityChange(item.id, parsed);
    } else {
      setInputValue(quantity.toString());
    }
  };

  return (
    <div ref={setNodeRef} style={boxStyle}>
      {!isOverlay && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "8px",
          }}
        >
          <button onClick={() => onEdit(item)} title="Edit item">
            ✎
          </button>
          <button onClick={() => onDelete(item.id)} title="Delete item">
            🗑
          </button>
          <div
            {...attributes}
            {...listeners}
            style={{ cursor: "grab", marginLeft: "auto", fontSize: "1.2rem" }}
          >
            ⠿
          </div>
        </div>
      )}

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
