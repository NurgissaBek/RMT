import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './MySubmissions.css';
import EditSubmissionModal from './EditSubmissionModal';

const MySubmissions = () => {
    const { token } = useContext(AuthContext);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, approved, rejected, pending, needs_revision
    const [editing, setEditing] = useState(null); // submission being edited

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/submissions/my`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error('Error loading:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: '⏳ Pending Review', class: 'status-pending' },
            approved: { text: '✅ Approved', class: 'status-approved' },
            rejected: { text: '❌ Rejected', class: 'status-rejected' },
            needs_revision: { text: '🔄 Needs Revision', class: 'status-revision' }
        };
        return badges[status] || badges.pending;
    };

    const filteredSubmissions = submissions.filter(sub => {
        if (filter === 'all') return true;
        return sub.status === filter;
    });

    const firstFailureSummary = (sub) => {
        if (!Array.isArray(sub?.testResults)) return null;
        const failed = sub.testResults.find(t => !t.passed);
        if (!failed) return null;
        const status = failed.status || 'Failed';
        const err = failed.error && failed.error.trim() ? failed.error.split('\n')[0].slice(0, 160) : null;
        if (err) return `${status}: ${err}`;
        // diff failure without stderr: show hint
        return status === 'Accepted' ? 'Output mismatch' : status;
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="my-submissions">
            <div className="submissions-header">
                <h2>📝 My Submissions</h2>
                <div className="filter-buttons">
                    <button 
                        className={filter === 'all' ? 'active' : ''} 
                        onClick={() => setFilter('all')}
                    >
                        All ({submissions.length})
                    </button>
                    <button 
                        className={filter === 'approved' ? 'active' : ''} 
                        onClick={() => setFilter('approved')}
                    >
                        ✅ Approved ({submissions.filter(s => s.status === 'approved').length})
                    </button>
                    <button 
                        className={filter === 'pending' ? 'active' : ''} 
                        onClick={() => setFilter('pending')}
                    >
                        ⏳ Pending ({submissions.filter(s => s.status === 'pending').length})
                    </button>
                    <button
                        className={filter === 'needs_revision' ? 'active' : ''}
                        onClick={() => setFilter('needs_revision')}
                    >
                        🔄 Needs Revision ({submissions.filter(s => s.status === 'needs_revision').length})
                    </button>
                    <button 
                        className={filter === 'rejected' ? 'active' : ''} 
                        onClick={() => setFilter('rejected')}
                    >
                        ❌ Rejected ({submissions.filter(s => s.status === 'rejected').length})
                    </button>
                </div>
            </div>

            {filteredSubmissions.length === 0 ? (
                <p className="empty-message">No submissions in this category</p>
            ) : (
                <div className="submissions-grid">
                    {filteredSubmissions.map(sub => {
                        const statusBadge = getStatusBadge(sub.status);
                        const canEdit = sub.status === 'pending';
                        const canDelete = true; // теперь можно удалять любые
                        return (
                            <div key={sub._id} className="submission-card">
                                <div className="submission-card-header">
                                    <h3>{sub.task?.title || 'Task Deleted'}</h3>
                                    <span className={`status-badge ${statusBadge.class}`}>
                                        {statusBadge.text}
                                    </span>
                                </div>

                                {sub.status === 'needs_revision' && (
                                    <div style={{ background: '#fff3e0', border: '1px solid #ffe0b2', color: '#e65100', padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                        <strong>Why failed:</strong> {firstFailureSummary(sub) || 'See auto-check results below'}
                                    </div>
                                )}

                                <div className="submission-info">
                                    <div className="info-item">
                                        <span className="label">Attempt:</span>
                                        <span className="value">#{sub.attemptNumber}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Language:</span>
                                        <span className="value">{sub.language}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Points:</span>
                                        <span className="value">
                                            {sub.status === 'approved' ? `💎 ${sub.pointsAwarded}` : '-'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Submitted:</span>
                                        <span className="value">
                                            {new Date(sub.submittedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {sub.feedback && (
                                    <div className="feedback-section">
                                        <strong>Teacher Comment:</strong>
                                        <p>{sub.feedback}</p>
                                    </div>
                                )}

                                {(Array.isArray(sub.testResults) && sub.testResults.length > 0) && (
                                    <details className="code-details" open={sub.status === 'needs_revision'}>
                                        <summary>Auto-check results {typeof sub.percentage === 'number' ? `(${sub.percentage}%)` : ''}</summary>
                                        <div style={{ marginTop: 10 }}>
                                            <div style={{ fontWeight: 600, marginBottom: 6 }}>
                                                {sub.autoCheck ? 'Automatic judging enabled' : 'Automatic judging data'}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                                                {sub.testResults.map((tr, idx) => (
                                                    <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <strong>Test #{idx + 1}</strong>
                                                                {tr.groupName ? <span style={{ marginLeft: 6, color: '#666' }}>({tr.groupName})</span> : null}
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: tr.passed ? '#2e7d32' : '#d32f2f' }}>
                                                                {tr.passed ? 'Passed' : 'Failed'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                                                            <div>
                                                                <div style={{ fontSize: 12, color: '#666' }}>Expected</div>
                                                                <pre className="code-preview" style={{ maxHeight: 120, overflow: 'auto' }}>{tr.testCase?.expectedOutput}</pre>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 12, color: '#666' }}>Actual</div>
                                                                <pre className="code-preview" style={{ maxHeight: 120, overflow: 'auto' }}>{tr.actualOutput}</pre>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 13, color: '#444' }}>
                                                            <div>Status: <strong>{tr.status || '—'}</strong></div>
                                                            <div>Time: <strong>{tr.time != null ? tr.time : '—'}</strong></div>
                                                            <div>Memory: <strong>{tr.memory != null ? tr.memory : '—'}</strong></div>
                                                            <div>Points: <strong>{tr.points != null ? tr.points : 0}</strong></div>
                                                        </div>
                                                        {tr.error && (
                                                            <div style={{ marginTop: 6 }}>
                                                                <div style={{ fontSize: 12, color: '#666' }}>Error / Compiler output</div>
                                                                <pre className="code-preview" style={{ color: '#b71c1c', maxHeight: 140, overflow: 'auto' }}>{tr.error}</pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </details>
                                )}

                                <details className="code-details">
                                    <summary>Show Code</summary>
                                    <pre className="code-preview">{sub.code}</pre>
                                </details>

                                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                    {canEdit && (
                                        <button
                                            className="btn-secondary"
                                            onClick={() => setEditing(sub)}
                                        >
                                            ✏️ Edit (pending)
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            className="btn-reject"
                                            onClick={async () => {
                                                if (!window.confirm('Delete this submission? If it was approved, points will be deducted.')) return;
                                                try {
                                                    const res = await fetch(`${API_BASE}/api/submissions/${sub._id}`, {
                                                        method: 'DELETE',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                    const data = await res.json();
                                                    if (data.success) {
                                                        // reload list
                                                        fetchSubmissions();
                                                    // сигнал для дашборда обновить задачи
                                                    window.dispatchEvent(new Event('refresh-student'));
                                                    } else {
                                                        alert('Ошибка: ' + (data.message || 'Failed to delete submission'));
                                                    }
                                                } catch (e) {
                                                    alert('Error deleting submission');
                                                }
                                            }}
                                        >
                                            🗑️ Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {editing && (
                <EditSubmissionModal
                    submission={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => {
                        setEditing(null);
                        fetchSubmissions();
                    }}
                />
            )}
        </div>
    );
};

export default MySubmissions;