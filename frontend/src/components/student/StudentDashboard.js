import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import './StudentDashboard.css';
import TaskSubmission from './TaskSubmission';
import MySubmissions from './MySubmissions';

const StudentDashboard = () => {
    const { token, user } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState(null);
    const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' или 'submissions'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Получаем задачи
            const tasksRes = await fetch(`${API_BASE}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = await tasksRes.json();
            if (tasksData.success) setTasks(tasksData.tasks);

            // Получаем leaderboard
            const leaderRes = await fetch(`${API_BASE}/api/leaderboard?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const leaderData = await leaderRes.json();
            if (leaderData.success) setLeaderboard(leaderData.leaderboard);

            // Получаем статистику
            const statsRes = await fetch(`${API_BASE}/api/submissions/stats/student`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.stats);

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Загрузка...</div>;
    }

    // Если выбран просмотр "Мои решения"
    if (currentView === 'submissions') {
        return (
            <div className="student-dashboard">
                <div className="view-switcher">
                    <button 
                        className="btn-back" 
                        onClick={() => setCurrentView('dashboard')}
                    >
                        ← Назад к Dashboard
                    </button>
                </div>
                <MySubmissions />
            </div>
        );
    }

    // Основной Dashboard
    return (
        <div className="student-dashboard">
            <div className="dashboard-header">
                <div>
                    <h2>Добро пожаловать, {user.name}! 👋</h2>
                    <p>Продолжай решать задачи и набирать баллы!</p>
                </div>
                <button 
                    className="btn-view-submissions"
                    onClick={() => setCurrentView('submissions')}
                >
                    📝 Мои решения
                </button>
            </div>

            {/* Статистика */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">⭐</div>
                    <div className="stat-info">
                        <h3>{stats?.totalPoints || 0}</h3>
                        <p>Всего баллов</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <h3>{stats?.approvedSubmissions || 0}</h3>
                        <p>Решено задач</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                        <h3>{stats?.pendingSubmissions || 0}</h3>
                        <p>На проверке</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-info">
                        <h3>{stats?.badges?.length || 0}</h3>
                        <p>Значков</p>
                    </div>
                </div>
            </div>

            {/* Значки */}
            {stats?.badges && stats.badges.length > 0 && (
                <div className="badges-section">
                    <h3>🏅 Мои достижения</h3>
                    <div className="badges-list">
                        {stats.badges.map((badge, index) => (
                            <div key={index} className="badge-item">
                                <span className="badge-icon">🏆</span>
                                <div>
                                    <strong>{badge.name}</strong>
                                    <p>{badge.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="dashboard-grid">
                {/* Список задач */}
                <div className="dashboard-section">
                    <h3>📚 Доступные задачи ({tasks.length})</h3>
                    
                    {tasks.length === 0 ? (
                        <p className="empty-message">Задач пока нет. Ожидайте добавления от учителей!</p>
                    ) : (
                        <div className="tasks-list">
                            {tasks.map(task => (
                                <div key={task._id} className="task-card">
                                    <div className="task-header">
                                        <h4>{task.title}</h4>
                                        <span className={`difficulty difficulty-${task.difficulty}`}>
                                            {'⭐'.repeat(task.difficulty)}
                                        </span>
                                    </div>
                                    <p className="task-description">{task.description}</p>
                                    <div className="task-footer">
                                        <span className="task-points">💎 {task.points} баллов</span>
                                        <span className="task-language">📝 {task.programmingLanguage}</span>
                                        <button 
                                              className="btn-solve"
                                              onClick={() => setSelectedTask(task)}
                                          >
                                              Решить
                                          </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Leaderboard */}
                <div className="dashboard-section leaderboard-section">
                    <h3>🏆 Топ студентов</h3>
                    {leaderboard.length === 0 ? (
                        <p className="empty-message">Пока нет данных</p>
                    ) : (
                        <div className="leaderboard-list">
                            {leaderboard.map((student, index) => (
                                <div key={student._id} className="leaderboard-item">
                                    <span className="rank">#{index + 1}</span>
                                    <div className="student-info">
                                        <strong>{student.name}</strong>
                                        <span className="points">{student.points} баллов</span>
                                    </div>
                                    {index === 0 && <span className="medal">🥇</span>}
                                    {index === 1 && <span className="medal">🥈</span>}
                                    {index === 2 && <span className="medal">🥉</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {selectedTask && (
                <TaskSubmission
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onSubmitSuccess={fetchData}
                />
            )}
        </div>
    );
};

export default StudentDashboard;

