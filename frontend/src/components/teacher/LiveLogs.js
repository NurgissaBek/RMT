// frontend/src/components/teacher/LiveLogs.js
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../../config';

const LiveLogs = () => {
  const { token } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE}/api/logs?limit=200`, {
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
  }, [token]);

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
      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          borderRadius: '4px', 
          marginBottom: '10px' 
        }}>
          Error: {error}
        </div>
      )}
      <div style={{ maxHeight: 500, overflowY: 'auto', background:'#fff', padding:15, borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        {loading && logs.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '32px 0' }}>
            Loading logs...
          </p>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ color: '#94a3b8', marginBottom: '10px' }}>
              No activity logs available.
            </p>
            <p style={{ color: '#666', fontSize: '12px' }}>
              Student actions (opening tasks, submitting solutions, etc.) will appear here.
            </p>
          </div>
        ) : (
          logs.map(l => {
            const message = formatLogMessage(l);
            const studentName = getStudentName(l);
            const logDate = l.createdAt ? new Date(l.createdAt) : new Date();
            
            return (
              <div 
                key={l._id || Math.random()} 
                style={{ 
                  padding: '12px', 
                  borderBottom: '1px solid #e0e0e0',
                  marginBottom: '8px',
                  borderRadius: '4px',
                  backgroundColor: l.level === 'error' ? '#ffebee' : '#fafafa'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '18px' }}>{getLogIcon(message)}</span>
                  <strong style={{ color: '#1976d2', fontSize: '14px' }}>{studentName}</strong>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {logDate.toLocaleString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  {l.level && (
                    <span style={{ 
                      fontSize: '10px', 
                      padding: '2px 6px', 
                      borderRadius: '3px',
                      backgroundColor: l.level === 'error' ? '#f44336' : l.level === 'warn' ? '#ff9800' : '#4caf50',
                      color: 'white'
                    }}>
                      {l.level}
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#333', 
                  marginLeft: '26px',
                  fontWeight: 500
                }}>
                  {message}
                </div>
                {l.meta && (l.meta.taskTitle || l.meta.lectureTitle || l.meta.quizTitle) && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginLeft: '26px',
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
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
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Showing {logs.length} recent activity logs
      </div>
    </div>
  );
};

export default LiveLogs;
