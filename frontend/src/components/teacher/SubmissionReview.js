import React, { useState } from 'react';
import './SubmissionReview.css';
import { API_BASE } from '../../config';

const SubmissionReview = ({ submission, onClose, onReviewComplete }) => {
    const [reviewData, setReviewData] = useState({
        status: 'approved',
        pointsAwarded: submission.task.points,
        feedback: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(
                `${API_BASE}/api/submissions/${submission._id}/review`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reviewData)
                }
            );

            const data = await response.json();

            if (data.success) {
                alert('✅ Проверка завершена успешно!');
                onReviewComplete();
                onClose();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка при отправке проверки');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                <div className="review-header">
                    <div>
                        <h2>📝 Проверка решения</h2>
                        <p className="student-name">Студент: {submission.student.name}</p>
                        <p className="task-title">Задача: {submission.task.title}</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="review-content">
                    {/* Task Info */}
                    <div className="info-section">
                        <h3>Информация о задаче</h3>
                        <div className="info-grid">
                            <div className="info-item">
                                <span className="label">Сложность:</span>
                                <span>{'⭐'.repeat(submission.task.difficulty)}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Баллы:</span>
                                <span>{submission.task.points}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Язык:</span>
                                <span>{submission.language}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Попытка №:</span>
                                <span>{submission.attemptNumber}</span>
                            </div>
                            <div className="info-item">
                                <span className="label">Время выполнения:</span>
                                <span>{Math.floor(submission.timeSpent / 60)}м {submission.timeSpent % 60}с</span>
                            </div>
                        </div>
                    </div>

                    {/* Code Display */}
                    <div className="code-section">
                        <h3>Код решения</h3>
                        <pre className="code-display">
                            <code>{submission.code}</code>
                        </pre>
                    </div>

                    {/* Review Form */}
                    <form onSubmit={handleSubmitReview} className="review-form">
                        <div className="form-group">
                            <label>Статус проверки</label>
                            <select
                                value={reviewData.status}
                                onChange={(e) => setReviewData({
                                    ...reviewData,
                                    status: e.target.value
                                })}
                            >
                                <option value="approved">✅ Принято</option>
                                <option value="rejected">❌ Отклонено</option>
                                <option value="needs_revision">⚠️ Требует доработки</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Баллы (0-{submission.task.points})</label>
                            <input
                                type="number"
                                min="0"
                                max={submission.task.points}
                                value={reviewData.pointsAwarded}
                                onChange={(e) => setReviewData({
                                    ...reviewData,
                                    pointsAwarded: parseInt(e.target.value)
                                })}
                            />
                            <div className="points-presets">
                                <button
                                    type="button"
                                    onClick={() => setReviewData({
                                        ...reviewData,
                                        pointsAwarded: submission.task.points
                                    })}
                                >
                                    100%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewData({
                                        ...reviewData,
                                        pointsAwarded: Math.floor(submission.task.points * 0.8)
                                    })}
                                >
                                    80%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewData({
                                        ...reviewData,
                                        pointsAwarded: Math.floor(submission.task.points * 0.5)
                                    })}
                                >
                                    50%
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReviewData({
                                        ...reviewData,
                                        pointsAwarded: 0
                                    })}
                                >
                                    0%
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Комментарий для студента</label>
                            <textarea
                                value={reviewData.feedback}
                                onChange={(e) => setReviewData({
                                    ...reviewData,
                                    feedback: e.target.value
                                })}
                                placeholder="Напишите развернутый комментарий..."
                                rows="6"
                            />
                        </div>

                        <div className="review-actions">
                            <button type="button" onClick={onClose} className="btn-cancel">
                                Отмена
                            </button>
                            <button type="submit" className="btn-submit-review" disabled={loading}>
                                {loading ? 'Сохранение...' : '✅ Сохранить проверку'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubmissionReview;
