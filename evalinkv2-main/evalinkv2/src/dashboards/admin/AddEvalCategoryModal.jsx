import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddUserModal.css"; // Reusing the same modal styles

export default function AddEvalCategoryModal({ onClose, onSuccess, initialData }) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    display_order: initialData?.display_order || 0,
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        display_order: initialData.display_order,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Category name cannot be empty.");
      return;
    }
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3001/evaluation-categories";
      let response;
      if (isEditMode) {
        response = await axios.put(`${apiUrl}/${initialData.id}`, formData);
      } else {
        response = await axios.post(apiUrl, formData);
      }
      alert(response.data.message || (isEditMode ? "Category updated successfully!" : "Category added successfully!"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "adding"} evaluation category:`,
        error
      );
      alert(
        error.response?.data?.error ||
          `Failed to ${isEditMode ? "update" : "add"} evaluation category.`
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>
          {isEditMode ? "Edit Evaluation Category" : "Add Evaluation Category"}
        </h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="name">Category Name (e.g., A. Commitment)</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          {/* You can add display_order input if needed */}
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              {isEditMode ? "Save Changes" : "Add Category"}
            </button>
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
