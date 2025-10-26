import React, { useState } from 'react';
import './SubmissionReviewModal.css';

const SubmissionReviewModal = ({ submission, onClose, onReview }) => {
    const [status, setStatus] = useState('approved');
    const [points, setPoints] = useState(submission.task.points);
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const success = await onReview(submission._id, status, points, feedback);
        
        if (success) {
            onClose();
        }
        
        setLoading(false);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { text: 'На проверке', color: '#ffa500', icon: '⏳' },
            'approved': { text: 'Принято', color: '#51cf66', icon: '✅' },
            'rejected': { text: 'Отклонено', color: '#ff6b6b', icon: '❌' },
            'needs_revision': { text: 'Нужны правки', color: '#ffd43b', icon: '📝' }
        };
        
        const badge = badges[status] || badges['pending'];
        
        return (
            <span style={{ 
                padding: '5px 12px', 
                background: badge.color, 
                color: 'white', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600'
            }}>
                {badge.icon} {badge.text}
            </span>
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="review-modal" onClick={(e) => e.stopPropagation()}>
                {/* Заголовок */}
                <div className="review-header">
                    <div>
                        <h2>📝 Проверка решения</h2>
                        <p className="student-name">Студент: {submission.student.name}</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                {/* Информация о задаче */}
                <div className="review-content">
                    <div className="task-info-section">
                        <h3>📚 Задача: {submission.task.title}</h3>
                        <div className="task-meta">
                            <span>⭐ Сложность: {'⭐'.repeat(submission.task.difficulty)}</span>
                            <span>💎 Баллов: {submission.task.points}</span>
                            <span>🗓️ Отправлено: {formatDate(submission.submittedAt)}</span>
                            <span>🔢 Попытка: #{submission.attemptNumber}</span>
                        </div>
                        {getStatusBadge(submission.status)}
                    </div>

                    {/* Код студента */}
                    <div className="code-section">
                        <div className="section-header">
                            <h3>💻 Код решения</h3>
                            <span className="language-badge">{submission.language}</span>
                        </div>
                        <pre className="code-display">
                            <code>{submission.code}</code>
                        </pre>
                    </div>

                    {/* Описание задачи для справки */}
                    <div className="task-description-section">
                        <h3>📖 Описание задачи</h3>
                        <p>{submission.task.description}</p>
                    </div>

                    {/* Форма проверки */}
                    <form onSubmit={handleSubmit} className="review-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Статус решения *</label>
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="status-select"
                                >
                                    <option value="approved">✅ Принять</option>
                                    <option value="rejected">❌ Отклонить</option>
                                    <option value="needs_revision">📝 Нужны правки</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Баллы (макс: {submission.task.points}) *</label>
                                <input
                                    type="number"
                                    min="0"
                                    max={submission.task.points}
                                    value={points}
                                    onChange={(e) => setPoints(parseInt(e.target.value))}
                                    className="points-input"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Комментарий / Обратная связь *</label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Напишите развернутый комментарий студенту..."
                                rows="6"
                                required
                                className="feedback-textarea"
                            />
                            <small>💡 Совет: Укажите что студент сделал правильно, а что можно улучшить</small>
                        </div>

                        {/* Быстрые шаблоны */}
                        <div className="quick-templates">
                            <p><strong>Быстрые шаблоны:</strong></p>
                            <div className="template-buttons">
                                <button 
                                    type="button"
                                    className="template-btn template-good"
                                    onClick={() => setFeedback('Отличная работа! Код чистый, логика правильная. ✅')}
                                >
                                    👍 Отлично
                                </button>
                                <button 
                                    type="button"
                                    className="template-btn template-minor"
                                    onClick={() => setFeedback('Решение верное, но есть небольшие замечания:\n- Можно улучшить читаемость кода\n- Добавьте комментарии')}
                                >
                                    ⚠️ Мелкие правки
                                </button>
                                <button 
                                    type="button"
                                    className="template-btn template-major"
                                    onClick={() => setFeedback('Есть ошибки в логике:\n- Неправильная обработка граничных случаев\n- Нужно пересмотреть алгоритм\nПопробуйте еще раз!')}
                                >
                                    ❌ Нужны исправления
                                </button>
                            </div>
                        </div>

                        {/* Действия */}
                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="btn-cancel"
                            >
                                Отмена
                            </button>
                            <button 
                                type="submit" 
                                className="btn-submit-review"
                                disabled={loading || !feedback.trim()}
                            >
                                {loading ? '⏳ Сохранение...' : '✅ Сохранить оценку'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubmissionReviewModal;