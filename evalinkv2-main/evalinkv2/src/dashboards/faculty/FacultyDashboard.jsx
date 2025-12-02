import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // This was already here, which is good.
import axios from "axios";
import evalinkLogo from "../../assets/evalinklogo.png"; // Using evalinklogo for consistency
import "./FacultyDashboard.css";
import {
  FaUserCircle,
  FaTachometerAlt, // For Overview
  FaUsers, // For My Sections (or FaChalkboardTeacher)
  FaBook, // For subjects
  FaClipboardList, // For Student Evaluations
  FaHistory, // For Activity Log
  FaExclamationTriangle, // For Report Incident
  FaSignInAlt, // For Login activity
  FaSignOutAlt, // For Logout activity
  FaFilePdf, // For PDF download
  FaClipboardCheck, // For Evaluation
  FaCamera, // For upload button
} from "react-icons/fa";

export default function FacultyDashboard({ setUserRole }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sections, setSections] = useState([]);
  const [incidentReports, setIncidentReports] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [evaluationResults, setEvaluationResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Set to true initially
  const [error, setError] = useState(null);
  const [groupedSubjects, setGroupedSubjects] = useState({});
  const [faculty, setFaculty] = useState(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const facultyId = localStorage.getItem("userId");
    try {
      // Log the logout event to the database
      await axios.post("http://localhost:3001/activity-logs", {
        userId: facultyId,
        activityType: "logout",
        description: "User logged out.",
      });
    } catch (error) {
      console.error("Failed to log logout activity:", error);
    } finally {
      // Proceed with logout regardless of whether logging was successful
      if (setUserRole) setUserRole("");
      localStorage.removeItem("userId");
      navigate("/login");
    }
  };

  const fetchActivityLogs = () => {
    const facultyId = localStorage.getItem("userId");
    if (facultyId) {
      axios
        .get(`http://localhost:3001/users/${facultyId}/activity-logs`)
        .then((response) => {
          setActivityLogs(response.data);
        })
        .catch((error) =>
          console.error("Error fetching activity logs:", error)
        );
    }
  };

  const handleDownloadPdf = async () => {
    const facultyId = localStorage.getItem("userId");
    if (!facultyId) return;

    setIsLoading(true); // Use the existing loading state
    try {
      const response = await axios.get(
        `http://localhost:3001/faculty/${facultyId}/report/pdf`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `evaluation_report_${faculty?.name.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF report. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllData = () => {
    const facultyId = localStorage.getItem("userId");
    if (!facultyId) {
      navigate("/login");
      return;
    }

    setIsLoading(true);
    // Fetch faculty details
    axios
      .get(`http://localhost:3001/users/${facultyId}`)
      .then((response) => setFaculty(response.data))
      .catch((err) => console.error("Failed to fetch faculty details:", err));

    // Fetch sections and group them
    axios
      .get(`http://localhost:3001/users/${facultyId}/sections`)
      .then((response) => {
        const data = response.data;
        setSections(data);
        const grouped = data.reduce((acc, item) => {
          const { subject_id, subject_name, subject_code, section_name } = item;
          if (!acc[subject_id]) {
            acc[subject_id] = { subject_name, subject_code, sections: [] };
          }
          acc[subject_id].sections.push(section_name);
          return acc;
        }, {});
        setGroupedSubjects(grouped);
      })
      .catch((err) => console.error("Error fetching sections:", err));

    // Fetch evaluation results
    axios
      .get(`http://localhost:3001/faculty/${facultyId}/evaluations`)
      .then((response) => setEvaluationResults(response.data))
      .catch((err) => console.error("Error fetching evaluation results:", err));

    // Fetch incident reports
    axios
      .get(`http://localhost:3001/incidents/student/${facultyId}`)
      .then((response) => setIncidentReports(response.data))
      .catch((err) => console.error("Error fetching incident reports:", err))
      .finally(() => {
        setIsLoading(false); // Stop loading after all fetches are initiated
      });
  };

  useEffect(() => {
    const facultyId = localStorage.getItem("userId");

    if (!facultyId) {
      navigate("/login");
      return;
    }

    // Fetch all data on initial load
    fetchAllData();
    fetchActivityLogs(); // Fetch logs once on load

    // The dependency array is now based on the section, so it can refetch if needed.
  }, [activeSection, navigate]); // `activeSection` dependency re-fetches logs when tab changes

  // Helper function to determine progress bar color based on rating
  const getRatingColorClass = (rating) => {
    if (rating >= 4.0) return 'progress-bar-high';
    if (rating >= 2.5) return 'progress-bar-medium';
    return 'progress-bar-low';
  };

  return (
    <div className="faculty-dashboard">
      {/* ===== HEADER ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            ☰
          </button>
        </div>

        <div className="navbar-center">
          <div className="brand-text">
            <h1>Faculty Evaluation Portal</h1>
          </div>
        </div>

        <div className="navbar-right">
          <div className="profile-section">
            <button
              className="profile-icon"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {faculty && faculty.profile_image_url ? (
                <img
                  src={`http://localhost:3001${faculty.profile_image_url}`}
                  alt="Profile"
                  className="header-profile-picture"
                />
              ) : (
                <FaUserCircle size={28} />
              )}
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={() => setActiveSection("profile")}>
                  Profile
                </button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="dashboard-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          <button
            className={`sidebar-btn ${
              activeSection === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveSection("overview")}
          >
            <FaTachometerAlt />
            <span>Overview</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "sections" ? "active" : ""
            }`}
            onClick={() => setActiveSection("sections")}
          >
            <FaUsers />
            <span>My Sections</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "evaluations" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluations")}
          >
            <FaClipboardList />
            <span>Student Evaluations</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "report" ? "active" : ""
            }`}
            onClick={() => setActiveSection("report")}
          >
            <FaExclamationTriangle />
            <span>Report Incident</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "activity" ? "active" : ""
            }`}
            onClick={() => setActiveSection("activity")}
          >
            <FaHistory />
            <span>Activity Log</span>
          </button>
          <div className="sidebar-logo">
            <img src={evalinkLogo} alt="Evalink Logo" className="ustp-logo" />
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="dashboard-content">
          {/* ===== OVERVIEW ===== */}
          {activeSection === "overview" && (
            <section className="overview-section">
              <h2>Dashboard Overview</h2>
              <div className="overview-grid">
                <div
                  className="stat-card-faculty"
                  onClick={() => setActiveSection("sections")}
                >
                  <div className="stat-card-faculty-icon">
                    <FaBook />
                  </div>
                  <div className="stat-card-faculty-info">
                    <h4>Subjects Handled</h4>
                    <p>{Object.keys(groupedSubjects).length}</p>
                  </div>
                </div>
                <div
                  className="stat-card-faculty"
                  onClick={() => setActiveSection("evaluations")}
                >
                  <div className="stat-card-faculty-icon">
                    <FaClipboardCheck />
                  </div>
                  <div className="stat-card-faculty-info">
                    <h4>Evaluations Received</h4>
                    <p>{evaluationResults.length}</p>
                  </div>
                </div>
                <div
                  className="stat-card-faculty"
                  onClick={() => setActiveSection("report")}
                >
                  <div className="stat-card-faculty-icon">
                    <FaExclamationTriangle />
                  </div>
                  <div className="stat-card-faculty-info">
                    <h4>My Reports</h4>
                    <p>{incidentReports.length}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== MY SECTIONS ===== */}
          {activeSection === "sections" && (
            <section className="subjects-section">
              <h2>My Sections</h2>
              {isLoading ? (
                <p>Loading...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : Object.keys(groupedSubjects).length > 0 ? (
                <div className="subjects">
                  {Object.entries(groupedSubjects).map(([subjectId, data]) => (
                    <div key={subjectId} className="subject-card">
                      <h3>{data.subject_name}</h3>
                      <p className="subject-code">{data.subject_code}</p>
                      <div className="section-list">
                        <h4>Sections Handled:</h4>
                        <ul>
                          {data.sections.map((sectionName, index) => (
                            <li key={index}>{sectionName}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>You have not been assigned to any sections yet.</p>
              )}
            </section>
          )}

          {/* ===== STUDENT EVALUATIONS ===== */}
          {activeSection === "evaluations" && (
            <section className="evaluation-section">
              <h2>Student Evaluations</h2>
              <div className="evaluation-header">
                <button className="action-item-btn" onClick={handleDownloadPdf} disabled={isLoading}>
                  <FaFilePdf />
                  <span>{isLoading ? "Downloading..." : "Download PDF Report"}</span>
                </button>
              </div>

              {isLoading ? (
                <p>Loading evaluation results...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : evaluationResults.length > 0 ? (
                <div className="evaluation-list">
                  {evaluationResults.map((result) => (
                    <div key={result.subject_id} className="evaluation-card">
                      <h3>
                        {result.subject_name} ({result.subject_code})
                      </h3>
                      <div className="evaluation-summary">
                        <p>
                          Overall Average:{" "}
                          <strong>
                            {result.overall_average.toFixed(2)} / 5.00
                          </strong>
                        </p>
                        <p>
                          Total Respondents:{" "}
                          <strong>{result.total_evaluations}</strong>
                        </p>
                      </div>
                      {result.comments.length > 0 && (
                        <div className="comments-section">
                          <h4>Student Comments:</h4>
                          <ul>
                            {result.comments.map((comment, index) => (
                              <li key={index}>"{comment}"</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {/* Detailed Per-Question Results */}
                      {result.detailed_results && result.detailed_results.length > 0 && (
                        <div className="detailed-results-section">
                          <h4>Detailed Ratings per Question:</h4>
                          {result.detailed_results.map((category, catIndex) => (
                            <div key={catIndex} className="category-group">
                              <h5>{category.category_name}</h5>
                              <ul className="question-list">
                                {category.questions.map((q, qIndex) => (
                                  <li key={qIndex} className="question-item-new">
                                    <span className={`rating-badge ${getRatingColorClass(q.average_rating)}`}>
                                      {q.average_rating.toFixed(2)}
                                    </span>
                                    <span className="question-text-new">{q.question_text}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                      {!result.detailed_results && (
                        <p>No detailed results available.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No evaluation results found for your subjects yet.</p>
              )}
            </section>
          )}

          {/* ===== INCIDENT REPORT ===== */}
          {activeSection === "report" && (
            <section className="incident-section">
              <h2>Report an Incident</h2>
              <form
                className="incident-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const report = {
                    student_id: localStorage.getItem("userId"), // The reporter is the faculty
                    title: formData.get("title"),
                    description: formData.get("description"),
                  };
                  try {
                    const response = await axios.post(
                      "http://localhost:3001/incidents",
                      report
                    );
                    alert(response.data.message);
                    // Re-fetch incidents after successful submission
                    const facultyId = localStorage.getItem("userId");
                    const incidentsResponse = await axios.get(
                      `http://localhost:3001/incidents/student/${facultyId}`
                    );
                    fetchActivityLogs(); // Refresh logs after reporting
                    setIncidentReports(incidentsResponse.data);
                    e.target.reset();
                  } catch (error) {
                    console.error("Error submitting incident:", error);
                    alert(
                      error.response?.data?.error ||
                        "Failed to submit incident."
                    );
                  }
                }}
              >
                <label>Title</label>
                <input
                  name="title"
                  required
                  placeholder="e.g., Cheating in IT223 Exam"
                />
                <label>Description</label>
                <textarea
                  name="description"
                  required
                  placeholder="Describe the incident in detail, including student names if applicable."
                />
                <button type="submit" className="submit-incident-btn">
                  Submit Report
                </button>
              </form>

              <div className="incident-history">
                <h4>Your Report History</h4>
                {isLoading ? (
                  <p>Loading history...</p>
                ) : error ? (
                  <p className="error-message">{error}</p>
                ) : incidentReports.length > 0 ? (
                  incidentReports.map((r) => (
                    <div key={r.id} className="incident-item">
                      <span
                        className={`incident-item-status-label status-${r.status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {r.status}
                      </span>
                      <strong>{r.title}</strong> <em>{r.date}</em>
                      <p>{r.description}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-activity">
                    You have not submitted any reports yet.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {activeSection === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              {isLoading ? (
                <p>Loading activity...</p>
              ) : error ? (
                <p className="error-message">{error}</p>
              ) : activityLogs.length > 0 ? (
                <div className="activity-log-container">
                  {activityLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`activity-item ${log.activity_type}`}
                    >
                      <div className="activity-icon">
                        {{
                          login: <FaSignInAlt color="#28a745" />,
                          logout: <FaSignOutAlt color="#dc3545" />,
                          report_incident: (
                            <FaExclamationTriangle color="#ffc107" />
                          ),
                          update_profile: <FaUserCircle color="#6c757d" />,
                        }[log.activity_type] || <FaHistory color="#6c757d" />}
                      </div>
                      <div className="activity-details">
                        <span className="activity-type">{log.description}</span>
                        <span className="activity-time">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-activity">No activity logged yet.</p>
              )}
            </section>
          )}
          {activeSection === "profile" && (
            <section className="profile-section-content">
              {faculty ? (
                <>
                  <h2 className="profile-greeting">Hi, {faculty.name}!</h2>
                  <div className="profile-card-new">
                    <div className="profile-icon-new">
                      {faculty.profile_image_url ? (
                        <img
                          src={`http://localhost:3001${faculty.profile_image_url}`}
                          alt="Profile"
                          className="profile-picture-new"
                        />
                      ) : (
                        <FaUserCircle size={80} color="#1b1464" />
                      )}
                      <input
                        type="file"
                        id="profile-upload-faculty"
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append("profileImage", file);
                            try {
                              const response = await axios.post(
                                `http://localhost:3001/users/${faculty.id}/profile-image`,
                                formData
                              );
                              setFaculty((prev) => ({
                                ...prev,
                                profile_image_url: response.data.imageUrl,
                              }));
                              fetchActivityLogs(); // Refresh logs after update
                              alert("Profile image updated!");
                            } catch (error) {
                              console.error("Error uploading image:", error);
                              alert("Failed to upload image.");
                            }
                          }
                        }}
                      />
                      <button
                        className="upload-btn-new"
                        onClick={() =>
                          document
                            .getElementById("profile-upload-faculty")
                            .click()
                        }
                      >
                        <FaCamera />
                      </button>
                    </div>
                    <div className="profile-info-new">
                      <h3>{faculty.name}</h3>
                      <p>
                        <strong>ID:</strong> {faculty.id}
                      </p>
                      <p>
                        <strong>Department:</strong> {faculty.department_name}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <p>Loading profile...</p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
