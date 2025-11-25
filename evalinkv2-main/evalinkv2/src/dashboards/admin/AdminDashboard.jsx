import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AddStudentModal from "./AddStudentModal";
import AddFacultyModal from "./AddFacultyModal";
import AddDepartmentModal from "./AddDepartmentModal"; // Import the new modal
import AddSectionModal from "./AddSectionModal";
import AddSubjectModal from "./AddSubjectModal";
import AssignLoadModal from "./AssignLoadModal"; // Import the new assignment modal
import AssignStudentSubjectModal from "./AssignStudentSubjectModal";
import AddEvalCategoryModal from "./AddEvalCategoryModal"; // Import new modal
import EvaluationSettings from "./EvaluationSettings"; // Import the new settings component
import AddEvalQuestionModal from "./AddEvalQuestionModal"; // Import new modal
import axios from "axios";
import evalinkLogo from "../../assets/evalinklogo.png";
import "./AdminDashboard.css";
import {
  FaUserCircle,
  FaTachometerAlt,
  FaClipboardCheck,
  FaChartBar,
  FaExclamationCircle,
  FaHistory,
  FaEdit, // Added for edit functionality
  FaBook, // Icon for assigning subjects
  FaUserPlus,
  FaChalkboardTeacher,
  FaBuilding,
  FaUsers,
  FaBookOpen,
  FaClipboardList,
  FaUserGraduate,
  FaCog, // Icon for Settings
  FaUsersCog, // New icon for User Management
  FaQuestionCircle, // Icon for Evaluation Management
  FaTrash,
  FaPlus,
  FaHourglassHalf, // Icon for Pending
  FaSearch, // Icon for Investigation
  FaCheckCircle as FaCheckCircleSolid, // Using solid version for Resolved
  FaSignInAlt, // For Login activity
  FaSignOutAlt, // For Logout activity
  FaExclamationTriangle, // For Incident reports
  FaFilePdf, // For PDF download
} from "react-icons/fa";

const statusIcons = {
  Pending: <FaHourglassHalf />,
  "Under Investigation": <FaSearch />,
  Resolved: <FaCheckCircleSolid />,
};

const STATUS_ORDER = ["Pending", "Under Investigation", "Resolved"];

export default function AdminDashboard({ setUserRole }) {
  const [activeSection, setActiveSection] = useState(
    localStorage.getItem("adminActiveSection") || "overview"
  );
  const [userManagementTab, setUserManagementTab] = useState("students");

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [showAddDepartmentModal, setShowAddDepartmentModal] = useState(false); // State for the new modal
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAssignLoadModal, setShowAssignLoadModal] = useState(false);
  const [showAssignStudentSubjectModal, setShowAssignStudentSubjectModal] =
    useState(false);
  const [showAddEvalCategoryModal, setShowAddEvalCategoryModal] =
    useState(false);
  const [showAddEvalQuestionModal, setShowAddEvalQuestionModal] =
    useState(false);

  // State for editing and assigning
  const [editingEntity, setEditingEntity] = useState(null);
  // const [assigningEntity, setAssigningEntity] = useState(null); // Placeholder for assignment modal
  const [evaluations, setEvaluations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [facultyLoads, setFacultyLoads] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);

  // Pagination states
  // (Assuming you will create a modal for adding/editing questions, similar to the others)
  const [evaluationQuestions, setEvaluationQuestions] = useState([]);

  // Pagination states
  const [studentsPage, setStudentsPage] = useState(1);
  const [facultyPage, setFacultyPage] = useState(1);
  const [departmentsPage, setDepartmentsPage] = useState(1);
  const [facultyLoadsPage, setFacultyLoadsPage] = useState(1);
  const [studentSubjectsPage, setStudentSubjectsPage] = useState(1);
  const [sectionsPage, setSectionsPage] = useState(1);
  const [subjectsPage, setSubjectsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchStudents = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/users?role=student"
      );
      setStudents(response.data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  // State for sorting
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  // State for filtering (example for students)
  const [studentFilter, setStudentFilter] = useState({
    department: "",
    year: "",
  });
  const fetchFaculty = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/users?role=faculty"
      );
      setFaculty(response.data);
    } catch (error) {
      console.error("Error fetching faculty:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await axios.get("http://localhost:3001/departments");
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get("http://localhost:3001/sections");
      setSections(response.data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await axios.get("http://localhost:3001/subjects");
      setSubjects(response.data);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchFacultyLoads = async () => {
    try {
      const response = await axios.get("http://localhost:3001/faculty-loads");
      setFacultyLoads(response.data);
    } catch (error) {
      console.error("Error fetching faculty loads:", error);
    }
  };

  const fetchStudentSubjects = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/student-subjects"
      );
      setStudentSubjects(response.data);
    } catch (error) {
      console.error("Error fetching student subjects:", error);
    }
  };

  const fetchEvaluationQuestions = async () => {
    try {
      const response = await axios.get(
        "http://localhost:3001/evaluation-questions"
      );
      setEvaluationQuestions(response.data);
    } catch (error) {
      console.error("Error fetching evaluation questions:", error);
    }
  };

  const fetchAdminEvaluations = async () => {
    // This now fetches the new aggregated data
    try {
      const response = await axios.get(
        "http://localhost:3001/admin/evaluations/aggregated"
      );
      setEvaluations(response.data); // The state now holds aggregated data per faculty
    } catch (error) {
      console.error("Error fetching evaluation reports:", error);
    }
  };

  const fetchIncidents = async () => {
    try {
      const response = await axios.get("http://localhost:3001/incidents");
      setIncidents(response.data);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
  };

  const fetchAdminActivityLogs = async () => {
    try {
      const response = await axios.get("http://localhost:3001/activity-logs");
      setActivityLogs(response.data);
    } catch (error) {
      console.error("Error fetching admin activity logs:", error);
    }
  };
  // Helper function to determine rating badge color
  const getRatingColorClass = (rating) => {
    if (rating >= 4.0) return "progress-bar-high";
    if (rating >= 2.5) return "progress-bar-medium";
    return "progress-bar-low";
  };

  const requestSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return;
    return sortConfig.direction === "ascending" ? " ▲" : " ▼";
  };

  // Unified success handler for modals
  const handleSuccess = (type) => {
    switch (type) {
      case "student":
        fetchStudents();
        break;
      case "faculty":
        fetchFaculty();
        break;
      case "department":
        fetchDepartments();
        break;
      case "section":
        fetchSections();
        break;
      case "subject":
        fetchSubjects();
        break;
      case "faculty-load":
        fetchFacultyLoads();
        break;
      case "student-subject":
        fetchStudentSubjects();
        break;
      case "evaluation-category":
        fetchEvaluationQuestions(); // Refresh the whole list
        break;
      case "evaluation-question":
        fetchEvaluationQuestions();
        break;
      case "evaluation-report":
        fetchAdminEvaluations();
        break;
      case "activity-log":
        fetchAdminActivityLogs();
        break;
      default:
        break;
    }
    // Close any open modals
    setEditingEntity(null);
    setShowAddStudentModal(false);
    setShowAddFacultyModal(false);
    setShowAddDepartmentModal(false);
    setEditingEntity(null); // Close any editing modal
    setShowAddSectionModal(false);
    setShowAddSubjectModal(false);
    setShowAssignLoadModal(false);
    setShowAssignStudentSubjectModal(false);
    setShowAddEvalCategoryModal(false);
    setShowAddEvalQuestionModal(false);
  };


  const handleEdit = (type, entity) => {
    setEditingEntity({ type, data: entity });
  };

  const handleAssignSubjects = (user, role) => {
    if (role === "student") {
      setShowAssignStudentSubjectModal(true);
    } else if (role === "faculty") {
      // This opens the general faculty load assignment.
      // A more advanced version could pre-fill the faculty member.
      setShowAssignLoadModal(true);
    }
  };
  const handleDelete = async (type, id) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        if (type === "student" || type === "faculty") {
          await axios.delete(`http://localhost:3001/users/${id}`);
        } else if (type === "faculty-load") {
          await axios.delete(`http://localhost:3001/faculty-loads/${id}`);
        } else if (type === "student-subject") {
          await axios.delete(`http://localhost:3001/student-subjects/${id}`);
        } else {
          await axios.delete(`http://localhost:3001/${type}s/${id}`);
        }
        // Use the unified success handler to refresh only the relevant list
        handleSuccess(type);
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        if (
          error.response &&
          error.response.data &&
          error.response.data.error
        ) {
          alert(`Failed to delete ${type}: ${error.response.data.error}`);
        } else {
          alert(`An error occurred while deleting the ${type}.`);
        }
      }
    }
  };

  const handleEditQuestion = (question) => {
    setEditingEntity({ type: "evaluation-question", data: question });
  };

  const handleDeleteQuestion = async (id) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:3001";
        await axios.delete(`${apiUrl}/evaluation-questions/${id}`);
        alert("Question deleted successfully.");
        fetchEvaluationQuestions(); // Refresh the list
      } catch (error) {
        console.error("Error deleting evaluation question:", error);
        alert(error.response?.data?.error || "Failed to delete question.");
      }
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category? This will also delete all questions within it.")) {
      try {
        const apiUrl =
          import.meta.env.VITE_API_URL || "http://localhost:3001";
        await axios.delete(`${apiUrl}/evaluation-categories/${id}`);
        alert("Category deleted successfully.");
        fetchEvaluationQuestions(); // Refresh the list
      } catch (error) {
        console.error("Error deleting evaluation category:", error);
        alert(error.response?.data?.error || "Failed to delete category.");
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await axios.patch(
        `http://localhost:3001/incidents/${id}`,
        {
          status: newStatus,
        }
      );
      alert(response.data.message);

      if (newStatus === "Resolved") {
        // Immediately remove the resolved incident from the view
        setIncidents((prev) => prev.filter((incident) => incident.id !== id));
      } else {
        fetchIncidents(); // Re-fetch for other status changes
      }
    } catch (error) {
      console.error("Error updating incident status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const handleLogout = () => {
    if (setUserRole) {
      setUserRole("");
    }
    navigate("/login");
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await axios.get('http://localhost:3001/evaluations/report/pdf', {
        responseType: 'blob', // Important: tell axios to expect a binary blob
      });

      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'evaluation_report.pdf'); // Set the filename
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); // Clean up the URL object
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF report. Please try again.");
    }
  };

  useEffect(() => {
    // Save the active section to localStorage whenever it changes
    localStorage.setItem("adminActiveSection", activeSection);
  }, [activeSection]);

  // Apply sorting logic to data before pagination
  const sortedStudents = [...students].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedFaculty = [...faculty].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedDepartments = [...departments].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedSections = [...sections].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedSubjects = [...subjects].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedFacultyLoads = [...facultyLoads].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  const sortedStudentSubjects = [...studentSubjects].sort((a, b) => {
    if (sortConfig.key) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
    }
    return 0;
  });

  useEffect(() => {
    // Fetch all user management data when the component mounts
    fetchDepartments();
    fetchStudents();
    fetchFaculty();
    fetchSections();
    fetchSubjects();
    fetchFacultyLoads();
    fetchStudentSubjects();
    fetchEvaluationQuestions();
    fetchAdminEvaluations(); // Fetch evaluations on initial load
    fetchIncidents(); // Fetch incidents on initial load
    fetchAdminActivityLogs(); // Fetch all activity logs
  }, []);

  // Pagination logic
  const paginatedStudents = sortedStudents.slice(
    (studentsPage - 1) * ITEMS_PER_PAGE,
    studentsPage * ITEMS_PER_PAGE
  );
  const totalStudentPages = Math.ceil(sortedStudents.length / ITEMS_PER_PAGE);

  const paginatedFaculty = sortedFaculty.slice(
    (facultyPage - 1) * ITEMS_PER_PAGE,
    facultyPage * ITEMS_PER_PAGE
  );
  const totalFacultyPages = Math.ceil(sortedFaculty.length / ITEMS_PER_PAGE);

  const paginatedDepartments = sortedDepartments.slice(
    (departmentsPage - 1) * ITEMS_PER_PAGE,
    departmentsPage * ITEMS_PER_PAGE
  );
  const totalDepartmentPages = Math.ceil(
    sortedDepartments.length / ITEMS_PER_PAGE
  );

  const paginatedFacultyLoads = sortedFacultyLoads.slice(
    (facultyLoadsPage - 1) * ITEMS_PER_PAGE,
    facultyLoadsPage * ITEMS_PER_PAGE
  );
  const totalFacultyLoadsPages = Math.ceil(
    sortedFacultyLoads.length / ITEMS_PER_PAGE
  );

  const paginatedStudentSubjects = sortedStudentSubjects.slice(
    (studentSubjectsPage - 1) * ITEMS_PER_PAGE,
    studentSubjectsPage * ITEMS_PER_PAGE
  );
  const totalStudentSubjectsPages = Math.ceil(
    sortedStudentSubjects.length / ITEMS_PER_PAGE
  );

  const paginatedSections = sortedSections.slice(
    (sectionsPage - 1) * ITEMS_PER_PAGE,
    sectionsPage * ITEMS_PER_PAGE
  );
  const totalSectionPages = Math.ceil(sortedSections.length / ITEMS_PER_PAGE);

  const paginatedSubjects = sortedSubjects.slice(
    (subjectsPage - 1) * ITEMS_PER_PAGE,
    subjectsPage * ITEMS_PER_PAGE
  );
  const totalSubjectPages = Math.ceil(sortedSubjects.length / ITEMS_PER_PAGE);

  return (
    <div className="admin-dashboard">
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
            <h1>Admin Dashboard</h1>
          </div>
        </div>

        <div className="navbar-right">
          <div className="profile-section">
            <button
              className="profile-icon"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <FaUserCircle size={28} />
            </button>

            {showDropdown && (
              <div className="profile-dropdown">
                <button onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ===== LAYOUT ===== */}
      <div className="dashboard-layout">
        {/* ===== SIDEBAR ===== */}
        <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
          <button
            className={`sidebar-btn ${
              activeSection === "overview" ? "active" : ""
            }`}
            onClick={() => setActiveSection("overview")}
          >
            <FaChartBar />
            <span>Analytics</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "evaluations" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluations")}
          >
            <FaClipboardCheck />
            <span>Evaluation Reports</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "incidents" ? "active" : ""
            }`}
            onClick={() => setActiveSection("incidents")}
          >
            <FaExclamationCircle />
            <span>Incident Reports</span>
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
          <button
            className={`sidebar-btn ${
              activeSection === "user-management" ? "active" : ""
            }`}
            onClick={() => setActiveSection("user-management")}
          >
            <FaUsersCog />
            <span>User Management</span>
          </button>
          <button
            className={`sidebar-btn ${
              activeSection === "evaluation-management" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluation-management")}
          >
            <FaQuestionCircle />
            <span>Evaluation Questions</span>
          </button>

          <button
            className={`sidebar-btn ${
              activeSection === "evaluation-settings" ? "active" : ""
            }`}
            onClick={() => setActiveSection("evaluation-settings")}
          >
            <FaCog />
            <span>Evaluation Settings</span>
          </button>

          <div className="sidebar-logo">
            <img src={evalinkLogo} alt="Evalink Logo" className="ustp-logo" />
          </div>
        </aside>

        {/* ===== MAIN CONTENT ===== */}
        <main className="dashboard-content">
          {/* ===== Overview ===== */}
          {activeSection === "overview" && (
            <section className="overview-section">
              <h2>Overview</h2>
              <div className="analytics-grid">
                <div className="stat-card">
                  <h4>Total Evaluations</h4>
                  <p>{evaluations.length}</p>
                </div>
                <div className="stat-card">
                  <h4>Total Students</h4>
                  <p>{students.length}</p>
                </div>
                <div className="stat-card">
                  <h4>Total Faculty</h4>
                  <p>{faculty.length}</p>
                </div>
              </div>
            </section>
          )}

          {/* ===== Evaluation Reports ===== */}
          {activeSection === "evaluations" && (
            <section className="evaluation-section">
              <h2>Evaluation Reports</h2>
              <button className="action-item-btn" onClick={handleDownloadPdf}>
                <FaFilePdf />
                <span>Download PDF Report</span>
              </button>
              {evaluations.length > 0 ? (
                evaluations.map((facultyResult) => (
                  <div
                    key={facultyResult.faculty_id}
                    className="faculty-evaluation-report-card"
                  >
                    <h3 className="faculty-report-name">
                      {facultyResult.faculty_name}
                    </h3>
                    {facultyResult.subjects.map((result) => (
                      <div
                        key={result.subject_id}
                        className="evaluation-card admin-view"
                      >
                        <h4>
                          {result.subject_name} ({result.subject_code})
                        </h4>
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

                        {/* ===== Display Comments ===== */}
                        {result.comments && result.comments.length > 0 && (
                          <div className="comments-section">
                            <h5>Feedback Comments:</h5>
                            <ul className="comments-list">
                              {result.comments.map((comment, index) => (
                                <li key={index} className="comment-item">
                                  <p>"{comment}"</p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* ============================== */}

                        {result.detailed_results?.length > 0 && (
                          <div className="detailed-results-section">
                            {result.detailed_results.map(
                              (category, catIndex) => (
                                <div key={catIndex} className="category-group">
                                  <h5>{category.category_name}</h5>
                                  <ul className="question-list">
                                    {category.questions.map((q, qIndex) => (
                                      <li
                                        key={qIndex}
                                        className="question-item-new"
                                      >
                                        <span
                                          className={`rating-badge ${getRatingColorClass(
                                            q.average_rating
                                          )}`}
                                        >
                                          {q.average_rating.toFixed(2)}
                                        </span>
                                        <span className="question-text-new">
                                          {q.question_text}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <p>No evaluation results found yet.</p>
              )}
            </section>
          )}

          {/* ===== Incident Reports ===== */}
          {activeSection === "incidents" && (
            <section className="incident-section">
              <h2>Incident Reports</h2>
              <div className="incident-list">
                {incidents.map((incident) => (
                  <div key={incident.id} className="incident-card">
                    <span
                      className={`incident-card-status-label status-${incident.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      {incident.status}
                    </span>
                    <h3>{incident.title}</h3>
                    <p>
                      <strong>Reported by:</strong> {incident.reporter_name} (
                      {incident.reporter_id})
                    </p>
                    <p>
                      <strong>Description:</strong> {incident.description}
                    </p>
                    <p>
                      <strong>Date:</strong> {incident.date}
                    </p>
                    <div className="incident-status-actions">
                      {STATUS_ORDER.map((status) => {
                        const currentStatusIndex = STATUS_ORDER.indexOf(
                          incident.status
                        );
                        const buttonStatusIndex = STATUS_ORDER.indexOf(status);

                        return (
                          <div key={status} className="status-btn-wrapper">
                            <button
                              className={`status-btn status-${status
                                .toLowerCase()
                                .replace(" ", "-")} ${
                                incident.status === status ? "active" : ""
                              }`}
                              onClick={() =>
                                handleStatusChange(incident.id, status)
                              }
                              disabled={buttonStatusIndex < currentStatusIndex}
                            >
                              {statusIcons[status]}
                              <span>{status}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ===== Activity Log ===== */}
          {activeSection === "activity" && (
            <section className="activity-log-section">
              <h2>Activity Log</h2>
              {activityLogs.length > 0 ? (
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
                          evaluation: <FaClipboardCheck color="#007bff" />,
                          report_incident: (
                            <FaExclamationTriangle color="#ffc107" />
                          ),
                          update_profile: <FaUserCircle color="#6c757d" />,
                        }[log.activity_type] || <FaHistory color="#6c757d" />}
                      </div>
                      <div className="activity-details">
                        <p>
                          <strong>{log.user_name}</strong> ({log.user_role}){" "}
                          {log.description}
                        </p>
                        <span className="activity-time">{log.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No activity has been logged yet.</p>
              )}
            </section>
          )}

          {/* ===== USER MANAGEMENT ===== */}
          {activeSection === "user-management" && (
            <section className="user-management-section">
              <h2>User Management</h2>
              <div className="actions-grid">
                <div className="actions-group">
                  <h4>Users</h4>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddStudentModal(true)}
                  >
                    <FaUserPlus />
                    <span>Add Student</span>
                  </button>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddFacultyModal(true)}
                  >
                    <FaChalkboardTeacher />
                    <span>Add Faculty</span>
                  </button>
                </div>
                <div className="actions-group">
                  <h4>Academics</h4>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddDepartmentModal(true)}
                  >
                    <FaBuilding />
                    <span>Add Department</span>
                  </button>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddSectionModal(true)}
                  >
                    <FaUsers />
                    <span>Add Section</span>
                  </button>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddSubjectModal(true)}
                  >
                    <FaBookOpen />
                    <span>Add Subject</span>
                  </button>
                </div>
                <div className="actions-group">
                  <h4>Assignments</h4>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAssignLoadModal(true)}
                  >
                    <FaClipboardList />
                    <span>Assign Faculty Load</span>
                  </button>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAssignStudentSubjectModal(true)}
                  >
                    <FaUserGraduate />
                    <span>Assign Subject to Student</span>
                  </button>
                </div>
              </div>

              <div className="user-table-container">
                <h3>Students</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("id")}>
                        Student ID{getSortIndicator("id")}
                      </th>
                      <th onClick={() => requestSort("name")}>
                        Name{getSortIndicator("name")}
                      </th>
                      <th onClick={() => requestSort("year")}>
                        Year Level{getSortIndicator("year")}
                      </th>
                      <th onClick={() => requestSort("department_name")}>
                        Department{getSortIndicator("department_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.id}</td>
                        <td>{student.name}</td>
                        <td>{student.year_level}</td>
                        <td>{student.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit("student", student)}                            title="Edit Student"                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("student", student.id)}
                          >
                            <FaTrash title="Delete Student" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalStudentPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setStudentsPage((p) => Math.max(p - 1, 1))}
                      disabled={studentsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {studentsPage} of {totalStudentPages}
                    </span>
                    <button
                      onClick={() =>
                        setStudentsPage((p) =>
                          Math.min(p + 1, totalStudentPages)
                        )
                      }
                      disabled={studentsPage === totalStudentPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Faculty</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("id")}>
                        Faculty ID{getSortIndicator("id")}
                      </th>
                      <th onClick={() => requestSort("name")}>
                        Name{getSortIndicator("name")}
                      </th>
                      <th onClick={() => requestSort("department_name")}>
                        Department{getSortIndicator("department_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFaculty.map((fac) => (
                      <tr key={fac.id}>
                        <td>{fac.id}</td>
                        <td>{fac.name}</td>
                        <td>{fac.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit("faculty", fac)}                            title="Edit Faculty"                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("faculty", fac.id)}
                          >
                            <FaTrash title="Delete Faculty" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalFacultyPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setFacultyPage((p) => Math.max(p - 1, 1))}
                      disabled={facultyPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {facultyPage} of {totalFacultyPages}
                    </span>
                    <button
                      onClick={() =>
                        setFacultyPage((p) =>
                          Math.min(p + 1, totalFacultyPages)
                        )
                      }
                      disabled={facultyPage === totalFacultyPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Departments</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("id")}>
                        Department ID{getSortIndicator("id")}
                      </th>
                      <th onClick={() => requestSort("name")}>
                        Name{getSortIndicator("name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDepartments.map((dept) => (
                      <tr key={dept.id}>
                        <td>{dept.id}</td>
                        <td>{dept.name}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit("department", dept)}                            title="Edit Department"                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("department", dept.id)}
                          >
                            <FaTrash title="Delete Department" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalDepartmentPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() =>
                        setDepartmentsPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={departmentsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {departmentsPage} of {totalDepartmentPages}
                    </span>
                    <button
                      onClick={() =>
                        setDepartmentsPage((p) =>
                          Math.min(p + 1, totalDepartmentPages)
                        )
                      }
                      disabled={departmentsPage === totalDepartmentPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Faculty Teaching Loads</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("faculty_name")}>
                        Faculty Name{getSortIndicator("faculty_name")}
                      </th>
                      <th onClick={() => requestSort("subject_name")}>
                        Subject{getSortIndicator("subject_name")}
                      </th>
                      <th onClick={() => requestSort("section_name")}>
                        Section{getSortIndicator("section_name")}
                      </th>
                      <th onClick={() => requestSort("department_name")}>
                        Department{getSortIndicator("department_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedFacultyLoads.map((load) => (
                      <tr key={load.id}>
                        <td>{load.faculty_name}</td>
                        <td>{load.subject_name}</td>
                        <td>{load.section_name}</td>
                        <td>{load.department_name}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() =>
                              handleDelete("faculty-load", load.id)
                            }                            title="Delete Faculty Load"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalFacultyLoadsPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() =>
                        setFacultyLoadsPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={facultyLoadsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {facultyLoadsPage} of {totalFacultyLoadsPages}
                    </span>
                    <button
                      onClick={() =>
                        setFacultyLoadsPage((p) =>
                          Math.min(p + 1, totalFacultyLoadsPages)
                        )
                      }
                      disabled={facultyLoadsPage === totalFacultyLoadsPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Student Enrollments</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("student_name")}>
                        Student Name{getSortIndicator("student_name")}
                      </th>
                      <th onClick={() => requestSort("subject_name")}>
                        Subject{getSortIndicator("subject_name")}
                      </th>
                      <th onClick={() => requestSort("faculty_name")}>
                        Faculty{getSortIndicator("faculty_name")}
                      </th>
                      <th onClick={() => requestSort("section_name")}>
                        Section{getSortIndicator("section_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudentSubjects.map((enrollment) => (
                      <tr key={enrollment.id}>
                        <td>{enrollment.student_name}</td>
                        <td>{enrollment.subject_name}</td>
                        <td>{enrollment.faculty_name}</td>
                        <td>{enrollment.section_name || "N/A (Irregular)"}</td>
                        <td>
                          <button
                            className="action-btn delete-btn"
                            onClick={() =>
                              handleDelete("student-subject", enrollment.id)
                            }                            title="Delete Enrollment"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalStudentSubjectsPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() =>
                        setStudentSubjectsPage((p) => Math.max(p - 1, 1))
                      }
                      disabled={studentSubjectsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {studentSubjectsPage} of {totalStudentSubjectsPages}
                    </span>
                    <button
                      onClick={() =>
                        setStudentSubjectsPage((p) =>
                          Math.min(p + 1, totalStudentSubjectsPages)
                        )
                      }
                      disabled={
                        studentSubjectsPage === totalStudentSubjectsPages
                      }
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Sections</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("id")}>
                        Section ID{getSortIndicator("id")}
                      </th>
                      <th onClick={() => requestSort("name")}>
                        Section Name{getSortIndicator("name")}
                      </th>
                      <th onClick={() => requestSort("department_name")}>
                        Department{getSortIndicator("department_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSections.map((section) => (
                      <tr key={section.id}>
                        <td>{section.id}</td>
                        <td>{section.name}</td>
                        <td>{section.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit("section", section)}                            title="Edit Section"                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("section", section.id)}
                          >
                            <FaTrash title="Delete Section" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalSectionPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setSectionsPage((p) => Math.max(p - 1, 1))}
                      disabled={sectionsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {sectionsPage} of {totalSectionPages}
                    </span>
                    <button
                      onClick={() =>
                        setSectionsPage((p) =>
                          Math.min(p + 1, totalSectionPages)
                        )
                      }
                      disabled={sectionsPage === totalSectionPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              <div className="user-table-container">
                <h3>Subjects</h3>
                <table>
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("code")}>
                        Subject Code{getSortIndicator("code")}
                      </th>
                      <th onClick={() => requestSort("name")}>
                        Subject Name{getSortIndicator("name")}
                      </th>
                      <th onClick={() => requestSort("year_level")}>
                        Year Level{getSortIndicator("year_level")}
                      </th>
                      <th onClick={() => requestSort("faculty_name")}>
                        Assigned Faculty{getSortIndicator("faculty_name")}
                      </th>
                      <th onClick={() => requestSort("department_name")}>
                        Department{getSortIndicator("department_name")}
                      </th>
                      <th className="actions-column">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedSubjects.map((subject) => (
                      <tr key={subject.id}>
                        <td>{subject.code}</td>
                        <td>{subject.name}</td>
                        <td>{subject.year_level || "N/A"}</td>
                        <td>{subject.faculty_name || "N/A"}</td>
                        <td>{subject.department_name || "N/A"}</td>
                        <td>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit("subject", subject)}                            title="Edit Subject"                          >
                            <FaEdit />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete("subject", subject.id)}
                          >
                            <FaTrash title="Delete Subject" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalSubjectPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      onClick={() => setSubjectsPage((p) => Math.max(p - 1, 1))}
                      disabled={subjectsPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {subjectsPage} of {totalSubjectPages}
                    </span>
                    <button
                      onClick={() =>
                        setSubjectsPage((p) =>
                          Math.min(p + 1, totalSubjectPages)
                        )
                      }
                      disabled={subjectsPage === totalSubjectPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ===== EVALUATION MANAGEMENT ===== */}
          {activeSection === "evaluation-management" && (
            <section className="user-management-section">
              {" "}
              {/* Reusing styles */}
              <h2>Manage Evaluation Questions</h2>
              <div className="actions-grid">
                <div className="actions-group">
                  <h4>Actions</h4>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddEvalCategoryModal(true)}
                  >
                    <FaPlus /> <span>Add Category</span>
                  </button>
                  <button
                    className="action-item-btn"
                    onClick={() => setShowAddEvalQuestionModal(true)}
                  >
                    <FaPlus /> <span>Add Question</span>
                  </button>
                </div>
              </div>
              {Array.isArray(evaluationQuestions) &&
                evaluationQuestions.map((category, index) => (
                  <div
                    key={category.id || index}
                    className="user-table-container"
                  >
                    <h3>
                      {category.name}
                      <button
                        className="action-btn edit-btn"
                        style={{ marginLeft: "1rem" }}
                        onClick={() => handleEdit("evaluation-category", category)}                        title="Edit Category"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteCategory(category.id)}
                        title="Delete Category"                      >
                        <FaTrash />
                      </button>
                    </h3>
                    <ul className="question-list-admin">
                      {/* Ensure questions is an array before mapping */}
                      {Array.isArray(category.questions) &&
                        category.questions.map((q) => (
                          <li key={q.id} className="question-list-item">
                            <span>{q.text || "Invalid question text"}</span>
                            <div className="question-actions">
                              <button
                                className="action-btn edit-btn"
                                onClick={() => handleEditQuestion(q)}
                                title="Edit Question"                              >
                                <FaEdit />
                              </button>
                              <button
                                className="action-btn delete-btn"
                                onClick={() => handleDeleteQuestion(q.id)}
                                title="Delete Question"                              >
                                <FaTrash />
                              </button>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </section>
          )}

          {/* ===== EVALUATION SETTINGS ===== */}
          {activeSection === "evaluation-settings" && (
            <EvaluationSettings />
          )}
        </main>
      </div>
      {showAddStudentModal && (
        <AddStudentModal
          onClose={() => setShowAddStudentModal(false)}
          onSuccess={() => handleSuccess("student")}
          departments={departments}
          sections={sections}
          showMessage={alert}
        />
      )}
      {showAddFacultyModal && (
        <AddFacultyModal
          onClose={() => setShowAddFacultyModal(false)}
          onSuccess={() => handleSuccess("faculty")}
          departments={departments}
          showMessage={alert}
        />
      )}
      {showAddDepartmentModal && (
        <AddDepartmentModal
          onClose={() => setShowAddDepartmentModal(false)}
          onSuccess={() => handleSuccess("department")}
          showMessage={alert}
        />
      )}
      {showAddSectionModal && (
        <AddSectionModal
          onClose={() => setShowAddSectionModal(false)}
          onSuccess={() => handleSuccess("section")}
          departments={departments}
          showMessage={alert}
        />
      )}
      {showAddSubjectModal && (
        <AddSubjectModal
          onClose={() => setShowAddSubjectModal(false)}
          onSuccess={() => handleSuccess("subject")}
          departments={departments}
          showMessage={alert}
        />
      )}
      {showAssignLoadModal && (
        <AssignLoadModal
          onClose={() => setShowAssignLoadModal(false)}
          onSuccess={() => handleSuccess("faculty-load")}
          faculty={faculty}
          subjects={subjects}
          showMessage={alert}
          sections={sections}
        />
      )}
      {showAssignStudentSubjectModal && (
        <AssignStudentSubjectModal
          onClose={() => setShowAssignStudentSubjectModal(false)}
          onSuccess={() => handleSuccess("student-subject")}
          students={students}
          subjects={subjects}
          faculty={faculty}
          showMessage={alert}
          facultyLoads={facultyLoads}
          sections={sections}
        />
      )}
      {showAddEvalCategoryModal && (
        <AddEvalCategoryModal
          onClose={() => setShowAddEvalCategoryModal(false)}
          onSuccess={() => handleSuccess("evaluation-category")}
          showMessage={alert}
        />
      )}
      {showAddEvalQuestionModal && (
        <AddEvalQuestionModal
          onClose={() => setShowAddEvalQuestionModal(false)}
          onSuccess={() => handleSuccess("evaluation-question")}
          categories={
            Array.isArray(evaluationQuestions)
              ? evaluationQuestions.map(({ id, name }) => ({ id, name }))
              : []
          }
          showMessage={alert}
        />
      )}

      {/* Modal for Editing Evaluation Questions */}
      {editingEntity?.type === "evaluation-question" && (
        <AddEvalQuestionModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("evaluation-question")}
          categories={
            Array.isArray(evaluationQuestions)
              ? evaluationQuestions.map(({ id, name }) => ({ id, name }))
              : []
          }
          showMessage={alert}
          initialData={editingEntity.data}
        />
      )}

      {/* Modal for Editing Evaluation Categories */}
      {editingEntity?.type === "evaluation-category" && (
        <AddEvalCategoryModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("evaluation-category")}
          initialData={editingEntity.data}
          showMessage={alert}
        />
      )}

      {/* Edit Modals: These reuse the "Add" modals but will be passed initial data */}
      {editingEntity?.type === "student" && (
        <AddStudentModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("student")}
          departments={departments}
          sections={sections}
          showMessage={alert}
          initialData={editingEntity.data}
        />
      )}
      {editingEntity?.type === "faculty" && (
        <AddFacultyModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("faculty")}
          departments={departments}
          showMessage={alert}
          initialData={editingEntity.data}
        />
      )}
      {editingEntity?.type === "department" && (
        <AddDepartmentModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("department")}
          initialData={editingEntity.data}
          showMessage={alert}
        />
      )}
      {editingEntity?.type === "section" && (
        <AddSectionModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("section")}
          departments={departments}
          initialData={editingEntity.data}
          showMessage={alert}
        />
      )}
      {editingEntity?.type === "subject" && (
        <AddSubjectModal
          onClose={() => setEditingEntity(null)}
          onSuccess={() => handleSuccess("subject")}
          departments={departments}
          faculty={faculty}
          showMessage={alert}
          initialData={editingEntity.data}
        />
      )}

    </div>
  );
}