import React, { useMemo, useState } from 'react';
import '../SubmissionReviewModal.css';
import './QuizSubmissionReviewModal.css';

const defaultBadgeDraft = {
  name: '',
  description: '',
  icon: '',
  rarity: 'common'
};

const getAnswerLabel = (index) => String.fromCharCode(65 + index);

const QuizSubmissionReviewModal = ({ quiz, submission, onClose, onReview }) => {
  const [score, setScore] = useState(submission.score || 0);
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [badges, setBadges] = useState(submission.awardedBadges || []);
  const [badgeDraft, setBadgeDraft] = useState(defaultBadgeDraft);
  const [saving, setSaving] = useState(false);

  const maxScore = useMemo(() => {
    if (submission.maxScore) return submission.maxScore;
    return quiz.questions.reduce((sum, q) => sum + (q.points || 1), 0);
  }, [submission.maxScore, quiz.questions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const success = await onReview(submission._id, {
      score: Math.min(Math.max(score, 0), maxScore),
      feedback,
      badges
    });
    setSaving(false);
    if (success) {
      onClose();
    }
  };

  const handleAddBadge = () => {
    if (!badgeDraft.name.trim()) return;
    setBadges(prev => ([
      ...prev,
      {
        name: badgeDraft.name.trim(),
        description: badgeDraft.description.trim(),
        icon: badgeDraft.icon.trim(),
        rarity: badgeDraft.rarity
      }
    ]));
    setBadgeDraft(defaultBadgeDraft);
  };

  const removeBadge = (idx) => {
    setBadges(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content quiz-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Review Quiz Submission</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="quiz-review-body">
          <section className="quiz-review-block">
            <h4>Student</h4>
            <p><strong>{submission.student?.name}</strong></p>
            <p>{submission.student?.email}</p>
            <p>Submitted: {new Date(submission.createdAt).toLocaleString()}</p>
          </section>

          <section className="quiz-review-block">
            <h4>Score</h4>
            <p>Auto score: {submission.autoScore}/{maxScore}</p>
            <p>Current score: {submission.score}/{maxScore}</p>
          </section>

          <section className="quiz-review-block">
            <h4>Answers</h4>
            <div className="quiz-answers">
              {quiz.questions.map((question, index) => {
                const studentAnswer = submission.answers?.[index];
                const isCorrect = studentAnswer === question.correctIndex;
                return (
                  <div key={index} className={`quiz-answer-card ${isCorrect ? 'correct' : 'incorrect'}`}>
                    <div className="quiz-answer-header">
                      <strong>Q{index + 1}. {question.text}</strong>
                      <span>{question.points || 1} pts</span>
                    </div>
                    <ul>
                      {question.choices.map((choice, choiceIdx) => {
                        const isStudentChoice = studentAnswer === choiceIdx;
                        const isRight = question.correctIndex === choiceIdx;
                        return (
                          <li key={choiceIdx} className={isStudentChoice ? 'chosen' : ''}>
                            <span className="choice-label">{getAnswerLabel(choiceIdx)}.</span>
                            <span>{choice}</span>
                            {isRight && <span className="choice-indicator">✅</span>}
                            {isStudentChoice && !isRight && <span className="choice-indicator">❌</span>}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <form onSubmit={handleSubmit} className="quiz-review-form">
            <div className="form-row">
              <div className="form-group">
                <label>Final score (max {maxScore})</label>
                <input
                  type="number"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <div className={`status-pill status-${submission.status}`}>
                  {submission.status === 'reviewed' ? 'Reviewed' : 'Submitted'}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Feedback</label>
              <textarea
                rows="4"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Summarize the student's results and provide guidance..."
              />
            </div>

            <div className="form-group">
              <label>Award badges (optional)</label>
              {badges.length > 0 && (
                <div className="awarded-badges-list">
                  {badges.map((badge, index) => (
                    <div key={`${badge.name}-${index}`} className="awarded-badge-item">
                      <div>
                        <strong>{badge.icon || '🏅'} {badge.name}</strong>
                        {badge.description && <p>{badge.description}</p>}
                        <small>Rarity: {badge.rarity}</small>
                      </div>
                      <button type="button" className="btn-icon" onClick={() => removeBadge(index)}>✕</button>
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
                  rows="2"
                  placeholder="Description"
                  value={badgeDraft.description}
                  onChange={(e) => setBadgeDraft(prev => ({ ...prev, description: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddBadge}
                  disabled={!badgeDraft.name.trim()}
                >
                  ➕ Add badge
                </button>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-submit-review" disabled={saving}>
                {saving ? 'Saving...' : 'Save review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QuizSubmissionReviewModal;
