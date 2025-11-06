import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './TaskSubmission.css';

const TaskSubmission = ({ task, onClose, onSubmitSuccess }) => {
    const { token } = useContext(AuthContext);
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState(task.programmingLanguage || 'python');
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
            alert('Пожалуйста, введите код решения!');
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
                alert('✅ Решение отправлено на проверку!');
                onSubmitSuccess();
                onClose();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка отправки решения');
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
                            <span>💎 {task.points} баллов</span>
                            <span>📝 {task.programmingLanguage}</span>
                            <span>⏱️ {formatTime(timeSpent)}</span>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="submission-content">
                    <div className="task-description">
                        <h3>Описание задачи:</h3>
                        <p>{task.description}</p>
                    </div>

                    {task.examples && task.examples.length > 0 && (
                        <div className="task-examples">
                            <h3>Примеры:</h3>
                            {task.examples.map((example, index) => (
                                <div key={index} className="example">
                                    <div>
                                        <strong>Вход:</strong> {example.input}
                                    </div>
                                    <div>
                                        <strong>Выход:</strong> {example.output}
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
                            <h3>💡 Подсказки:</h3>
                            <ul>
                                {task.hints.map((hint, index) => (
                                    <li key={index}>{hint}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="submission-form">
                        <div className="form-group">
                            <label>Язык программирования:</label>
                            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Твой код:</label>
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="Напиши свое решение здесь..."
                                rows="15"
                                required
                            />
                        </div>

                        <div className="submission-actions">
                            <button type="button" onClick={onClose} className="btn-cancel">
                                Отмена
                            </button>
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'Отправка...' : '✅ Отправить решение'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TaskSubmission;
