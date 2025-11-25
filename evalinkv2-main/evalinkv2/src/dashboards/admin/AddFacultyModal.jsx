import React, { useState, useEffect } from "react";
import axios from "axios"; // Import axios
import "./AddUserModal.css";

export default function AddFacultyModal({ onClose, onSuccess, departments, initialData, showMessage }) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    department_id: initialData?.department_id || "",
  });

  useEffect(() => {
    if (isEditMode) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        email: initialData.email,
        password: "",
        department_id: initialData.department_id,
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, role: "faculty" };
    if (isEditMode && !payload.password) {
      delete payload.password; // Don't send empty password on update
    }

    try {
      const response = isEditMode
        ? await axios.put(`http://localhost:3001/users/${initialData.id}`, payload)
        : await axios.post("http://localhost:3001/users", payload);
      if (response.data.message) {
        alert(response.data.message);
        onSuccess();
        onClose();
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        console.error("There was an error sending the data!", error);
        alert("Failed to connect to the server or add faculty.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isEditMode ? "Edit Faculty" : "Add New Faculty"}</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="id">Faculty ID / Number</label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              readOnly={isEditMode}
              required
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password {isEditMode && "(Leave blank to keep current)"}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required={!isEditMode}
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="department">Department</label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Department
              </option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              {isEditMode ? "Save Changes" : "Add Faculty"}
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
