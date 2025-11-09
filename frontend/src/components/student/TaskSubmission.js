import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './TaskSubmission.css';

const TaskSubmission = ({ task, onClose, onSubmitSuccess }) => {
    const { token } = useContext(AuthContext);
    const [code, setCode] = useState('');
    // Language is fixed - use task's programming language, student cannot change it
    const [language] = useState(task.programmingLanguage || 'python');
    const [timeSpent, setTimeSpent] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Таймер времени выполнения
        const timer = setInterval(() => {
            setTimeSpent(prev => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code.trim()) {
            alert('Please enter your solution code!');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/api/submissions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    taskId: task._id,
                    code,
                    language,
                    timeSpent
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Solution submitted for review!');
                onSubmitSuccess();
                onClose();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Error submitting solution');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="submission-modal" onClick={(e) => e.stopPropagation()}>
                <div className="submission-header">
                    <div>
                        <h2>📝 {task.title}</h2>
                        <div className="task-meta">
                            <span>{'⭐'.repeat(task.difficulty)}</span>
                            <span>💎 {task.points} points</span>
                            <span>📝 {task.programmingLanguage}</span>
                            <span>⏱️ {formatTime(timeSpent)}</span>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="submission-content">
                    <div className="task-description">
                        <h3>Task Description:</h3>
                        <p>{task.description}</p>
                    </div>

                    {task.examples && task.examples.length > 0 && (
                        <div className="task-examples">
                            <h3>Examples:</h3>
                            {task.examples.map((example, index) => (
                                <div key={index} className="example">
                                    <div>
                                        <strong>Input:</strong> {example.input}
                                    </div>
                                    <div>
                                        <strong>Output:</strong> {example.output}
                                    </div>
                                    {example.explanation && (
                                        <div className="explanation">
                                            {example.explanation}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {task.hints && task.hints.length > 0 && (
                        <div className="task-hints">
                            <h3>💡 Hints:</h3>
                            <ul>
                                {task.hints.map((hint, index) => (
                                    <li key={index}>{hint}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="submission-form">
                        <div className="form-group">
                            <label>Programming Language:</label>
                            <input 
                                type="text" 
                                value={language.charAt(0).toUpperCase() + language.slice(1)} 
                                disabled 
                                style={{ 
                                    padding: '10px', 
                                    border: '2px solid #e0e0e0', 
                                    borderRadius: '6px',
                                    backgroundColor: '#f5f5f5',
                                    cursor: 'not-allowed'
                                }}
                            />
                            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                                Language is fixed for this task
                            </small>
                        </div>

                        <div className="form-group">
                            <label>Your Code:</label>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    alert('Copy-paste is disabled. Please type your code manually.');
                                }}
                                onKeyDown={(e) => {
                                    // Block Ctrl+V, Cmd+V, and Shift+Insert
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                                        e.preventDefault();
                                        alert('Copy-paste is disabled. Please type your code manually.');
                                    }
                                    if (e.key === 'Insert' && e.shiftKey) {
                                        e.preventDefault();
                                        alert('Copy-paste is disabled. Please type your code manually.');
                                    }
                                }}
                                placeholder="Write your solution here... (Copy-paste is disabled)"
                                rows="15"
                                required
                            />
                            <small style={{ color: '#d32f2f', marginTop: '5px', display: 'block' }}>
                                ⚠️ Copy-paste is disabled for this task
                            </small>
                        </div>

                        <div className="submission-actions">
                            <button type="button" onClick={onClose} className="btn-cancel">
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Submitting...' : '✅ Submit Solution'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskSubmission;
