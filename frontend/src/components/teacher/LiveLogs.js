// frontend/src/components/teacher/LiveLogs.js
import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../../config';

const socketUrl = 'http://127.0.0.1:5000'; // заменить на ваш бекенд

const LiveLogs = () => {
  const { token } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      auth: { token }, // при необходимости
    });

    socket.on('connect', () => {
      console.log('connected to logs socket', socket.id);
    });

    socket.on('live-log', (log) => {
      setLogs(prev => [log, ...prev].slice(0, 200)); // держим последние 200
    });

    socket.on('disconnect', () => {
      console.log('socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <div className="live-logs">
      <h3>Живые логи (последние)</h3>
      <div style={{ maxHeight: 400, overflowY: 'auto', background:'#fff', padding:10 }}>
        {logs.map(l => (
          <div key={l._id} style={{ padding:8, borderBottom:'1px solid #eee' }}>
            <div><strong>{new Date(l.createdAt).toLocaleString()}</strong> — <em>{l.level}</em></div>
            <div>{l.message}</div>
            <div style={{ fontSize:12, color:'#666' }}>{l.user ? `User: ${l.user}` : ''} {l.route ? ` — ${l.route}` : ''}</div>
            <pre style={{ fontSize:11 }}>{JSON.stringify(l.meta)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveLogs;
