import type { EditItemModalProps } from "../interfaces/EditItemModalProps";

export default function EditItemModal({
  item,
  onClose,
  onSave,
  onUpdate,
}: EditItemModalProps) {
  const handleSubmit = (formData: FormData) => {
    const name = formData.get("name") as string;
    const price = formData.get("price") as string;
    const pdfText = formData.get("pdfText") as string;
    const htsus = formData.get("htsus") as string;

    if (!name || !price || !pdfText || !htsus) {
      alert("All fields are required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert("Price must be a positive number");
      return;
    }

    if (item) {
      onUpdate?.(item.id, { name, price: priceNum, pdf_text: pdfText, htsus });
    } else {
      onSave({ name, price: priceNum, pdf_text: pdfText, htsus });
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{item ? "Edit Item" : "Add new Item"}</h2>
        <form key={item?.id ?? "new"} action={handleSubmit}>
          <div>
            <label>Name:</label>
            <input
              type="text"
              name="name"
              defaultValue={item?.name || ""}
              required
            />
          </div>
          <div>
            <label>Price:</label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="price"
              defaultValue={item?.price?.toString() || ""}
              required
            />
          </div>
          <div>
            <label>PDF Description:</label>
            <input
              type="text"
              name="pdfText"
              defaultValue={item?.pdf_text || ""}
              required
            />
          </div>
          <div>
            <label>HTSUS:</label>
            <input
              type="text"
              name="htsus"
              defaultValue={item?.htsus || ""}
              required
            />
          </div>
          <div className="modal-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
