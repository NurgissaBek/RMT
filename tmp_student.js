import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './StudentDashboard.css';
import TaskSubmission from './TaskSubmission';
import MySubmissions from './MySubmissions';
import Profile from './Profile';

const StudentDashboard = () => {
    const { token, user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [lectures, setLectures] = useState([]);
    const [quizzes, setQuizzes] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedLecture, setSelectedLecture] = useState(null);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'submissions' | 'profile'
    const [applyLoading, setApplyLoading] = useState(false);
    const [applyMessage, setApplyMessage] = useState('');
    const [applied, setApplied] = useState(!!(user && user.appliedForTeacher));

    useEffect(() => {
        fetchData();

        const handler = () => {
            fetchData();
        };
        window.addEventListener('refresh-student', handler);
        return () => window.removeEventListener('refresh-student', handler);
    }, []);

    const fetchData = async () => {
        try {
            // Получаем задачи
            const tasksRes = await fetch(`${API_BASE}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = await tasksRes.json();
            if (tasksData.success) setTasks(tasksData.tasks);

            // Получаем лекции
            const lecturesRes = await fetch(`${API_BASE}/api/lectures`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const lecturesData = await lecturesRes.json();
            if (lecturesData.success) setLectures(lecturesData.lectures);

            // Получаем квизы
            const quizzesRes = await fetch(`${API_BASE}/api/quizzes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const quizzesData = await quizzesRes.json();
            if (quizzesData.success) setQuizzes(quizzesData.quizzes);

            // Получаем leaderboard
            const leaderRes = await fetch(`${API_BASE}/api/leaderboard?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const leaderData = await leaderRes.json();
            if (leaderData.success) setLeaderboard(leaderData.leaderboard);

            // Получаем статистику
            const statsRes = await fetch(`${API_BASE}/api/submissions/stats/student`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.stats);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    // If "My Submissions" view is selected
    if (currentView === 'submissions') {
        return (
            <div className="student-dashboard">
                <div className="view-switcher">
                    <button 
                        className="btn-back" 
                        onClick={() => setCurrentView('dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
                <MySubmissions />
            </div>
        );
    }

    if (currentView === 'profile') {
        return (
            <div className="student-dashboard">
                <div className="view-switcher">
                    <button 
                        className="btn-back" 
                        onClick={() => setCurrentView('dashboard')}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
                <Profile />
            </div>
        );
    }

    // Main Dashboard
    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <div>
                    <h2>Welcome, {user.name}! 👋</h2>
                    <p>Keep solving tasks and earning points!</p>
                </div>
                <div>
                    <button 
                        className="btn-view-submissions"
                        onClick={() => setCurrentView('submissions')}
                    >
                        📝 My Submissions
                    </button>
                    <button 
                        className="btn-view-submissions"
                        style={{ marginLeft: 10 }}
                        onClick={() => setCurrentView('profile')}
                    >
                        👤 Profile
                    </button>
                </div>
            </div>

            {/* Teacher application CTA for students */}
            {user.role === 'student' && (
                <div style={{ margin: '10px 0 0 0' }}>
                    <button
                        className="btn-view-submissions"
                        style={{ backgroundColor: '#1f8b4c' }}
                        disabled={applyLoading || applied}
                        onClick={async () => {
                            setApplyMessage('');
                            setApplyLoading(true);
                            try {
                                const res = await fetch(`${API_BASE}/api/users/apply-teacher`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                    setApplied(true);
                                    setApplyMessage('Application submitted. Waiting for admin approval.');
                                } else {
                                    setApplyMessage(data.message || 'Failed to submit application');
                                }
                            } catch (e) {
                                setApplyMessage('Network error while applying');
                            } finally {
                                setApplyLoading(false);
                            }
                        }}
                    >
                        {applied ? 'Application Sent' : (applyLoading ? 'Submitting…' : 'Apply to be Teacher')}
                    </button>
                    {applyMessage && (
                        <span style={{ marginLeft: 12, color: '#1f6feb' }}>{applyMessage}</span>
                    )}
                </div>
            )}

            {/* Stats and badges moved to Profile page */}

            <div className="dashboard-grid">
                {/* Tasks List */}
                <div className="dashboard-section">
                    <h3>📚 Available Tasks ({tasks.length})</h3>
                    
                    {tasks.length === 0 ? (
                        <p className="empty-message">No tasks yet. Wait for teachers to add them!</p>
                    ) : (
                        <div className="tasks-list">
                            {tasks.map(task => (
                                <div key={task._id} className="task-card">
                                    <div className="task-header">
                                        <h4>{task.title}</h4>
                                        <span className={`difficulty difficulty-${task.difficulty}`}>
                                            {'⭐'.repeat(task.difficulty)}
                                        </span>
                                    </div>
                                    <p className="task-description">{task.description}</p>
                                    <div className="task-footer">
                                        <span className="task-points">💎 {task.points} points</span>
                                        <span className="task-language">📝 {task.programmingLanguage}</span>
                                        <button 
                                              className="btn-solve"
                                              onClick={() => setSelectedTask(task)}
                                          >
                                              Solve
                                          </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lectures List */}
                <div className="dashboard-section">
                    <h3>🎓 Available Lectures ({lectures.length})</h3>
                    
                    {lectures.length === 0 ? (
                        <p className="empty-message">No lectures yet. Wait for teachers to add them!</p>
                    ) : (
                        <div className="tasks-list">
                            {lectures.map(lecture => (
                                <div key={lecture._id} className="task-card">
                                    <div className="task-header">
                                        <h4>{lecture.title}</h4>
                                    </div>
                                    <p className="task-description">{lecture.description || 'No description'}</p>
                                    <div className="task-footer">
                                        {lecture.videoUrl && (
                                            <a 
                                                href={lecture.videoUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="btn-solve"
                                                style={{ textDecoration: 'none', display: 'inline-block' }}
                                            >
                                                🎥 Watch Video
                                            </a>
                                        )}
                                        {lecture.attachments && lecture.attachments.length > 0 && (
                                            <span className="task-points" style={{ marginLeft: '10px' }}>
                                                📎 {lecture.attachments.length} file{lecture.attachments.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <button 
                                            className="btn-solve"
                                            onClick={() => {
                                                // Fetch full lecture details and open modal
                                                fetch(`${API_BASE}/api/lectures/${lecture._id}`, {
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                })
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        setSelectedLecture(data.lecture);
                                                    }
                                                });
                                            }}
                                        >
                                            View
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quizzes List */}
                <div className="dashboard-section">
                    <h3>📝 Available Quizzes ({quizzes.length})</h3>
                    
                    {quizzes.length === 0 ? (
                        <p className="empty-message">No quizzes yet. Wait for teachers to add them!</p>
                    ) : (
                        <div className="tasks-list">
                            {quizzes.map(quiz => (
                                <div key={quiz._id} className="task-card">
                                    <div className="task-header">
                                        <h4>{quiz.title}</h4>
                                    </div>
                                    <p className="task-description">{quiz.description || 'No description'}</p>
                                    <div className="task-footer">
                                        <span className="task-points">❓ {quiz.questions?.length || 0} questions</span>
                                        <button 
                                            className="btn-solve"
                                            onClick={() => {
                                                // Fetch full quiz details and open modal
                                                fetch(`${API_BASE}/api/quizzes/${quiz._id}`, {
                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                })
                                                .then(res => res.json())
                                                .then(data => {
                                                    if (data.success) {
                                                        setSelectedQuiz(data.quiz);
                                                    } else {
                                                        alert(data.message || 'Quiz is no longer available');
                                                    }
                                                })
                                                .catch(() => alert('Error loading quiz details'));
                                            }}
                                        >
                                            Take Quiz
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Leaderboard */}
                <div className="dashboard-section leaderboard-section">
                    <h3>🏆 Top Students</h3>
                    {leaderboard.length === 0 ? (
                        <p className="empty-message">No data yet</p>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboard.map((student, index) => (
                                <div key={student._id} className="leaderboard-item">
                                    <span className="rank">#{index + 1}</span>
                                    <div className="student-info">
                                        <strong>{student.name}</strong>
                                        <span className="points">{student.points} points</span>
                                    </div>
                                    {index === 0 && <span className="medal">🥇</span>}
                                    {index === 1 && <span className="medal">🥈</span>}
                                    {index === 2 && <span className="medal">🥉</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {selectedTask && (
                <TaskSubmission
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSubmitSuccess={fetchData}
                />
            )}

            {/* Lecture Modal */}
            {selectedLecture && (
                <div className="modal-overlay" onClick={() => setSelectedLecture(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>🎓 {selectedLecture.title}</h2>
                            <button className="btn-close" onClick={() => setSelectedLecture(null)}>✕</button>
                        </div>
                        {selectedLecture.description && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3>Description</h3>
                                <p>{selectedLecture.description}</p>
                            </div>
                        )}
                        {selectedLecture.videoUrl && (
                            <div style={{ marginBottom: '20px' }}>
                                <a 
                                    href={selectedLecture.videoUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="btn-submit"
                                    style={{ display: 'inline-block', textDecoration: 'none' }}
                                >
                                    🎥 Watch Video
                                </a>
                            </div>
                        )}
                        {selectedLecture.resources && selectedLecture.resources.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3>Resources</h3>
                                <ul>
                                    {selectedLecture.resources.map((resource, idx) => (
                                        <li key={idx}>
                                            <a href={resource.url} target="_blank" rel="noreferrer">
                                                {resource.title || resource.url}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {selectedLecture.attachments && selectedLecture.attachments.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3>Attachments</h3>
                                <ul>
                                    {selectedLecture.attachments.map((file, idx) => (
                                        <li key={idx}>
                                            <a href={file.url} target="_blank" rel="noreferrer">
                                                {file.originalName}
                                            </a>
                                            <span style={{ marginLeft: 8, color: '#777' }}>
                                                ({Math.round(file.size / 1024)} KB)
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {selectedLecture.content && (
                            <div style={{ marginBottom: '20px' }}>
                                <h3>Content</h3>
                                <div dangerouslySetInnerHTML={{ __html: selectedLecture.content }} />
                            </div>
                        )}
                        <button className="btn-cancel" onClick={() => setSelectedLecture(null)}>Close</button>
                    </div>
                </div>
            )}

            {/* Quiz Modal */}
            {selectedQuiz && (
                <div className="modal-overlay" onClick={() => setSelectedQuiz(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2>📝 {selectedQuiz.title}</h2>
                            <button className="btn-close" onClick={() => setSelectedQuiz(null)}>✕</button>
                        </div>
                        {selectedQuiz.description && (
                            <div style={{ marginBottom: '20px' }}>
                                <p>{selectedQuiz.description}</p>
                            </div>
                        )}
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            const answers = [];
                            selectedQuiz.questions.forEach((q, idx) => {
                                answers.push(parseInt(formData.get(`answer-${idx}`)));
                            });
                            
                            try {
                                const res = await fetch(`${API_BASE}/api/quizzes/${selectedQuiz._id}/submit`, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ answers })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert(`Quiz submitted! Score: ${data.submission.score}/${data.submission.maxScore} (${data.submission.percentage}%)`);
                                    setSelectedQuiz(null);
                                    fetchData();
                                } else {
                                    alert('Error: ' + data.message);
                                }
                            } catch (error) {
                                alert('Error submitting quiz');
                            }
                        }}>
                            {selectedQuiz.questions && selectedQuiz.questions.map((question, qIdx) => (
                                <div key={qIdx} style={{ marginBottom: '25px', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                                    <h4 style={{ marginBottom: '10px' }}>
                                        {qIdx + 1}. {question.text} ({question.points || 1} point{question.points !== 1 ? 's' : ''})
                                    </h4>
                                    {question.choices && question.choices.map((choice, cIdx) => (
                                        <label key={cIdx} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                                            <input 
                                                type="radio" 
                                                name={`answer-${qIdx}`} 
                                                value={cIdx} 
                                                required
                                                style={{ marginRight: '8px' }}
                                            />
                                            {choice}
                                        </label>
                                    ))}
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn-cancel" onClick={() => setSelectedQuiz(null)}>Cancel</button>
                                <button type="submit" className="btn-submit">Submit Quiz</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;


