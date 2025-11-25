import React, { useState } from "react";
import axios from "axios";
import "./AddUserModal.css";

export default function AssignLoadModal({
  onClose,
  onSuccess,
  faculty,
  subjects,
  sections,
}) {
  const [formData, setFormData] = useState({
    faculty_id: "",
    subject_id: "",
    section_id: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.faculty_id || !formData.subject_id || !formData.section_id) {
      alert("Please select a faculty, subject, and section.");
      return;
    }
    try {
      const response = await axios.post(
        "http://localhost:3001/faculty-loads",
        formData
      );
      if (response.data.message) {
        alert(response.data.message);
        onSuccess();
        onClose();
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        alert(`Error: ${error.response.data.error}`);
      } else {
        console.error("There was an error assigning the load!", error);
        alert("Failed to assign faculty load.");
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Assign Teaching Load</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="faculty_id">Faculty</label>
            <select
              id="faculty_id"
              name="faculty_id"
              value={formData.faculty_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Faculty
              </option>
              {faculty.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="subject_id">Subject</label>
            <select
              id="subject_id"
              name="subject_id"
              value={formData.subject_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Subject
              </option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="section_id">Section</label>
            <select
              id="section_id"
              name="section_id"
              value={formData.section_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Section
              </option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-buttons">
            <button type="submit" className="submit-btn">
              Assign Load
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
