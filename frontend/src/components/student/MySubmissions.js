import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
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
            const response = await fetch('http://127.0.0.1:5000/api/submissions/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error('Ошибка загрузки:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { text: '⏳ На проверке', class: 'status-pending' },
            approved: { text: '✅ Принято', class: 'status-approved' },
            rejected: { text: '❌ Отклонено', class: 'status-rejected' },
            needs_revision: { text: '🔄 Нужны правки', class: 'status-revision' }
        };
        return badges[status] || badges.pending;
    };

    const filteredSubmissions = submissions.filter(sub => {
        if (filter === 'all') return true;
        return sub.status === filter;
    });

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    return (
        <div className="my-submissions">
            <div className="submissions-header">
                <h2>📝 Мои решения</h2>
                <div className="filter-buttons">
                    <button 
                        className={filter === 'all' ? 'active' : ''} 
                        onClick={() => setFilter('all')}
                    >
                        Все ({submissions.length})
                    </button>
                    <button 
                        className={filter === 'approved' ? 'active' : ''} 
                        onClick={() => setFilter('approved')}
                    >
                        ✅ Принятые ({submissions.filter(s => s.status === 'approved').length})
                    </button>
                    <button 
                        className={filter === 'pending' ? 'active' : ''} 
                        onClick={() => setFilter('pending')}
                    >
                        ⏳ На проверке ({submissions.filter(s => s.status === 'pending').length})
                    </button>
                    <button 
                        className={filter === 'rejected' ? 'active' : ''} 
                        onClick={() => setFilter('rejected')}
                    >
                        ❌ Отклоненные ({submissions.filter(s => s.status === 'rejected').length})
                    </button>
                </div>
            </div>

            {filteredSubmissions.length === 0 ? (
                <p className="empty-message">Нет решений в этой категории</p>
            ) : (
                <div className="submissions-grid">
                    {filteredSubmissions.map(sub => {
                        const statusBadge = getStatusBadge(sub.status);
                        return (
                            <div key={sub._id} className="submission-card">
                                <div className="submission-card-header">
                                    <h3>{sub.task?.title || 'Задача удалена'}</h3>
                                    <span className={`status-badge ${statusBadge.class}`}>
                                        {statusBadge.text}
                                    </span>
                                </div>

                                <div className="submission-info">
                                    <div className="info-item">
                                        <span className="label">Попытка:</span>
                                        <span className="value">#{sub.attemptNumber}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Язык:</span>
                                        <span className="value">{sub.language}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Баллы:</span>
                                        <span className="value">
                                            {sub.status === 'approved' ? `💎 ${sub.pointsAwarded}` : '-'}
                                        </span>
                                    </div>
                                    <div className="info-item">
                                        <span className="label">Отправлено:</span>
                                        <span className="value">
                                            {new Date(sub.submittedAt).toLocaleDateString('ru-RU')}
                                        </span>
                                    </div>
                                </div>

                                {sub.feedback && (
                                    <div className="feedback-section">
                                        <strong>Комментарий учителя:</strong>
                                        <p>{sub.feedback}</p>
                                    </div>
                                )}

                                <details className="code-details">
                                    <summary>Показать код</summary>
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