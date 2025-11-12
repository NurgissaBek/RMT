import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apps, setApps] = useState([]);
  const [approving, setApproving] = useState({});

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to load applications');
      }
      setApps(data.applicants || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (userId) => {
    setApproving(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/admin/assign/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to approve');
      }
      // Remove approved user from list
      setApps(prev => prev.filter(u => u._id !== userId));
    } catch (e) {
      setError(e.message);
    } finally {
      setApproving(prev => ({ ...prev, [userId]: false }));
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  return (
    <div className="admin-dashboard" style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h2>Admin Dashboard</h2>
      <p>Teacher applications pending approval</p>
      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {apps.length === 0 ? (
            <div>No pending applications</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {apps.map(u => (
                <li key={u._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #eee' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.name}</div>
                    <div style={{ color: '#666' }}>{u.email}</div>
                  </div>
                  <button onClick={() => approve(u._id)} disabled={!!approving[u._id]} className="btn-primary" style={{ width: 'auto', padding: '10px 16px' }}>
                    {approving[u._id] ? 'Approving...' : 'Approve as Teacher'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
