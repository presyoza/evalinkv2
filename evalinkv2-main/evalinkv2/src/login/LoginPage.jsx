import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import axios from "axios";
import evalinkLogo from "../assets/evalinklogo.png";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function LoginPage({ setUserRole }) {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setFormData({ identifier: "", password: "" }); // Clear form data for all roles
  };
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    let payload;
    if (role === "admin") {
      payload = { email: formData.identifier, password: formData.password };
    } else {
      payload = { id: formData.identifier, password: formData.password };
    }

    try {
      // Single login endpoint
      const response = await axios.post("http://localhost:3001/login", payload);

      if (response.data.message === "Login successful") {
        const user = response.data.user;
        setUserRole(user.role); // Set global role from server response

        // Store user ID for student/faculty
        localStorage.setItem("userId", user.id); // This is correct for all roles

        if (user.role === "student") {
          const now = new Date();
          const options = {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          };
          const loginTime = now.toLocaleString("en-US", options);

          const logs =
            JSON.parse(localStorage.getItem("studentActivityLog")) || [];
          logs.push({ type: "login", timestamp: loginTime });
          localStorage.setItem("studentActivityLog", JSON.stringify(logs));
          navigate("/student");
        } else if (user.role === "faculty") navigate("/faculty");
        else if (user.role === "admin") navigate("/admin");
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        // Handle specific error messages from the server (e.g., "Invalid credentials")
        alert("Login failed: " + error.response.data.error);
      } else {
        // Handle network errors or other unexpected issues
        console.error("Login error!", error);
        alert("An error occurred during login. Please try again.");
      }
    }
  };

  return (
    <div className="ustp-login-container">
      <div className="ustp-login-left">
        <div className="ustp-logo">
          <img src={evalinkLogo} alt="Evalink Logo" />
        </div>

        {!role ? (
          <div className="role-select-container">
            <h4>Select your role to continue:</h4>
            <div className="login-options">
              <button
                className="login-student"
                onClick={() => handleRoleSelect("student")}
              >
                Student
              </button>
              <button
                className="login-faculty"
                onClick={() => handleRoleSelect("faculty")}
              >
                Faculty
              </button>
              <button
                className="login-admin"
                onClick={() => handleRoleSelect("admin")}
              >
                Admin
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ustp-form">
            <h4 className="selected-role">
              Logging in as <span>{role}</span>
            </h4>

            <div className="input-group">
              <input
                type="text"
                name="identifier"
                placeholder={
                  role === "admin"
                    ? "Username"
                    : role === "student"
                    ? "Student ID"
                    : "Faculty ID"
                }
                value={formData.identifier}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <button type="submit" className="ustp-btn-login">
              Log in
            </button>
            <button
              type="reset"
              className="ustp-btn-back"
              onClick={() => {
                setRole("");
                setFormData({ identifier: "", password: "" }); // Clear form data
              }}
            >
              Back to Role Selection
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
