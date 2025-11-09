import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './MySubmissions.css';

const MySubmissions = () => {
    const { token } = useContext(AuthContext);
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, approved, rejected, pending

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
                        return (
                            <div key={sub._id} className="submission-card">
                                <div className="submission-card-header">
                                    <h3>{sub.task?.title || 'Task Deleted'}</h3>
                                    <span className={`status-badge ${statusBadge.class}`}>
                                        {statusBadge.text}
                                    </span>
                                </div>

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

                                <details className="code-details">
                                    <summary>Show Code</summary>
                                    <pre className="code-preview">{sub.code}</pre>
                                </details>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default MySubmissions;