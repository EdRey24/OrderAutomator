import { useEffect, useState } from "react";
import type { SettingsModalProps } from "../interfaces/SettingsModalProps";
import { API_BASE } from "../config";

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [formData, setFormData] = useState({
    port_code: "",
    vessel: "",
    country_of_export: "",
    marks_numbers: "",
    importer_first_name: "",
    importer_last_name: "",
    importer_address: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(`${API_BASE}/settings`)
        .then((res) => res.json())
        .then((data) => {
          setFormData({
            port_code: data.port_code || "",
            vessel: data.vessel || "",
            country_of_export: data.country_of_export || "",
            marks_numbers: data.marks_numbers || "",
            importer_first_name: data.importer_first_name || "",
            importer_last_name: data.importer_last_name || "",
            importer_address: data.importer_address || "",
          });
        })
        .catch((err) => console.error("Failed to load settings", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (formDataObj: FormData) => {
    const payload: Record<string, string> = {};
    for (const [key, value] of formDataObj.entries()) {
      payload[key] = value.toString();
    }

    setLoading(true);
    try {
      await fetch(`${API_BASE}/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onSave();
      onClose();
    } catch (err) {
      alert("Error saving sesttings: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Importer & Crossing Settings</h2>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <form action={handleSubmit}>
            <div className="form-field">
              <label>Port Code:</label>
              <input
                type="text"
                name="port_code"
                value={formData.port_code}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Vessel / Conveyance:</label>
              <input
                type="text"
                name="vessel"
                value={formData.vessel}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Country of Export:</label>
              <input
                type="text"
                name="country_of_export"
                value={formData.country_of_export}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Marks & Numbers:</label>
              <input
                type="text"
                name="marks_numbers"
                value={formData.marks_numbers}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Importer First Name:</label>
              <input
                type="text"
                name="importer_first_name"
                value={formData.importer_first_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Importer Last Name:</label>
              <input
                type="text"
                name="importer_last_name"
                value={formData.importer_last_name}
                onChange={handleChange}
              />
            </div>
            <div className="form-field">
              <label>Importer Address:</label>
              <input
                type="text"
                name="importer_address"
                value={formData.importer_address}
                onChange={handleChange}
              />
            </div>
            <div className="modal-actions">
              <button type="submit" disabled={loading}>
                Save
              </button>
              <button type="button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
