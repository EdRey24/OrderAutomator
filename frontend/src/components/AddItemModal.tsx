import { useState } from "react";
import type { AddItemModalProps } from "../interfaces/AddItemModalProps";

export default function AddItemModal({ onSubmit }: AddItemModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (formData: FormData) => {
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const pdfText = formData.get("pdfText") as string;
    const color = formData.get("color") as string;

    if (!name || !price || !pdfText || !color) {
      alert("All fields are required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Price must be a positive number");
      return;
    }

    onSubmit({
      name,
      price: priceNum,
      pdf_text: pdfText,
      color,
    });

    setIsOpen(false);
  };

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Cancel" : "Add New Item"}
      </button>

      {isOpen && (
        <form action={handleSubmit} style={{ marginTop: "1rem" }}>
          <div>
            <label>Name:</label>
            <input type="text" name="name" required />
          </div>

          <div>
            <label>Price:</label>
            <input type="number" step="0.01" min="0" name="price" required />
          </div>

          <div>
            <label>PDF Description:</label>
            <input type="text" name="pdfText" required />
          </div>

          <div>
            <label>Color:</label>
            <input type="color" name="color" defaultValue="#000000" required />
          </div>

          <button type="submit">Submit</button>
        </form>
      )}
    </div>
  );
}
