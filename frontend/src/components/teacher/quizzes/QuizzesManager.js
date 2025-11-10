import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';
import QuizSubmissionReviewModal from './QuizSubmissionReviewModal';
import './QuizzesManager.css';

const QuizzesManager = () => {
  const { token } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', questionsText: '', assignedGroups: [] });
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizSubmissions, setQuizSubmissions] = useState([]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(null);

  useEffect(() => {
    fetchQuizzes();
    fetchGroups();
  }, [token]);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setQuizzes(data.quizzes || []);
      } else {
        console.error('Failed to fetch quizzes:', data.message);
        setQuizzes([]);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      setQuizzes([]);
    }
  };

  const fetchGroups = async () => {
    const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setGroups(data.groups);
  };

  const parseQuestions = (text) => {
    return text.split(/\n\s*\n/).map(block => {
      const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      const questionText = lines[0];
      const choices = [];
      let correctIndex = 0;
      lines.slice(1).forEach((opt, idx) => {
        if (opt.startsWith('*')) {
          correctIndex = idx;
          choices.push(opt.slice(1).trim());
        } else {
          choices.push(opt);
        }
      });
      return { text: questionText, choices, correctIndex, points: 1 };
    }).filter(Boolean);
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    const questions = parseQuestions(form.questionsText);
    if (!questions.length) {
      alert('Add at least one valid question');
      return;
    }
    const res = await fetch(`${API_BASE}/api/quizzes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        questions,
        assignedGroups: form.assignedGroups
      })
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setForm({ title: '', description: '', questionsText: '', assignedGroups: [] });
      fetchQuizzes();
    } else {
      alert(data.message || 'Error creating quiz');
    }
  };

  const openSubmissions = async (quiz) => {
    setLoadingSubmissions(true);
    setSelectedQuiz(null);
    setQuizSubmissions([]);
    setShowSubmissions(true);
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/submissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSelectedQuiz(data.quiz);
        setQuizSubmissions(data.submissions);
      } else {
        alert(data.message || 'Error loading submissions');
        setShowSubmissions(false);
      }
    } catch (error) {
      alert('Error loading submissions');
      setShowSubmissions(false);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const closeSubmissions = () => {
    setShowSubmissions(false);
    setSelectedQuiz(null);
    setQuizSubmissions([]);
  };

  const handleReviewSubmission = async (submissionId, payload) => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/submissions/${submissionId}/review`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setQuizSubmissions(prev => prev.map(sub => (sub._id === submissionId ? data.submission : sub)));
        return true;
      }
      alert(data.message || 'Error saving review');
      return false;
    } catch (error) {
      alert('Error saving review');
      return false;
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? This will also delete all submissions.')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Удаляем квиз из локального состояния сразу, затем обновляем список
        setQuizzes(prev => prev.filter(q => q._id !== quizId));
        // Обновляем список с сервера для уверенности
        await fetchQuizzes();
      } else {
        alert('Error: ' + (data.message || 'Failed to delete quiz'));
      }
    } catch (error) {
      alert('Error deleting quiz');
      console.error(error);
    }
  };

  const toggleSolutions = async (quiz, nextVal) => {
    try {
      const res = await fetch(`${API_BASE}/api/quizzes/${quiz._id}/solutions`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutionsPublished: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setQuizzes(prev => prev.map(q => (q._id === quiz._id ? data.quiz : q)));
      } else {
        alert(data.message || 'Failed to update solutions visibility');
      }
    } catch (e) {
      alert('Error updating solutions visibility');
    }
  };

  return (
    <div className="section">
      <div className="quizzes-header">
        <h3>Quizzes</h3>
        <button className="btn-create" onClick={() => setShowCreate(true)}>+ Create Quiz</button>
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Quiz</h3>
            <form onSubmit={createQuiz}>
              <div className="form-group">
                <label>Title *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Questions (template)</label>
                <textarea
                  rows={8}
                  value={form.questionsText}
                  onChange={(e) => setForm({ ...form, questionsText: e.target.value })}
                  placeholder={'Question 1\n*Correct answer\nAnswer 2\nAnswer 3\n\nQuestion 2\nAnswer 1\n*Correct answer'}
                />
              </div>
              <div className="form-group">
                <label>Assign to Groups</label>
                <select
                  multiple
                  value={form.assignedGroups}
                  onChange={(e) => {
                    const arr = Array.from(e.target.selectedOptions, option => option.value);
                    setForm({ ...form, assignedGroups: arr });
                  }}
                  size={Math.min(6, Math.max(3, groups.length))}
                >
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>
                      {g.name} ({g.students?.length || 0} students)
                    </option>
                  ))}
                </select>
                <small>Leave empty to make the quiz available for all students</small>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="list">
        {quizzes.length === 0 ? (
          <p className="empty">No quizzes yet</p>
        ) : (
          quizzes.map(q => (
            <div key={q._id} className="task-row">
              <div className="task-row-content">
                <strong>{q.title}</strong>
                <span className="task-meta">
                  questions: {q.questions?.length || 0} • groups: {q.assignedGroups?.length || 0}
                </span>
              </div>
              <div className="task-row-actions">
                <button className="btn-secondary" onClick={() => openSubmissions(q)}>
                  📥 View submissions
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => toggleSolutions(q, !q.solutionsPublished)}
                  title="Publish/unpublish solutions for students"
                  style={{ marginLeft: '10px' }}
                >
                  {q.solutionsPublished ? '?? Unpublish solutions' : '?? Publish solutions'}
                </button>
                <button 
                  className="btn-icon btn-danger"
                  onClick={() => deleteQuiz(q._id)}
                  title="Delete Quiz"
                  style={{ marginLeft: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showSubmissions && (
        <div className="modal-overlay" onClick={closeSubmissions}>
          <div className="modal-content quiz-submissions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submissions{selectedQuiz ? ` — ${selectedQuiz.title}` : ''}</h3>
              <button className="btn-close" onClick={closeSubmissions}>✕</button>
            </div>
            {loadingSubmissions ? (
              <p>Loading submissions...</p>
            ) : quizSubmissions.length === 0 ? (
              <p className="empty">No submissions yet</p>
            ) : (
              <div className="quiz-submissions-list">
                {quizSubmissions.map(sub => (
                  <div key={sub._id} className="quiz-submission-card">
                    <div>
                      <strong>{sub.student?.name || 'Unknown Student'}</strong>
                      <p>{sub.student?.email}</p>
                      <p>Score: {sub.score}/{sub.maxScore} ({sub.percentage}%)</p>
                      <p>Status: {sub.status}</p>
                    </div>
                    <button className="btn-secondary" onClick={() => setReviewingSubmission(sub)}>
                      ✏️ Review
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {reviewingSubmission && selectedQuiz && (
        <QuizSubmissionReviewModal
          quiz={selectedQuiz}
          submission={reviewingSubmission}
          onClose={() => setReviewingSubmission(null)}
          onReview={async (submissionId, payload) => {
            const success = await handleReviewSubmission(submissionId, payload);
            if (success) {
              setReviewingSubmission(null);
            }
            return success;
          }}
        />
      )}
    </div>
  );
};

export default QuizzesManager;
