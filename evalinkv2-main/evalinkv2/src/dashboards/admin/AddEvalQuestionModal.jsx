import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddUserModal.css"; // Reusing the same modal styles

export default function AddEvalQuestionModal({ // Added showMessage prop
  onClose,
  onSuccess,
  categories,
  initialData,
}) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    category_id: initialData?.category_id || "",
    text: initialData?.text || "",
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        category_id: initialData.category_id,
        text: initialData.text,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.text.trim()) {
      alert("Please select a category and enter the question text.");
      return;
    }
    try {
      const apiUrl =
        import.meta.env.VITE_API_URL || "http://localhost:3001/evaluation-questions";
      let response;
      if (isEditMode) {
        response = await axios.put(`${apiUrl}/${initialData.id}`, formData);
      } else {
        response = await axios.post(apiUrl, formData);
      }
      alert(response.data.message || (isEditMode ? "Question updated successfully!" : "Question added successfully!"));
      onSuccess();
      onClose();
    } catch (error) {
      console.error(
        `Error ${isEditMode ? "updating" : "adding"} evaluation question:`,
        error
      );
      alert(
        error.response?.data?.error ||
          `Failed to ${isEditMode ? "update" : "add"} evaluation question.`
      );
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isEditMode ? "Edit Evaluation Question" : "Add Evaluation Question"}</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="category_id">Category</label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select a Category
              </option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="text">Question Text</label>
            <textarea
              id="text"
              name="text"
              value={formData.text}
              onChange={handleChange}
              required
              rows="3"
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              {isEditMode ? "Save Changes" : "Add Question"}
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
