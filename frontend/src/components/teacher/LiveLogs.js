// frontend/src/components/teacher/LiveLogs.js
import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { API_BASE, SOCKET_URL } from '../../config';

const LiveLogs = () => {
  const { token, user } = useContext(AuthContext);
  const [rawLogs, setRawLogs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [allowedUserIds, setAllowedUserIds] = useState([]);

  const extractUserId = useCallback((log) => {
    if (!log || log.user === undefined || log.user === null) return null;
    if (typeof log.user === 'string') return log.user;
    if (typeof log.user === 'object') {
      if (log.user._id) return log.user._id;
      if (log.user.id) return log.user.id;
    }
    return null;
  }, []);

  const allowedSet = useMemo(() => new Set(allowedUserIds.map(String)), [allowedUserIds]);

  const isLogAllowed = useCallback((log) => {
    const logUserId = extractUserId(log);
    if (!logUserId) {
      // system logs without user should remain visible
      return true;
    }
    return allowedSet.size === 0 ? true : allowedSet.has(String(logUserId));
  }, [allowedSet, extractUserId]);

  useEffect(() => {
    setLogs(rawLogs.filter(isLogAllowed));
  }, [rawLogs, isLogAllowed]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadScope = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load groups');
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load groups');
        const ids = [];
        data.groups.forEach(group => {
          (group.students || []).forEach(student => {
            if (student?._id) ids.push(student._id);
            else if (typeof student === 'string') ids.push(student);
          });
        });
        const teacherId = user?._id || user?.id;
        if (teacherId) ids.push(teacherId);
        if (!cancelled) {
          setAllowedUserIds(Array.from(new Set(ids.map(String))));
        }
      } catch (error) {
        console.warn('Unable to determine log scope', error);
      }
    };

    const loadLogs = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/logs?limit=200`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load logs');
        const data = await res.json();
        if (!cancelled && data.success) {
          setRawLogs(data.logs);
        }
      } catch (error) {
        console.warn('Unable to load historical logs', error);
      }
    };

    loadScope().then(loadLogs);

    const socket = io(SOCKET_URL, {
      auth: { token }
    });

    socket.on('live-log', (log) => {
      if (!isLogAllowed(log)) return;
      setLogs(prev => [log, ...prev].slice(0, 200));
      setRawLogs(prev => [log, ...prev].slice(0, 200));
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [token, user, isLogAllowed]);

  return (
    <div className="live-logs">
      <h3>Живые логи (последние)</h3>
      <div style={{ maxHeight: 400, overflowY: 'auto', background:'#fff', padding:10 }}>
        {logs.map(l => (
          <div key={l._id} style={{ padding:8, borderBottom:'1px solid #eee' }}>
            <div><strong>{new Date(l.createdAt).toLocaleString()}</strong> — <em>{l.level}</em></div>
            <div>{l.message}</div>
            <div style={{ fontSize:12, color:'#666' }}>
              {(() => {
                const id = extractUserId(l);
                if (!id) return 'System';
                if (l.user?.name) return `${l.user.name} (${id})`;
                return `User: ${id}`;
              })()}
              {l.route ? ` — ${l.route}` : ''}
            </div>
            {l.meta && Object.keys(l.meta).length > 0 && (
              <pre style={{ fontSize:11 }}>{JSON.stringify(l.meta, null, 2)}</pre>
            )}
          </div>
        ))}
        {logs.length === 0 && (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
            Нет доступных логов для отображения.
          </p>
        )}
      </div>
    </div>
  );
};

export default LiveLogs;
