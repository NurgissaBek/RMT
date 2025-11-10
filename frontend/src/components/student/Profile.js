import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';

const AVATARS = [
    'default-avatar.png',
    'avatar-owl.png',
    'avatar-robot.png',
    'avatar-ninja.png',
    'avatar-fox.png'
];

const Profile = () => {
    const { token, user } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState('');

    const load = async () => {
        const res = await fetch(`${API_BASE}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            setProfile(data.user);
            setSelectedAvatar(data.user.avatar || 'default-avatar.png');
        }
    };

    useEffect(() => {
        load();
    }, []);

    const saveAvatar = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ avatar: selectedAvatar })
            });
            const data = await res.json();
            if (data.success) {
                setProfile(data.user);
                alert('✅ Avatar updated');
            } else {
                alert('Ошибка: ' + (data.message || 'Failed to update profile'));
            }
        } catch (e) {
            alert('Error updating profile');
        } finally {
            setSaving(false);
        }
    };

    if (!profile) return <div className="loading">Loading...</div>;

    const xpForNext = ((Math.pow((profile.level), 2) * 100) - profile.experience);
    const xpBarMax = Math.pow(profile.level, 2) * 100;
    const xpBarVal = Math.min(profile.experience, xpBarMax);

    return (
        <div className="student-dashboard" style={{ maxWidth: 900, margin: '0 auto' }}>
            <div className="dashboard-header">
                <div>
                    <h2>👤 Profile</h2>
                    <p>{user.name}</p>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">💎</div>
                    <div className="stat-info">
                        <h3>{profile.points}</h3>
                        <p>Total Points</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🆙</div>
                    <div className="stat-info">
                        <h3>Lv {profile.level}</h3>
                        <p>{profile.title}</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✨</div>
                    <div className="stat-info">
                        <h3>{profile.experience}</h3>
                        <p>XP</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <h3>{profile.stats?.successfulSubmissions || 0}</h3>
                        <p>Solved</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-section" style={{ marginTop: 20 }}>
                <h3>🌱 Progress</h3>
                <div style={{ background: '#eee', borderRadius: 8, overflow: 'hidden', height: 16 }}>
                    <div style={{ width: `${(xpBarVal / xpBarMax) * 100}%`, background: '#4caf50', height: '100%' }} />
                </div>
                <div style={{ marginTop: 6, color: '#555', fontSize: 14 }}>
                    {xpForNext > 0 ? `${xpForNext} XP to next level` : 'Level up soon!'}
                </div>
            </div>

            <div className="dashboard-section" style={{ marginTop: 20 }}>
                <h3>🖼 Avatar</h3>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    {AVATARS.map(a => (
                        <button
                            key={a}
                            className="btn-secondary"
                            style={{
                                border: selectedAvatar === a ? '2px solid #4caf50' : '2px solid transparent'
                            }}
                            onClick={() => setSelectedAvatar(a)}
                        >
                            {a}
                        </button>
                    ))}
                    <button className="btn-submit" disabled={saving} onClick={saveAvatar}>
                        {saving ? 'Saving...' : 'Save Avatar'}
                    </button>
                </div>
            </div>

            {profile.badges && profile.badges.length > 0 && (
                <div className="dashboard-section" style={{ marginTop: 20 }}>
                    <h3>🏅 Badges ({profile.badges.length})</h3>
                    <div className="badges-list">
                        {profile.badges.map((b, i) => (
                            <div key={i} className="badge-item">
                                <span className="badge-icon">🏆</span>
                                <div>
                                    <strong>{b.name}</strong>
                                    <p>{b.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;


