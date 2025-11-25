import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./login/LoginPage";
import StudentDashboard from "./dashboards/students/StudentDashboard.jsx";
import FacultyDashboard from "./dashboards/faculty/FacultyDashboard.jsx";
import AdminDashboard from "./dashboards/admin/AdminDashboard.jsx";

export default function App() {
  const [userRole, setUserRole] = useState(null);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route
          path="/login"
          element={<LoginPage setUserRole={setUserRole} />}
        />

        {/* Dashboards */}
        <Route
          path="/student"
          element={<StudentDashboard setUserRole={setUserRole} />}
        />
        <Route
          path="/faculty"
          element={<FacultyDashboard setUserRole={setUserRole} />}
        />
        <Route
          path="/admin"
          element={<AdminDashboard setUserRole={setUserRole} />}
        />

        {/* If route not found → redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
