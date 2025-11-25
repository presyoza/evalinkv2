import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AddUserModal.css";

export default function AddStudentModal({
  onClose,
  onSuccess,
  departments,
  sections,
  showMessage, // New prop
  initialData,
}) {
  const isEditMode = !!initialData;
  const [formData, setFormData] = useState({
    id: initialData?.id || "",
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    department_id: initialData?.department_id || "",
    year_level: initialData?.year_level || "",
    section_id: initialData?.section_id || "",
  });

  useEffect(() => {
    if (isEditMode) {
      // Don't pre-fill password for editing
      setFormData({
        id: initialData.id,
        name: initialData.name,
        email: initialData.email,
        password: "",
        department_id: initialData.department_id,
        year_level: initialData.year_level,
        section_id: initialData.section_id,
      });
    }
  }, [initialData, isEditMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData, role: "student" }; // Ensure role is set
    if (isEditMode && !payload.password) {
      delete payload.password; // Don't send empty password on update
    }

    try {
      const response = isEditMode ? await axios.put(`http://localhost:3001/users/${initialData.id}`, payload) : await axios.post("http://localhost:3001/users", payload);
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
        alert("Failed to connect to the server or add student.");
      }
    }
  };

  // Filter sections based on the selected department and year level
  const availableSections =
    formData.department_id && formData.year_level
      ? sections.filter(
          (section) =>
            section.department_id === parseInt(formData.department_id) &&
            section.year_level === parseInt(formData.year_level)
        )
      : sections; // Show all sections if department or year is not selected

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{isEditMode ? "Edit Student" : "Add New Student"}</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="id">Student ID</label>
            <input
              type="text"
              id="id"
              name="id"
              value={formData.id}
              onChange={handleChange}
              readOnly={isEditMode}
              required
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
              autoComplete="new-password" // Keep this for accessibility
            />
          </div>
          <div className="form-group">
            <label htmlFor="department_id">Department</label>
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
          <div className="form-group">
            <label htmlFor="year_level">Year Level</label>
            <select
              id="year_level"
              name="year_level"
              value={formData.year_level}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Year
              </option>
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
              <option value="4">4th Year</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="section_id">Section (Optional for Irregular)</label>
            <select
              id="section_id"
              name="section_id"
              value={formData.section_id}
              onChange={handleChange}
            >
              <option value="">Select Section</option>
              {availableSections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              {isEditMode ? "Save Changes" : "Add Student"}
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
