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
    if (!text || !text.trim()) return [];
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

  const previewQuestions = parseQuestions(form.questionsText);

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
                <label>Questions (format: one question per block, mark correct answer with *)</label>
                <textarea
                  rows={12}
                  value={form.questionsText}
                  onChange={(e) => setForm({ ...form, questionsText: e.target.value })}
                  placeholder={`Example format:

What is 2 + 2?
*4
3
5
6

What is the capital of France?
London
*Paris
Berlin
Madrid

Which programming language is used for web development?
C++
*JavaScript
Assembly
Binary`}
                  style={{ fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6' }}
                />
                <small style={{ display: 'block', marginTop: '6px', color: '#64748b', fontSize: '12px' }}>
                  💡 Format: Write each question on a new line, then list answers below it. Mark the correct answer with an asterisk (*). Separate questions with a blank line.
                </small>
                {form.questionsText && (
                  <div style={{ marginTop: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                      Preview ({previewQuestions.length} question{previewQuestions.length !== 1 ? 's' : ''}):
                    </strong>
                    {previewQuestions.length > 0 ? (
                      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {previewQuestions.map((q, idx) => (
                          <div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: idx < previewQuestions.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                            <div style={{ fontWeight: '500', color: '#1e293b', marginBottom: '6px', fontSize: '13px' }}>
                              {idx + 1}. {q.text}
                            </div>
                            <div style={{ marginLeft: '16px' }}>
                              {q.choices.map((choice, cIdx) => (
                                <div key={cIdx} style={{ fontSize: '12px', color: cIdx === q.correctIndex ? '#059669' : '#64748b', marginBottom: '4px' }}>
                                  {cIdx === q.correctIndex ? '✓ ' : '○ '}
                                  {choice}
                                  {cIdx === q.correctIndex && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#059669' }}>(correct)</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic' }}>
                        ⚠️ No valid questions found. Check the format above.
                      </div>
                    )}
                  </div>
                )}
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
