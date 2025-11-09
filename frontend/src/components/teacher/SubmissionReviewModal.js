import React, { useState } from 'react';
import './SubmissionReviewModal.css';

const SubmissionReviewModal = ({ submission, onClose, onReview }) => {
    const [status, setStatus] = useState('approved');
    const [points, setPoints] = useState(submission.task.points);
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const [badges, setBadges] = useState([]);
    const [badgeDraft, setBadgeDraft] = useState({
        name: '',
        description: '',
        icon: '',
        rarity: 'common'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const success = await onReview(submission._id, status, points, feedback, badges);
        
        if (success) {
            onClose();
        }
        
        setLoading(false);
    };

    const handleAddBadge = () => {
        if (!badgeDraft.name.trim()) return;
        setBadges(prev => [...prev, {
            name: badgeDraft.name.trim(),
            description: badgeDraft.description.trim(),
            icon: badgeDraft.icon.trim(),
            rarity: badgeDraft.rarity
        }]);
        setBadgeDraft({ name: '', description: '', icon: '', rarity: 'common' });
    };

    const handleRemoveBadge = (index) => {
        setBadges(prev => prev.filter((_, i) => i !== index));
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        const badges = {
            'pending': { text: 'Pending Review', color: '#ffa500', icon: '⏳' },
            'approved': { text: 'Approved', color: '#51cf66', icon: '✅' },
            'rejected': { text: 'Rejected', color: '#ff6b6b', icon: '❌' },
            'needs_revision': { text: 'Needs Revision', color: '#ffd43b', icon: '📝' }
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
                        <h2>📝 Review Submission</h2>
                        <p className="student-name">Student: {submission.student.name}</p>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                {/* Информация о задаче */}
                <div className="review-content">
                    <div className="task-info-section">
                        <h3>📚 Task: {submission.task.title}</h3>
                        <div className="task-meta">
                            <span>⭐ Difficulty: {'⭐'.repeat(submission.task.difficulty)}</span>
                            <span>💎 Points: {submission.task.points}</span>
                            <span>🗓️ Submitted: {formatDate(submission.submittedAt)}</span>
                            <span>🔢 Attempt: #{submission.attemptNumber}</span>
                        </div>
                        {getStatusBadge(submission.status)}
                    </div>

                    {/* Код студента */}
                    <div className="code-section">
                        <div className="section-header">
                            <h3>💻 Solution Code</h3>
                            <span className="language-badge">{submission.language}</span>
                        </div>
                        <pre className="code-display">
                            <code>{submission.code}</code>
                        </pre>
                    </div>

                    {/* Описание задачи для справки */}
                    <div className="task-description-section">
                        <h3>📖 Task Description</h3>
                        <p>{submission.task.description}</p>
                    </div>

                    {/* Форма проверки */}
                    <form onSubmit={handleSubmit} className="review-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Submission Status *</label>
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="status-select"
                                >
                                    <option value="approved">✅ Approve</option>
                                    <option value="rejected">❌ Reject</option>
                                    <option value="needs_revision">📝 Needs Revision</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Points (max: {submission.task.points}) *</label>
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
                            <label>Comment / Feedback *</label>
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Write detailed feedback for the student..."
                                rows="6"
                                required
                                className="feedback-textarea"
                            />
                            <small>💡 Tip: Indicate what the student did correctly and what can be improved</small>
                        </div>

                        <div className="form-group">
                            <label>Award Badges (optional)</label>
                            {badges.length > 0 && (
                                <div className="awarded-badges-list">
                                    {badges.map((badge, index) => (
                                        <div key={`${badge.name}-${index}`} className="awarded-badge-item">
                                            <div>
                                                <strong>{badge.icon || '🏅'} {badge.name}</strong>
                                                {badge.description && <p>{badge.description}</p>}
                                                <small>Rarity: {badge.rarity}</small>
                                            </div>
                                            <button type="button" onClick={() => handleRemoveBadge(index)} className="btn-icon">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="badge-form">
                                <input
                                    type="text"
                                    placeholder="Badge name"
                                    value={badgeDraft.name}
                                    onChange={(e) => setBadgeDraft(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <input
                                    type="text"
                                    placeholder="Icon (emoji or URL)"
                                    value={badgeDraft.icon}
                                    onChange={(e) => setBadgeDraft(prev => ({ ...prev, icon: e.target.value }))}
                                />
                                <select
                                    value={badgeDraft.rarity}
                                    onChange={(e) => setBadgeDraft(prev => ({ ...prev, rarity: e.target.value }))}
                                >
                                    <option value="common">Common</option>
                                    <option value="rare">Rare</option>
                                    <option value="epic">Epic</option>
                                    <option value="legendary">Legendary</option>
                                </select>
                                <textarea
                                    placeholder="Badge description"
                                    rows="2"
                                    value={badgeDraft.description}
                                    onChange={(e) => setBadgeDraft(prev => ({ ...prev, description: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleAddBadge}
                                    disabled={!badgeDraft.name.trim()}
                                >
                                    ➕ Add Badge
                                </button>
                            </div>
                            <small>🛡️ Badges motivate students. Keep names short and clear.</small>
                        </div>

                        {/* Быстрые шаблоны */}
                        <div className="quick-templates">
                            <p><strong>Quick Templates:</strong></p>
                            <div className="template-buttons">
                                <button 
                                    type="button"
                                    className="template-btn template-good"
                                    onClick={() => setFeedback('Excellent work! Code is clean, logic is correct. ✅')}
                                >
                                    👍 Excellent
                                </button>
                                <button 
                                    type="button"
                                    className="template-btn template-minor"
                                    onClick={() => setFeedback('Solution is correct, but there are minor remarks:\n- Code readability can be improved\n- Add comments')}
                                >
                                    ⚠️ Minor Fixes
                                </button>
                                <button 
                                    type="button"
                                    className="template-btn template-major"
                                    onClick={() => setFeedback('There are logic errors:\n- Incorrect handling of edge cases\n- Algorithm needs to be reconsidered\nTry again!')}
                                >
                                    ❌ Needs Fixes
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
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn-submit-review"
                                disabled={loading || !feedback.trim()}
                            >
                                {loading ? '⏳ Saving...' : '✅ Save Review'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SubmissionReviewModal;