import React, { useState, useEffect } from "react";
import axios from "axios";
import "./EvaluationSettings.css";

const EvaluationSettings = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Function to format date string for datetime-local input
  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Offset for local timezone
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  useEffect(() => {
    // Fetch the current schedule
    axios
      .get("http://localhost:3001/evaluation-schedule")
      .then((response) => {
        const { start_date, end_date } = response.data;
        if (start_date) {
          setStartDate(formatDateTimeLocal(start_date));
        }
        if (end_date) {
          setEndDate(formatDateTimeLocal(end_date));
        }
      })
      .catch((err) => {
        console.error("Error fetching schedule:", err);
        setError("Could not fetch the current evaluation schedule.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    axios
      .post("http://localhost:3001/evaluation-schedule", {
        start_date: startDate,
        end_date: endDate,
      })
      .then((response) => {
        setMessage(response.data.message);
      })
      .catch((err) => {
        console.error("Error saving schedule:", err);
        setError(
          err.response?.data?.error || "Failed to save the schedule."
        );
      });
  };

  if (isLoading) {
    return <p>Loading settings...</p>;
  }

  return (
    <div className="evaluation-settings-container">
      <h2>Evaluation Schedule Settings</h2>
      <p>Set the start and end date for the student evaluation period.</p>
      <form onSubmit={handleSave} className="settings-form">
        <div className="form-group">
          <label htmlFor="start-date">Start Date and Time</label>
          <input type="datetime-local" id="start-date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="end-date">End Date and Time</label>
          <input type="datetime-local" id="end-date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <button type="submit" className="save-btn">Save Schedule</button>
        {message && <p className="success-message">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};

export default EvaluationSettings;