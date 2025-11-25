import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
import "./EvaluateInstructor.css";

export default function EvaluateInstructor({ subject, onClose, onSuccess }) {
  const [evaluationCategories, setEvaluationCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await axios.get(`${apiUrl}/evaluation-questions`);
        setEvaluationCategories(response.data);
      } catch (err) {
        setError("Failed to load evaluation questions.");
        console.error("Error fetching questions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // Safely calculate totalQuestions only if evaluationCategories is an array
  const totalQuestions = Array.isArray(evaluationCategories)
    ? evaluationCategories.reduce(
        (acc, category) => acc + (category.questions?.length || 0),
        0
      )
    : 0;

  const allQuestionsAnswered =
    totalQuestions > 0 &&
    Object.values(ratings).filter((rating) => rating > 0).length ===
      totalQuestions;

  const handleRatingChange = useCallback((questionId, rating) => {
    setRatings((prev) => ({ ...prev, [questionId]: rating }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null); // Clear previous errors

      // Validate that all questions have been answered and questions are loaded
      if (!allQuestionsAnswered) {
        setError("Please answer all questions before submitting.");
        return;
      }

      setIsSubmitting(true);
      try {
        // The backend expects a JSON object for the answers.
        // The `ratings` state is already in the correct { questionId: rating } format.
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
        const response = await axios.post(
          `${apiUrl}/evaluations`,
          {
            student_id: localStorage.getItem("userId"),
            faculty_id: subject.faculty_id,
            subject_id: subject.id,
            section_id: subject.section_id || null,
            answers: ratings,
            comments: comments,
          },
          {
            headers: {
              "Content-Type": "application/json",
              // Add auth token if required:
              // "Authorization": `Bearer ${localStorage.getItem("authToken")}`
            },
          }
        );
        alert(response.data.message); // Keeping alert for now, but a toast is better.
        if (onSuccess) {
          onSuccess(); // This will re-fetch the subjects on the dashboard
        }
        onClose(); // Close the modal on success.
      } catch (error) {
        // More detailed error logging
        console.error(
          "Error submitting evaluation:",
          error.response ? error.response.data : error.message
        );
        setError(
          error.response?.data?.error ||
            "Failed to submit evaluation. Please try again."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [ratings, comments, subject, onClose, onSuccess, allQuestionsAnswered]
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content evaluation-modal">
        <h2>Evaluate: {subject.name}</h2>
        <p>Instructor: {subject.faculty_name}</p>
        <hr />
        <form onSubmit={handleSubmit} noValidate>
          {isLoading && <p>Loading questions...</p>}
          {!isLoading && !evaluationCategories.length && (
            <p className="error-message">
              No evaluation questions are available at the moment. Please
              contact an administrator.
            </p>
          )}

          <div className="questions-container">
            {evaluationCategories.map((category) => (
              <div
                key={category.id || category.name}
                className="category-section"
              >
                <h3 className="category-title">{category.name}</h3>
                {Array.isArray(category.questions) &&
                  category.questions.map((question) => (
                    <div key={question.id} className="question-item">
                      <p className="question-text">{question.text}</p>
                      <div className="rating-scale">
                        <span className="rating-label-text">Poor</span>
                        <div className="rating-inputs">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <label key={score} className="rating-button">
                              <input
                                type="radio"
                                name={`question_${question.id}`}
                                value={score}
                                checked={ratings[question.id] === score}
                                onChange={() =>
                                  handleRatingChange(question.id, score)
                                }
                                required
                              />
                              <span>{score}</span>
                            </label>
                          ))}
                        </div>
                        <span className="rating-label-text">Excellent</span>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>

          <div className="feedback-section">
            <label htmlFor="comments">Additional Comments (Optional)</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Provide any other feedback here..."
              rows="4"
            ></textarea>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="modal-buttons">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              disabled={!allQuestionsAnswered || isSubmitting || isLoading}
            >
              {isSubmitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
