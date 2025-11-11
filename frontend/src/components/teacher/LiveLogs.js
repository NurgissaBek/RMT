// frontend/src/components/teacher/LiveLogs.js
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../../config';
import './LiveLogs.css';

const LiveLogs = () => {
  const { token } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('all');
  const [action, setAction] = useState('all');
  const [resourceId, setResourceId] = useState('');
  const [sinceHours, setSinceHours] = useState('');
  const [viewers, setViewers] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ limit: '200' });
        if (category !== 'all') params.set('category', category);
        if (action !== 'all') params.set('action', action);
        if (resourceId.trim()) params.set('resourceId', resourceId.trim());
        if (sinceHours && Number(sinceHours) > 0) {
          const since = new Date(Date.now() - Number(sinceHours) * 3600 * 1000).toISOString();
          params.set('since', since);
        }
        const res = await fetch(`${API_BASE}/api/logs?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load logs');
        }
        const data = await res.json();
        if (!cancelled) {
          if (data.success) {
            // Логи уже отфильтрованы на бэкенде - только студенты из групп учителя
            setLogs(data.logs || []);
            setError(null);
          } else {
            setError(data.error || 'Failed to load logs');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Unable to load logs', error);
        if (!cancelled) {
          setError(error.message);
          setLoading(false);
        }
      }
    };

    loadLogs();

    // Периодически обновляем логи каждые 5 секунд
    const refreshInterval = setInterval(() => {
      if (!cancelled) {
        loadLogs();
      }
    }, 5000);

    // Socket.IO для получения логов в реальном времени
    const socket = io(SOCKET_URL, {
      auth: { token }
    });

    socket.on('live-log', (log) => {
      // Добавляем новый лог только если его еще нет
      setLogs(prev => {
        const exists = prev.some(l => l._id === log._id);
        if (exists) return prev;
        return [log, ...prev].slice(0, 200);
      });
    });

    return () => {
      cancelled = true;
      clearInterval(refreshInterval);
      socket.disconnect();
    };
  }, [token, category, action, resourceId, sinceHours]);

  // Load viewers for specific resource when provided
  useEffect(() => {
    let cancelled = false;
    const loadViews = async () => {
      if (!token) return;
      if (category === 'all' || !resourceId.trim()) {
        setViewers([]);
        return;
      }
      try {
        setLoadingViews(true);
        const res = await fetch(`${API_BASE}/api/logs/views?category=${encodeURIComponent(category)}&resourceId=${encodeURIComponent(resourceId.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!cancelled) {
          setViewers(data.success ? (data.viewers || []) : []);
        }
      } catch (e) {
        if (!cancelled) setViewers([]);
      } finally {
        if (!cancelled) setLoadingViews(false);
      }
    };
    loadViews();
    return () => { cancelled = true; };
  }, [token, category, resourceId]);

  const getLogIcon = (message) => {
    if (message?.toLowerCase().includes('opened task')) return '📖';
    if (message?.toLowerCase().includes('submitted solution')) return '✅';
    if (message?.toLowerCase().includes('opened lecture')) return '📚';
    if (message?.toLowerCase().includes('opened quiz')) return '📝';
    if (message?.toLowerCase().includes('submitted quiz')) return '🎯';
    return '📋';
  };

  const formatLogMessage = (log) => {
    // Сообщение уже содержит имя студента и действие (например, "John Doe opened task 123")
    if (log.message) {
      return log.message;
    }
    // Fallback: формируем из метаданных
    const studentName = log.meta?.studentName || log.user?.name || 'Unknown';
    const action = log.meta?.action || 'performed action';
    return `${studentName} ${action}`;
  };

  const getStudentName = (log) => {
    // Сначала из метаданных (самый надежный способ)
    if (log.meta?.studentName) return log.meta.studentName;
    // Затем из объекта user (когда user populated из API)
    if (log.user?.name) return log.user.name;
    // Пытаемся извлечь из сообщения (например, "John Doe opened task 123")
    if (log.message) {
      // Ищем паттерн: имя до первого действия (opened, submitted и т.д.)
      const actionMatch = log.message.match(/\b(opened|submitted|performed)\b/i);
      if (actionMatch) {
        const namePart = log.message.substring(0, actionMatch.index).trim();
        if (namePart) return namePart;
      }
      // Fallback: берем первые два слова
      const words = log.message.split(' ');
      if (words.length >= 2) {
        return `${words[0]} ${words[1]}`;
      }
    }
    // Fallback
    return 'System';
  };

  return (
    <div className="live-logs">
      <h3>Student Activity Logs</h3>
      <div className="live-logs-filters">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All Categories</option>
          <option value="task">Tasks</option>
          <option value="lecture">Lectures</option>
          <option value="quiz">Quizzes</option>
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="all">All Actions</option>
          <option value="opened">Opened</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <input
          placeholder={category === 'all' ? 'Resource ID (optional)' : `${category} ID`}
          value={resourceId}
          onChange={(e) => setResourceId(e.target.value)}
        />
        <input
          type="number"
          min="0"
          placeholder="Since (hours)"
          value={sinceHours}
          onChange={(e) => setSinceHours(e.target.value)}
        />
        <button className="btn-apply" onClick={() => {/* filters auto-apply */}}>
          Apply Filters
        </button>
      </div>
      {error && (
        <div className="live-logs-error">
          <strong>Error:</strong> {error}
        </div>
      )}
      {category !== 'all' && resourceId.trim() && (
        <div className="live-logs-viewers">
          <strong>Views for this {category}:</strong> {loadingViews ? 'Loading…' : viewers.length}
          {viewers.length > 0 && (
            <div className="live-logs-viewers-list">
              {viewers.slice(0, 12).map(v => (
                <span key={v.userId} className="live-logs-viewer-badge">
                  {v.name}
                </span>
              ))}
              {viewers.length > 12 && <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>+{viewers.length - 12} more</span>}
            </div>
          )}
        </div>
      )}

      <div className="live-logs-container">
        {loading && logs.length === 0 ? (
          <div className="live-logs-empty">
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="live-logs-empty">
            <p>No activity logs available.</p>
            <p>Student actions (opening tasks, submitting solutions, etc.) will appear here.</p>
          </div>
        ) : (
          logs.map(l => {
            const message = formatLogMessage(l);
            const studentName = getStudentName(l);
            const logDate = l.createdAt ? new Date(l.createdAt) : new Date();
            
            return (
              <div 
                key={l._id || Math.random()} 
                className={`live-logs-item ${l.level === 'error' ? 'error' : ''}`}
              >
                <div className="live-logs-item-header">
                  <span className="live-logs-item-icon">{getLogIcon(message)}</span>
                  <strong className="live-logs-item-student">{studentName}</strong>
                  <span className="live-logs-item-time">
                    {logDate.toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {l.level && (
                    <span className={`live-logs-item-level ${l.level}`}>
                      {l.level}
                    </span>
                  )}
                </div>
                <div className="live-logs-item-message">
                  {message}
                </div>
                {l.meta && (l.meta.taskTitle || l.meta.lectureTitle || l.meta.quizTitle) && (
                  <div className="live-logs-item-meta">
                    {l.meta.taskTitle && `Task: ${l.meta.taskTitle}`}
                    {l.meta.lectureTitle && `Lecture: ${l.meta.lectureTitle}`}
                    {l.meta.quizTitle && `Quiz: ${l.meta.quizTitle}`}
                    {l.meta.score !== undefined && ` | Score: ${l.meta.score}/${l.meta.maxScore || 'N/A'}`}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <div className="live-logs-footer">
        Showing {logs.length} recent activity logs
      </div>
    </div>
  );
};

export default LiveLogs;
