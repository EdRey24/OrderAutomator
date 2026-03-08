import type { ItemBoxProps } from "../interfaces/ItemBoxProps.ts";

export default function ItemBox({
  item,
  quantity,
  onAdd,
  onQuantityChange,
}: ItemBoxProps) {
  const boxStyle = {
    backgroundColor: item.color,
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "4px",
    margin: "0.5rem",
    minWidth: "150px",
  };

  return (
    <div style={boxStyle}>
      <h3>{item.name}</h3>
      <p>${item.price.toFixed(2)}</p>
      {quantity === 0 ? (
        <button onClick={() => onAdd(item.id)}>Add to Order</button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => onQuantityChange(item.id, quantity - 1)}>
            -
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const newQty = parseInt(e.target.value);
              if (!isNaN(newQty) && newQty >= 0) {
                onQuantityChange(item.id, newQty);
              }
            }}
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
