import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const EditSubmissionModal = ({ submission, onClose, onSaved }) => {
    const { token } = useContext(AuthContext);
    const [code, setCode] = useState(submission?.code || '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setCode(submission?.code || '');
    }, [submission]);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/submissions/${submission._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (data.success) {
                onSaved();
                onClose();
            } else {
                alert('Ошибка: ' + (data.message || 'Failed to update submission'));
            }
        } catch (e) {
            alert('Error updating submission');
        } finally {
            setSaving(false);
        }
    };

    if (!submission) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="submission-modal" onClick={(e) => e.stopPropagation()}>
                <div className="submission-header">
                    <div>
                        <h2>✏️ Edit Submission</h2>
                        <div className="task-meta">
                            <span>Task: {submission.task?.title || '—'}</span>
                            <span>•</span>
                            <span>Language: {submission.language}</span>
                        </div>
                    </div>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSave} className="submission-form">
                    <div className="form-group">
                        <label>Your Code:</label>
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            rows="18"
                            required
                        />
                    </div>
                    <div className="submission-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={saving}>
                            {saving ? 'Saving...' : '💾 Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditSubmissionModal;


