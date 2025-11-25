import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddUserModal.css";

export default function AddDepartmentModal({ onClose, onSuccess, initialData, showMessage }) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
  });

  useEffect(() => {
    if (isEditMode) {
      setFormData({ name: initialData.name });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Department name cannot be empty.");
      return;
    }
    try {
      const apiUrl = "http://localhost:3001/departments";
      let response;
      if (isEditMode) {
        response = await axios.put(`${apiUrl}/${initialData.id}`, formData);
      } else {
        response = await axios.post(apiUrl, formData);
      }

      alert(response.data.message);
      onSuccess();
      onClose();
    } catch (error) {
      if (error.response?.data?.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        console.error("There was an error sending the data!", error);
        alert(`Failed to ${isEditMode ? "update" : "add"} department.`);
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isEditMode ? "Edit Department" : "Add New Department"}</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="name">Department Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              {isEditMode ? "Save Changes" : "Add Department"}
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
