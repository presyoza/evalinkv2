import React, { useState, useEffect } from "react";
import "./StudentDashboard.css";
import axios from "axios";
import EvaluateInstructor from "./EvaluateInstructor";
import evalinkLogo from "../../assets/evalinklogo.png"; // Corrected path
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaTachometerAlt, // For Overview
  FaBook, // For Subjects
  FaExclamationTriangle, // For Report
  FaHistory, // For Activity Log
  FaSignInAlt, // For Login activity
  FaSignOutAlt, // For Logout activity
  FaClipboardCheck, // For Evaluation
  FaCamera, // For upload button
} from "react-icons/fa";

export default function StudentDashboard({ setUserRole }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const [incidentReports, setIncidentReports] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [evaluatedSubjects, setEvaluatedSubjects] = useState([]);
  const [isEvaluationOpen, setIsEvaluationOpen] = useState(false);
  const [evaluationScheduleMessage, setEvaluationScheduleMessage] = useState("");

  const fetchSubjects = () => {
    const studentId = localStorage.getItem("userId");
    if (studentId) {
      axios
        .get(`http://localhost:3001/users/${studentId}/subjects`)
        .then((response) => {
          setSubjects(response.data);
        })
        .catch((error) => console.error("Error fetching subjects:", error));
    }
  };

  const fetchEvaluatedSubjects = () => {
    const studentId = localStorage.getItem("userId");
    if (studentId) {
      axios
        .get(`http://localhost:3001/students/${studentId}/evaluated-subjects`)
        .then((response) => {
          setEvaluatedSubjects(response.data);
        })
        .catch((error) =>
          console.error("Error fetching evaluated subjects:", error)
        );
    }
  };

  const fetchIncidents = () => {
    const studentId = localStorage.getItem("userId");
    if (studentId) {
      axios
        .get(`http://localhost:3001/incidents/student/${studentId}`)
        .then((response) => {
          setIncidentReports(response.data);
        })
        .catch((error) => console.error("Error fetching incidents:", error));
    }
  };

  const fetchActivityLogs = () => {
    const studentId = localStorage.getItem("userId");
    if (studentId) {
      axios
        .get(`http://localhost:3001/users/${studentId}/activity-logs`)
        .then((response) => {
          setActivityLogs(response.data);
        })
        .catch((error) =>
          console.error("Error fetching activity logs:", error)
        );
    }
  };

  useEffect(() => {
    const studentId = localStorage.getItem("userId");

    if (studentId) {
      // Fetch student details
      axios
        .get(`http://localhost:3001/users/${studentId}`)
        .then((response) => {
          setStudent(response.data);
        })
        .catch((error) => console.error("Error fetching student data:", error));

      // Fetch enrolled subjects
      fetchSubjects();
      fetchEvaluatedSubjects();
      fetchIncidents();
      fetchActivityLogs();

      // Fetch evaluation schedule to determine if evaluations are open
      axios
        .get("http://localhost:3001/evaluation-schedule")
        .then((response) => {
          const { start_date, end_date } = response.data;
          if (start_date && end_date) {
            const now = new Date();
            const start = new Date(start_date);
            const end = new Date(end_date);

            if (now >= start && now <= end) {
              setIsEvaluationOpen(true);
              setEvaluationScheduleMessage(`Evaluation is open until ${end.toLocaleString()}.`);
            } else if (now < start) {
              setIsEvaluationOpen(false);
              setEvaluationScheduleMessage(`Evaluation will open on ${start.toLocaleString()}.`);
            } else {
              setIsEvaluationOpen(false);
              setEvaluationScheduleMessage("The evaluation period has ended.");
            }
          } else {
            setIsEvaluationOpen(false); // If no schedule is set, it's closed.
            setEvaluationScheduleMessage("The evaluation period has not been set by the administrator.");
          }
        })
        .catch((error) => {
          console.error("Error fetching evaluation schedule:", error);
          setIsEvaluationOpen(false); // Default to closed on error
          setEvaluationScheduleMessage("Could not load evaluation schedule. Please contact support.");
        });
    }
  }, []);

  const handleLogout = async () => {
    const studentId = localStorage.getItem("userId");
    try {
      // Log the logout event to the database
      await axios.post("http://localhost:3001/activity-logs", {
        userId: studentId,
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

  return (
    <div className="student-dashboard">
      {/* ===== HEADER ===== */}
      <nav className="navbar">
        <div className="navbar-left">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        <div className="navbar-center">
          <div className="brand-text">
            <h1>Student Evaluation Portal</h1>
          </div>
        </div>

        <div className="navbar-right">
          <div className="profile-section">
            <button
              className="profile-icon"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              {student && student.profile_image_url ? (
                <img
                  src={`http://localhost:3001${student.profile_image_url}`}
                  alt="Profile"
                  className="header-profile-picture"
                />
              ) : (
                <FaUserCircle size={28} />
              )}
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={() => setActiveTab("profile")}>Profile</button>
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="dashboard-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
          <button
            className={`sidebar-btn ${
              activeTab === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <FaTachometerAlt />
            <span>Overview</span>
          </button>
          <button
            className={`sidebar-btn ${
              activeTab === "subjects" ? "active" : ""
            }`}
            onClick={() => setActiveTab("subjects")}
          >
            <FaBook />
            <span>Enrolled Subjects</span>
          </button>
          <button
            className={`sidebar-btn ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            <FaExclamationTriangle />
            <span>Report</span>
          </button>
          <button
            className={`sidebar-btn ${
              activeTab === "activity" ? "active" : ""
            }`}
            onClick={() => setActiveTab("activity")}
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
          {activeTab === "overview" && (
            <section className="overview-section">
              <h2>Dashboard Overview</h2>
              <div className="overview-grid">
                <div
                  className="stat-card-student"
                  onClick={() => setActiveTab("subjects")}
                >
                  <div className="stat-card-student-icon">
                    <FaBook />
                  </div>
                  <div className="stat-card-student-info">
                    <h4>Enrolled Subjects</h4>
                    <p>{subjects.length}</p>
                  </div>
                </div>
                <div
                  className="stat-card-student"
                  onClick={() => setActiveTab("subjects")}
                >
                  <div className="stat-card-student-icon">
                    <FaClipboardCheck />
                  </div>
                  <div className="stat-card-student-info">
                    <h4>Evaluations to Do</h4>
                    <p>{subjects.length - evaluatedSubjects.length}</p>
                  </div>
                </div>
                <div
                  className="stat-card-student"
                  onClick={() => setActiveTab("report")}
                >
                  <div className="stat-card-student-icon">
                    <FaExclamationTriangle />
                  </div>
                  <div className="stat-card-student-info">
                    <h4>My Reports</h4>
                    <p>{incidentReports.length}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===== SUBJECTS ===== */}
          {activeTab === "subjects" && (
            <section className="subjects-section">
              <h2>Enrolled Subjects</h2>
              {evaluationScheduleMessage && (
                <p className={`schedule-message ${isEvaluationOpen ? 'open' : 'closed'}`}>{evaluationScheduleMessage}</p>
              )}
              <div className="subjects">
                {subjects.map((subject) => {
                  const isEvaluated = evaluatedSubjects.includes(subject.id);
                  const canEvaluate = !isEvaluated && isEvaluationOpen;
                  return (
                    <div key={subject.id} className="subject-card">
                      <h3>{subject.name}</h3>
                      <p>
                        Instructor: {subject.faculty_name || "Not Assigned"}
                      </p>
                      <button
                        className={`evaluate-btn ${!canEvaluate ? "disabled" : ""}`}
                        onClick={() =>
                          canEvaluate && setSelectedSubject(subject)
                        }
                        disabled={!canEvaluate}
                      >
                        {isEvaluated ? "Evaluated" : (isEvaluationOpen ? "Evaluate" : "Evaluation Closed")}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===== INCIDENT REPORT ===== */}
          {activeTab === "report" && (
            <section className="incident-section">
              <h2>Incident Report</h2>
              <form
                className="incident-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const report = {
                    student_id: localStorage.getItem("userId"),
                    title: formData.get("title"),
                    description: formData.get("description"),
                  };
                  try {
                    const response = await axios.post(
                      "http://localhost:3001/incidents",
                      report
                    );
                    fetchActivityLogs(); // Refresh logs after reporting
                    alert(response.data.message);
                    fetchIncidents(); // Refresh the list from the database
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
                  placeholder="Enter incident title"
                />
                <label>Description</label>
                <textarea
                  name="description"
                  required
                  placeholder="Describe the incident"
                ></textarea>
                <button type="submit" className="submit-incident-btn">
                  Submit Report
                </button>
              </form>

              <div className="incident-history">
                <h4>Report History</h4>
                {incidentReports.length > 0 ? (
                  incidentReports.map((r, i) => (
                    <div key={r.id || i} className="incident-item">
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
                  <p className="no-activity">No reports submitted yet.</p>
                )}
              </div>
            </section>
          )}

          {/* ===== ACTIVITY LOG ===== */}
          {activeTab === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              <div className="activity-log-container">
                {activityLogs.length > 0 ? (
                  activityLogs.map((log, index) => (
                    <div
                      key={index}
                      className={`activity-item ${log.activity_type}`}
                    >
                      <div className="activity-icon">
                        {
                          {
                            login: <FaSignInAlt color="#28a745" />,
                            logout: <FaSignOutAlt color="#dc3545" />,
                            evaluation: <FaClipboardCheck color="#007bff" />,
                            report_incident: (
                              <FaExclamationTriangle color="#ffc107" />
                            ),
                            update_profile: <FaUserCircle color="#6c757d" />,
                          }[log.activity_type] || (
                            <FaHistory color="#6c757d" />
                          ) /* Default icon */
                        }
                      </div>
                      <div className="activity-details">
                        <span className="activity-type">{log.description}</span>
                        <span className="activity-time">{log.timestamp}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-activity">No activity logged yet.</p>
                )}
              </div>
            </section>
          )}

          {/* ===== PROFILE PAGE ===== */}
          {activeTab === "profile" && (
            <section className="profile-section-content">
              {student ? (
                <>
                  <h2 className="profile-greeting">
                    {" "}
                    {/* This was the cause of the error */}
                    Hi, {student.name.split(" ")[0]}!
                  </h2>
                  <div className="profile-card-new">
                    <div
                      className="profile-icon-new"
                      style={{ position: "relative" }}
                    >
                      {student.profile_image_url ? (
                        <img
                          src={`http://localhost:3001${student.profile_image_url}`}
                          alt="Profile"
                          className="profile-picture-new"
                        />
                      ) : (
                        <FaUserCircle size={80} color="#1b1464" />
                      )}
                      <input
                        type="file"
                        id="profile-upload"
                        style={{ display: "none" }}
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append("profileImage", file);
                            try {
                              const response = await axios.post(
                                `http://localhost:3001/users/${student.id}/profile-image`,
                                formData
                              );
                              fetchActivityLogs(); // Refresh logs after update
                              // Update student state to show new image instantly
                              setStudent((prev) => ({
                                ...prev,
                                profile_image_url: response.data.imageUrl,
                              }));
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
                          document.getElementById("profile-upload").click()
                        }
                      >
                        <FaCamera />
                      </button>
                    </div>
                    <div className="profile-info-new">
                      <h3>{student.name}</h3>
                      <p>
                        <strong>ID:</strong> {student.id}
                      </p>
                      <p>
                        <strong>Year:</strong> {student.year_level}
                      </p>
                      <p>
                        <strong>Department:</strong> {student.department_name}
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
      {/* ===== EVALUATION MODAL ===== */}
      {selectedSubject && (
        <EvaluateInstructor
          subject={selectedSubject}
          onClose={() => setSelectedSubject(null)}
          onSuccess={() => {
            fetchSubjects();
            fetchEvaluatedSubjects(); // Re-fetch evaluated subjects after a successful submission
            fetchActivityLogs(); // Refresh logs after evaluation
          }}
        />
      )}
    </div>
  );
}
