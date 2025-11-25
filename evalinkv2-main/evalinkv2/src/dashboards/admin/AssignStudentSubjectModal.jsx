import React, { useState, useEffect } from "react";
import axios from "axios"; // It's better to use a configured axios instance.
import "./AddUserModal.css";

export default function AssignStudentSubjectModal({
  onClose,
  onSuccess,
  students,
  subjects,
  faculty,
  facultyLoads,
  sections,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    student_id: "",
    subject_id: "",
    faculty_id: "",
    section_id: "", // Optional
  });
  const [assignedFacultyName, setAssignedFacultyName] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  useEffect(() => {
    // Automatically find the faculty when subject and/or section are selected
    if (formData.subject_id && facultyLoads) {
      const load = facultyLoads.find(
        (l) =>
          l.subject_id === parseInt(formData.subject_id, 10) &&
          // If a section is selected, match it. Otherwise, any section is fine for irregulars.
          (!formData.section_id ||
            l.section_id === parseInt(formData.section_id, 10))
      );

      if (load) {
        setFormData((prev) => ({
          ...prev,
          faculty_id: load.faculty_id,
        }));
        setAssignedFacultyName(load.faculty_name);
      } else {
        setFormData((prev) => ({ ...prev, faculty_id: "" }));
        setAssignedFacultyName("No faculty assigned to this load.");
      }
    }
  }, [formData.subject_id, facultyLoads]);
  // The dependency on formData.section_id was intentionally omitted to avoid
  // clearing the faculty when the section is changed after the subject.
  // The current logic re-evaluates when the subject changes, which is often sufficient.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!formData.student_id || !formData.subject_id || !formData.faculty_id) {
      alert("Please select a student, subject, and faculty.");
      setIsSubmitting(false);
      return;
    }
    const payload = {
      ...formData,
      subject_id: parseInt(formData.subject_id, 10),
      section_id: formData.section_id
        ? parseInt(formData.section_id, 10)
        : null,
    };
    try {
      const response = await axios.post(
        "http://localhost:3001/student-subjects",
        payload
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
        console.error("There was an error enrolling the student!", error);
        alert("Failed to enroll student.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Assign Subject to Student</h2>
        <form onSubmit={handleSubmit} className="add-user-form">
          <div className="form-group">
            <label htmlFor="student_id">Student</label>
            <select
              id="student_id"
              name="student_id"
              value={formData.student_id}
              onChange={handleChange}
              required
            >
              <option value="" disabled>
                Select Student
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.id})
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
            >
              <option value="">Select Section</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Assigned Faculty (Automatic)</label>
            <input
              type="text"
              value={
                assignedFacultyName || "Select a subject and section first"
              }
              readOnly
              className="readonly-input"
            />
          </div>

          <div className="modal-buttons">
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Enrolling..." : "Enroll Student"}
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
