import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { API_BASE } from '../../config';
import EditTaskModal from './EditTaskModal';
import './TeacherDashboard.css';
import LiveLogs from './LiveLogs';
import SubmissionReviewModal from './SubmissionReviewModal';
import LecturesManager from './lectures/LecturesManager';
import QuizzesManager from './quizzes/QuizzesManager';


const TeacherDashboard = () => {
    const { token } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [groups, setGroups] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | lectures | quizzes
    const [reviewing, setReviewing] = useState(null); // submission
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [showEditTask, setShowEditTask] = useState(false);
    const [showTaskStats, setShowTaskStats] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [taskStats, setTaskStats] = useState(null);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        bloomLevel: 'understanding',
        difficulty: 3,
        points: 10,
        programmingLanguage: 'python',
        deadline: '',
        assignedGroups: [],
        autoCheckEnabled: false
    });
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        color: '#667eea',
        studentEmails: '' // optional comma/newline separated
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Задачи
            const tasksRes = await fetch(`${API_BASE}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasksData = await tasksRes.json();
            if (tasksData.success) setTasks(tasksData.tasks);

            // Решения на проверке
            const subsRes = await fetch(`${API_BASE}/api/submissions/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const subsData = await subsRes.json();
            if (subsData.success) setSubmissions(subsData.submissions);

            // Группы
            const groupsRes = await fetch(`${API_BASE}/api/groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const groupsData = await groupsRes.json();
            if (groupsData.success) setGroups(groupsData.groups);

        } catch (error) {
            console.error('Ошибка загрузки:', error);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        
        try {
            const response = await fetch(`${API_BASE}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTask)
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Задача создана!');
                setShowCreateTask(false);
                setNewTask({
                    title: '',
                    description: '',
                    bloomLevel: 'understanding',
                    difficulty: 3,
                    points: 10,
                    programmingLanguage: 'python',
                    deadline: '',
                    assignedGroups: []
                });
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка создания задачи');
        }
    };

    const handleUpdateTask = async (taskId, updatedData) => {
        try {
            const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Задача обновлена!');
                fetchData();
                return true;
            } else {
                alert('Ошибка: ' + data.message);
                return false;
            }
        } catch (error) {
            alert('Ошибка обновления задачи');
            return false;
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Удалить эту задачу?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Задача удалена!');
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка удаления задачи');
        }
    };

    const handleViewTaskStats = async (task) => {
        try {
            const response = await fetch(`${API_BASE}/api/tasks/${task._id}/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                setSelectedTask(task);
                setTaskStats(data.stats);
                setShowTaskStats(true);
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка загрузки статистики');
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch(`${API_BASE}/api/groups`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newGroup)
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Группа создана!');
                // optionally add students by email
                if (newGroup.studentEmails && newGroup.studentEmails.trim()) {
                    const emails = newGroup.studentEmails.split(/[,\n;]/).map(e => e.trim()).filter(Boolean);
                    for (const email of emails) {
                        try {
                            await fetch(`${API_BASE}/api/groups/${data.group._id}/students`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ studentEmail: email })
                            });
                        } catch (_) {}
                    }
                }
                setShowCreateGroup(false);
                setNewGroup({ name: '', description: '', color: '#667eea', studentEmails: '' });
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка создания группы');
        }
    };

    const handleReviewSubmission = async (submissionId, status, points, feedback) => {
        try {
            const response = await fetch(`${API_BASE}/api/submissions/${submissionId}/review`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, pointsAwarded: points, feedback })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Решение проверено!');
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Ошибка проверки');
        }
    };
    const exportLogs = async (format = 'csv') => {
        const res = await fetch(`${API_BASE}/api/logs/export?format=${format}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
        a.click();
        URL.revokeObjectURL(url);
    };


    return (
        <div className="teacher-dashboard">
            <div className="dashboard-header">
                <h2>Панель учителя 👨‍🏫</h2>
                <div className="header-actions">
                    <button className="btn-create" onClick={() => setShowCreateGroup(true)}>
                        ➕ Создать группу
                    </button>
                    <button className="btn-create" onClick={() => setShowCreateTask(true)}>
                        ➕ Создать задачу
                    </button>

                    <button onClick={() => exportLogs('csv')}>📥 Экспорт CSV</button>
                    <button onClick={() => exportLogs('xlsx')}>📊 Экспорт XLSX</button>
                </div>
            </div>

            {activeTab === 'lectures' && (<LecturesManager />)}
            {activeTab === 'quizzes' && (<QuizzesManager />)}


            {/* Модальное окно создания задачи */}
            {showCreateTask && (
                <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Создать новую задачу</h3>
                        <form onSubmit={handleCreateTask}>
                            <div className="form-group">
                                <label>Название *</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                    required
                                />
                        </div>

                        <div className="form-group">
                            <label>
                                <input type="checkbox" checked={newTask.autoCheckEnabled} onChange={(e)=>setNewTask({...newTask, autoCheckEnabled: e.target.checked})} /> Проверка кодом (Judge0)
                            </label>
                            <small>Если выключено — проверка только вручную преподавателем</small>
                        </div>

                            <div className="form-group">
                                <label>Описание *</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                    required
                                    rows="4"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Уровень Блума</label>
                                    <select
                                        value={newTask.bloomLevel}
                                        onChange={(e) => setNewTask({...newTask, bloomLevel: e.target.value})}
                                    >
                                        <option value="remembering">Remembering</option>
                                        <option value="understanding">Understanding</option>
                                        <option value="applying">Applying</option>
                                        <option value="analyzing">Analyzing</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Сложность (1-5)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={newTask.difficulty}
                                        onChange={(e) => setNewTask({...newTask, difficulty: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Баллы</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newTask.points}
                                        onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Язык</label>
                                    <select
                                        value={newTask.programmingLanguage}
                                        onChange={(e) => setNewTask({...newTask, programmingLanguage: e.target.value})}
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Дедлайн (опционально)</label>
                                <input
                                    type="datetime-local"
                                    value={newTask.deadline}
                                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Назначить группам (пусто = все студенты)</label>
                                <select
                                    multiple
                                    value={newTask.assignedGroups}
                                    onChange={(e) => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setNewTask({...newTask, assignedGroups: selected});
                                    }}
                                    size="4"
                                >
                                    {groups.map(group => (
                                        <option key={group._id} value={group._id}>
                                            {group.name} ({group.students.length} студ.)
                                        </option>
                                    ))}
                                </select>
                                <small>Ctrl/Cmd для выбора нескольких</small>
                            </div>

                            <div className="form-group">
                                <label>Emails студентов (через запятую или с новой строки)</label>
                                <textarea
                                    rows="3"
                                    value={newGroup.studentEmails || ''}
                                    onChange={(e) => setNewGroup({ ...newGroup, studentEmails: e.target.value })}
                                    placeholder="student1@example.com, student2@example.com"
                                />
                                <small>Будут добавлены в группу сразу после создания</small>
                            </div>

                            <div className="form-group">
                                <label>Emails студентов (через запятую или с новой строки)</label>
                                <textarea
                                    rows="3"
                                    value={newGroup.studentEmails || ''}
                                    onChange={(e) => setNewGroup({ ...newGroup, studentEmails: e.target.value })}
                                    placeholder="student1@example.com, student2@example.com"
                                />
                                <small>Будут добавлены в группу сразу после создания</small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateTask(false)} className="btn-cancel">
                                    Отмена
                                </button>
                                <button type="submit" className="btn-submit">
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Модальное окно создания группы */}
            {showCreateGroup && (
                <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Создать новую группу</h3>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label>Название группы *</label>
                                <input
                                    type="text"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Описание</label>
                                <textarea
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label>Цвет группы</label>
                                <input
                                    type="color"
                                    value={newGroup.color}
                                    onChange={(e) => setNewGroup({...newGroup, color: e.target.value})}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateGroup(false)} className="btn-cancel">
                                    Отмена
                                </button>
                                <button type="submit" className="btn-submit">
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Модальное окно редактирования задачи */}
            {showEditTask && selectedTask && (
                <EditTaskModal
                    task={selectedTask}
                    onClose={() => {
                        setShowEditTask(false);
                        setSelectedTask(null);
                    }}
                    onUpdate={handleUpdateTask}
                    groups={groups}
                />
            )}

            {/* Модальное окно статистики задачи */}
            {showTaskStats && selectedTask && taskStats && (
                <div className="modal-overlay" onClick={() => setShowTaskStats(false)}>
                    <div className="stats-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>📊 Статистика: {selectedTask.title}</h2>
                            <button className="btn-close" onClick={() => setShowTaskStats(false)}>✕</button>
                        </div>
                        <div className="stats-content">
                            <div className="stats-grid-modal">
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.totalSubmissions}</div>
                                    <div className="stat-label">Всего отправок</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.uniqueStudentsAttempted}</div>
                                    <div className="stat-label">Студентов пытались</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.solvedByStudents}</div>
                                    <div className="stat-label">Решили задачу</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.pendingSubmissions}</div>
                                    <div className="stat-label">На проверке</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.averagePoints}</div>
                                    <div className="stat-label">Средний балл</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-row">
                <div className="stat-box">
                    <h3>{tasks.length}</h3>
                    <p>Всего задач</p>
                </div>
                <div className="stat-box">
                    <h3>{submissions.length}</h3>
                    <p>На проверке</p>
                </div>
                <div className="stat-box">
                    <h3>{groups.length}</h3>
                    <p>Групп</p>
                </div>
            </div>

            <div className="teacher-grid">
                <div className="section">
                    <h3>📚 Мои задачи</h3>
                    {tasks.length === 0 ? (
                        <p className="empty">Задач пока нет</p>
                    ) : (
                        <div className="tasks-table">
                            {tasks.map(task => (
                                <div key={task._id} className="task-row">
                                    <div className="task-row-content">
                                        <strong>{task.title}</strong>
                                        <span className="task-meta">
                                            {'⭐'.repeat(task.difficulty)} • {task.points} баллов
                                            {task.deadline && ` • ⏰ ${new Date(task.deadline).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                    <div className="task-row-actions">
                                        <button 
                                            className="btn-icon"
                                            onClick={() => handleViewTaskStats(task)}
                                            title="Статистика"
                                        >
                                            📊
                                        </button>
                                        <button 
                                            className="btn-icon"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setShowEditTask(true);
                                            }}
                                            title="Редактировать"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            className="btn-icon btn-danger"
                                            onClick={() => handleDeleteTask(task._id)}
                                            title="Удалить"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="section">
                    <h3>✍️ Решения на проверке</h3>
                    {submissions.length === 0 ? (
                        <p className="empty">Нет решений</p>
                    ) : (
                        <div className="submissions-list">
                            {submissions.map(sub => (
                                <div key={sub._id} className="submission-card">
                                    <div className="sub-header">
                                        <strong>{sub.student.name}</strong>
                                        <span>{sub.task.title}</span>
                                    </div>
                                    <pre className="code-preview">{sub.code.substring(0, 200)}...</pre>
                                    <div className="sub-actions">
                                        <button className="btn-secondary" onClick={() => setReviewing(sub)}>👁 Просмотреть</button>
                                        <button 
                                            className="btn-approve"
                                            onClick={() => handleReviewSubmission(sub._id, 'approved', sub.task.points, 'Отлично!')}
                                        >
                                            ✅ Принять
                                        </button>
                                        <button 
                                            className="btn-reject"
                                            onClick={() => handleReviewSubmission(sub._id, 'rejected', 0, 'Нужны исправления')}
                                        >
                                            ❌ Отклонить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="section">
                    <LiveLogs />
                </div>
            </div>
            {/* Лекции и Квизы (временно показываем всегда, пока вкладки не активны) */}
            <LecturesManager />
            <QuizzesManager />

            {reviewing && (
                <SubmissionReviewModal
                    submission={reviewing}
                    onClose={() => setReviewing(null)}
                    onReview={handleReviewSubmission}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;    






