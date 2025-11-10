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
        autoCheckEnabled: false,
        timeLimit: 2,
        memoryLimit: 128,
        checker: { type: 'diff' },
        testCases: [],
        testGroups: []
    });
    const [newGroup, setNewGroup] = useState({
        name: '',
        description: '',
        color: '#667eea',
        studentEmails: '' // optional comma/newline separated
    });
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [studentEmailToAdd, setStudentEmailToAdd] = useState('');

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
            console.error('Error loading:', error);
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
                alert('✅ Task created!');
                setShowCreateTask(false);
                setNewTask({
                    title: '',
                    description: '',
                    bloomLevel: 'understanding',
                    difficulty: 3,
                    points: 10,
                    programmingLanguage: 'python',
                    deadline: '',
                    assignedGroups: [],
                    autoCheckEnabled: false,
                    timeLimit: 2,
                    memoryLimit: 128,
                    checker: { type: 'diff' },
                    testCases: [],
                    testGroups: []
                });
                fetchData();
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Error creating task');
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
                alert('✅ Task updated!');
                fetchData();
                return true;
            } else {
                alert('Ошибка: ' + data.message);
                return false;
            }
        } catch (error) {
            alert('Error updating task');
            return false;
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Delete this task?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Task deleted!');
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Error deleting task');
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
            alert('Error loading statistics');
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
                alert('✅ Group created!');
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
            alert('Error creating group');
        }
    };

    const handleAddStudentToGroup = async (groupId, email) => {
        try {
            const response = await fetch(`${API_BASE}/api/groups/${groupId}/students`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ studentEmail: email })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Student added to group!');
                setStudentEmailToAdd('');
                setShowAddStudent(false);
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Error adding student');
        }
    };

    const handleRemoveStudentFromGroup = async (groupId, studentId) => {
        if (!window.confirm('Remove student from group?')) return;

        try {
            const response = await fetch(`${API_BASE}/api/groups/${groupId}/students/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Student removed from group!');
                fetchData();
            } else {
                alert('Ошибка: ' + data.message);
            }
        } catch (error) {
            alert('Error removing student');
        }
    };

    const handleDeleteGroup = async (groupId, hasStudents) => {
        let password = null;
        
        // Если в группе есть студенты, требуется пароль
        if (hasStudents) {
            password = window.prompt('This group has students. Please enter your password to delete:');
            if (!password) {
                return; // Отменено пользователем
            }
        } else {
            if (!window.confirm('Delete this group?')) return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/groups/${groupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Group deleted!');
                fetchData();
            } else {
                if (data.requiresPassword) {
                    alert('Password required to delete group with students');
                } else {
                    alert('Ошибка: ' + data.message);
                }
            }
        } catch (error) {
            alert('Error deleting group');
        }
    };

    const handleReviewSubmission = async (submissionId, status, points, feedback, badges = []) => {
        try {
            const response = await fetch(`${API_BASE}/api/submissions/${submissionId}/review`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, pointsAwarded: points, feedback, badges })
            });

            const data = await response.json();

            if (data.success) {
                alert('✅ Submission reviewed!');
                fetchData();
                return true;
            } else {
                alert('Ошибка: ' + data.message);
                return false;
            }
        } catch (error) {
            alert('Error reviewing submission');
            return false;
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
                <h2>Teacher Dashboard 👨‍🏫</h2>
                <div className="header-actions">
                    <button className="btn-create" onClick={() => setShowCreateGroup(true)}>
                        ➕ Create Group
                    </button>
                    <button className="btn-create" onClick={() => setShowCreateTask(true)}>
                        ➕ Create Task
                    </button>

                    <button onClick={() => exportLogs('csv')} className="btn-secondary">📥 Export CSV</button>
                    <button onClick={() => exportLogs('xlsx')} className="btn-secondary">📊 Export XLSX</button>
                </div>
            </div>

            {activeTab === 'lectures' && (<LecturesManager />)}
            {activeTab === 'quizzes' && (<QuizzesManager />)}


            {/* Модальное окно создания задачи */}
            {showCreateTask && (
                <div className="modal-overlay" onClick={() => setShowCreateTask(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Task</h3>
                        <form onSubmit={handleCreateTask}>
                            <div className="form-group">
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                                    required
                                />
                        </div>

                        <div className="form-group">
                            <label>
                                <input type="checkbox" checked={newTask.autoCheckEnabled} onChange={(e)=>setNewTask({...newTask, autoCheckEnabled: e.target.checked})} /> Auto-check with code (Judge0)
                            </label>
                            <small>If disabled, only manual review by teacher</small>
                        </div>

                        {newTask.autoCheckEnabled && (
                            <div className="form-group" style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Time Limit (sec)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={newTask.timeLimit || 2}
                                            onChange={(e)=>setNewTask({ ...newTask, timeLimit: parseInt(e.target.value || '0') })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Memory Limit (MB)</label>
                                        <input
                                            type="number"
                                            min="16"
                                            value={newTask.memoryLimit || 128}
                                            onChange={(e)=>setNewTask({ ...newTask, memoryLimit: parseInt(e.target.value || '0') })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Checker</label>
                                        <select
                                            value={newTask.checker?.type || 'diff'}
                                            onChange={(e)=>setNewTask({ ...newTask, checker: { ...(newTask.checker||{}), type: e.target.value } })}
                                        >
                                            <option value="diff">Strict (diff)</option>
                                            <option value="ignore_whitespace">Ignore whitespace</option>
                                            <option value="ignore_case_whitespace">Ignore case + whitespace</option>
                                        </select>
                                    </div>
                                </div>

                                <hr />

                                <div style={{ marginBottom: 8, fontWeight: 600 }}>Test cases (simple)</div>
                                {(newTask.testCases || []).length === 0 && (
                                    <small>No test cases yet</small>
                                )}
                                {(newTask.testCases || []).map((tc, idx) => (
                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 40px', gap: 8, marginBottom: 8 }}>
                                        <textarea
                                            placeholder="stdin"
                                            rows={2}
                                            value={tc.input || ''}
                                            onChange={(e)=>{
                                                const tcs = [...(newTask.testCases||[])];
                                                tcs[idx] = { ...tcs[idx], input: e.target.value };
                                                setNewTask({ ...newTask, testCases: tcs, testGroups: [] });
                                            }}
                                        />
                                        <textarea
                                            placeholder="expected stdout"
                                            rows={2}
                                            value={tc.expectedOutput || ''}
                                            onChange={(e)=>{
                                                const tcs = [...(newTask.testCases||[])];
                                                tcs[idx] = { ...tcs[idx], expectedOutput: e.target.value };
                                                setNewTask({ ...newTask, testCases: tcs, testGroups: [] });
                                            }}
                                        />
                                        <input
                                            type="number"
                                            min="0"
                                            value={tc.points ?? 10}
                                            onChange={(e)=>{
                                                const tcs = [...(newTask.testCases||[])];
                                                tcs[idx] = { ...tcs[idx], points: parseInt(e.target.value || '0') };
                                                setNewTask({ ...newTask, testCases: tcs, testGroups: [] });
                                            }}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <input
                                                type="checkbox"
                                                checked={!!tc.isHidden}
                                                onChange={(e)=>{
                                                    const tcs = [...(newTask.testCases||[])];
                                                    tcs[idx] = { ...tcs[idx], isHidden: e.target.checked };
                                                    setNewTask({ ...newTask, testCases: tcs, testGroups: [] });
                                                }}
                                            />
                                            Hidden
                                        </label>
                                        <button type="button" className="btn-danger" title="Remove" onClick={()=>{
                                            const tcs = [...(newTask.testCases||[])];
                                            tcs.splice(idx,1);
                                            setNewTask({ ...newTask, testCases: tcs });
                                        }}>✕</button>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                    <button type="button" className="btn-secondary" onClick={()=>{
                                        setNewTask({
                                            ...newTask,
                                            testGroups: [],
                                            testCases: [ ...(newTask.testCases||[]), { input: '', expectedOutput: '', points: 10, isHidden: false } ]
                                        });
                                    }}>+ Add test</button>
                                    <button type="button" className="btn-cancel" onClick={()=> setNewTask({ ...newTask, testCases: [] })}>Clear tests</button>
                                </div>

                                <div style={{ fontWeight: 600, marginBottom: 8 }}>OR grouped tests</div>
                                {(newTask.testGroups || []).length === 0 && (
                                    <small>No test groups (optional)</small>
                                )}
                                {(newTask.testGroups || []).map((grp, gidx) => (
                                    <div key={gidx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 10 }}>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Group name</label>
                                                <input
                                                    type="text"
                                                    value={grp.name || ''}
                                                    onChange={(e)=>{
                                                        const groupsLocal = [...(newTask.testGroups||[])];
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], name: e.target.value };
                                                        setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Weight (%)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="1000"
                                                    value={grp.weight ?? 100}
                                                    onChange={(e)=>{
                                                        const groupsLocal = [...(newTask.testGroups||[])];
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], weight: parseInt(e.target.value || '0') };
                                                        setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                            </div>
                                            <div className="form-group" style={{ alignSelf: 'end' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={grp.continueOnFailure !== false}
                                                        onChange={(e)=>{
                                                            const groupsLocal = [...(newTask.testGroups||[])];
                                                            groupsLocal[gidx] = { ...groupsLocal[gidx], continueOnFailure: e.target.checked };
                                                            setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                        }}
                                                    />
                                                    Continue on failure
                                                </label>
                                            </div>
                                            <div className="form-group" style={{ alignSelf: 'end' }}>
                                                <button type="button" className="btn-danger" onClick={()=>{
                                                    const groupsLocal = [...(newTask.testGroups||[])];
                                                    groupsLocal.splice(gidx,1);
                                                    setNewTask({ ...newTask, testGroups: groupsLocal });
                                                }}>Remove group</button>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 6 }}>
                                            {(grp.tests || []).map((t, tidx) => (
                                                <div key={tidx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 40px', gap: 8, marginBottom: 8 }}>
                                                    <textarea
                                                        placeholder="stdin"
                                                        rows={2}
                                                        value={t.input || ''}
                                                        onChange={(e)=>{
                                                            const groupsLocal = [...(newTask.testGroups||[])];
                                                            const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                            testsLocal[tidx] = { ...testsLocal[tidx], input: e.target.value };
                                                            groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                            setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                        }}
                                                    />
                                                    <textarea
                                                        placeholder="expected stdout"
                                                        rows={2}
                                                        value={t.expectedOutput || ''}
                                                        onChange={(e)=>{
                                                            const groupsLocal = [...(newTask.testGroups||[])];
                                                            const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                            testsLocal[tidx] = { ...testsLocal[tidx], expectedOutput: e.target.value };
                                                            groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                            setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                        }}
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={t.points ?? 1}
                                                        onChange={(e)=>{
                                                            const groupsLocal = [...(newTask.testGroups||[])];
                                                            const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                            testsLocal[tidx] = { ...testsLocal[tidx], points: parseInt(e.target.value || '0') };
                                                            groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                            setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                        }}
                                                    />
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!t.isHidden}
                                                            onChange={(e)=>{
                                                                const groupsLocal = [...(newTask.testGroups||[])];
                                                                const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                                testsLocal[tidx] = { ...testsLocal[tidx], isHidden: e.target.checked };
                                                                groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                                setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                                            }}
                                                        />
                                                        Hidden
                                                    </label>
                                                    <button type="button" className="btn-danger" title="Remove" onClick={()=>{
                                                        const groupsLocal = [...(newTask.testGroups||[])];
                                                        const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                        testsLocal.splice(tidx,1);
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                        setNewTask({ ...newTask, testGroups: groupsLocal });
                                                    }}>✕</button>
                                                </div>
                                            ))}
                                            <button type="button" className="btn-secondary" onClick={()=>{
                                                const groupsLocal = [...(newTask.testGroups||[])];
                                                const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                testsLocal.push({ input: '', expectedOutput: '', isHidden: false, points: 1 });
                                                groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                setNewTask({ ...newTask, testGroups: groupsLocal, testCases: [] });
                                            }}>+ Add test to group</button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button" className="btn-secondary" onClick={()=>{
                                        setNewTask({
                                            ...newTask,
                                            testCases: [],
                                            testGroups: [ ...(newTask.testGroups||[]), { name: 'default', weight: 100, continueOnFailure: true, tests: [] } ]
                                        });
                                    }}>+ Add group</button>
                                    <button type="button" className="btn-cancel" onClick={()=> setNewTask({ ...newTask, testGroups: [] })}>Clear groups</button>
                                </div>
                                <small style={{ display: 'block', marginTop: 8 }}>Use either simple test cases or grouped tests (if any group exists, simple tests will be ignored)</small>
                            </div>
                        )}

                            <div className="form-group">
                                <label>Description *</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                                    required
                                    rows="4"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Bloom Level</label>
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
                                    <label>Difficulty (1-5)</label>
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
                                    <label>Points</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={newTask.points}
                                        onChange={(e) => setNewTask({...newTask, points: parseInt(e.target.value)})}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Programming Language</label>
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
                                <label>Deadline (optional)</label>
                                <input
                                    type="datetime-local"
                                    value={newTask.deadline}
                                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Assign to Groups (empty = all students)</label>
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
                                            {group.name} ({group.students?.length || 0} students)
                                        </option>
                                    ))}
                                </select>
                                <small>Hold Ctrl/Cmd to select multiple</small>
                            </div>


                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateTask(false)} className="btn-cancel">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    Create
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
                        <h3>Create New Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <div className="form-group">
                                <label>Group Name *</label>
                                <input
                                    type="text"
                                    value={newGroup.name}
                                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newGroup.description}
                                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                                    rows="3"
                                />
                            </div>

                            <div className="form-group">
                                <label>Group Color</label>
                                <input
                                    type="color"
                                    value={newGroup.color}
                                    onChange={(e) => setNewGroup({...newGroup, color: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Student Emails (comma or newline separated)</label>
                                <textarea
                                    rows="3"
                                    value={newGroup.studentEmails || ''}
                                    onChange={(e) => setNewGroup({ ...newGroup, studentEmails: e.target.value })}
                                    placeholder="student1@example.com, student2@example.com"
                                />
                                <small>Will be added to group immediately after creation</small>
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowCreateGroup(false)} className="btn-cancel">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    Create
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
                            <h2>📊 Statistics: {selectedTask.title}</h2>
                            <button className="btn-close" onClick={() => setShowTaskStats(false)}>✕</button>
                        </div>
                        <div className="stats-content">
                            <div className="stats-grid-modal">
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.totalSubmissions}</div>
                                    <div className="stat-label">Total Submissions</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.uniqueStudentsAttempted}</div>
                                    <div className="stat-label">Students Attempted</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.solvedByStudents}</div>
                                    <div className="stat-label">Solved</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.pendingSubmissions}</div>
                                    <div className="stat-label">Pending Review</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{taskStats.averagePoints}</div>
                                    <div className="stat-label">Average Points</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="stats-row">
                <div className="stat-box">
                    <h3>{tasks.length}</h3>
                    <p>Total Tasks</p>
                </div>
                <div className="stat-box">
                    <h3>{submissions.length}</h3>
                    <p>Pending Review</p>
                </div>
                <div className="stat-box">
                    <h3>{groups.length}</h3>
                    <p>Groups</p>
                </div>
            </div>

            <div className="teacher-grid">
                <div className="section">
                    <h3>📚 My Tasks</h3>
                    {tasks.length === 0 ? (
                        <p className="empty">No tasks yet</p>
                    ) : (
                        <div className="tasks-table">
                            {tasks.map(task => (
                                <div key={task._id} className="task-row">
                                    <div className="task-row-content">
                                        <strong>{task.title}</strong>
                                        <span className="task-meta">
                                            {'⭐'.repeat(task.difficulty)} • {task.points} points
                                            {task.deadline && ` • ⏰ ${new Date(task.deadline).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                    <div className="task-row-actions">
                                        <button 
                                            className="btn-icon"
                                            onClick={() => handleViewTaskStats(task)}
                                            title="Statistics"
                                        >
                                            📊
                                        </button>
                                        <button 
                                            className="btn-icon"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setShowEditTask(true);
                                            }}
                                            title="Edit"
                                        >
                                            ✏️
                                        </button>
                                        <button 
                                            className="btn-icon btn-danger"
                                            onClick={() => handleDeleteTask(task._id)}
                                            title="Delete"
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
                    <h3>✍️ Submissions Pending Review</h3>
                    {submissions.length === 0 ? (
                        <p className="empty">No submissions</p>
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
                                        <button className="btn-secondary" onClick={() => setReviewing(sub)}>👁 View</button>
                                        <button 
                                            className="btn-approve"
                                            onClick={() => handleReviewSubmission(sub._id, 'approved', sub.task.points, 'Great!')}
                                        >
                                            ✅ Approve
                                        </button>
                                        <button 
                                            className="btn-reject"
                                            onClick={() => handleReviewSubmission(sub._id, 'rejected', 0, 'Needs revision')}
                                        >
                                            ❌ Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="section">
                    <h3>👥 Groups</h3>
                    {groups.length === 0 ? (
                        <p className="empty">No groups yet</p>
                    ) : (
                        <div className="groups-list">
                            {groups.map(group => (
                                <div key={group._id} className="group-card" style={{ borderLeft: `4px solid ${group.color}` }}>
                                    <div className="group-header">
                                        <strong>{group.name}</strong>
                                        <span>{group.students?.length || 0} students</span>
                                    </div>
                                    {group.description && <p className="group-description">{group.description}</p>}
                                    <div className="group-students">
                                        <strong>Students:</strong>
                                        {group.students && group.students.length > 0 ? (
                                            <ul>
                                                {group.students.map(student => (
                                                    <li key={student._id || student}>
                                                        {typeof student === 'object' ? student.name : 'Loading...'}
                                                        <button 
                                                            className="btn-icon btn-danger"
                                                            onClick={() => handleRemoveStudentFromGroup(group._id, student._id || student)}
                                                            title="Remove from group"
                                                        >
                                                            ✕
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="empty">No students in group</p>
                                        )}
                                    </div>
                                    <div className="group-actions">
                                        <button 
                                            className="btn-secondary"
                                            onClick={() => {
                                                setSelectedGroup(group);
                                                setShowAddStudent(true);
                                            }}
                                        >
                                            ➕ Add Student
                                        </button>
                                        <button 
                                            className="btn-secondary btn-danger"
                                            onClick={() => handleDeleteGroup(group._id, (group.students?.length || 0) > 0)}
                                            style={{ marginLeft: '10px', backgroundColor: '#f44336', color: 'white' }}
                                        >
                                            🗑️ Delete Group
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

            {/* Модальное окно добавления студента в группу */}
            {showAddStudent && selectedGroup && (
                <div className="modal-overlay" onClick={() => {
                    setShowAddStudent(false);
                    setSelectedGroup(null);
                    setStudentEmailToAdd('');
                }}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Add Student to Group "{selectedGroup.name}"</h3>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            handleAddStudentToGroup(selectedGroup._id, studentEmailToAdd);
                        }}>
                            <div className="form-group">
                                <label>Student Email *</label>
                                <input
                                    type="email"
                                    value={studentEmailToAdd}
                                    onChange={(e) => setStudentEmailToAdd(e.target.value)}
                                    placeholder="student@example.com"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowAddStudent(false);
                                        setSelectedGroup(null);
                                        setStudentEmailToAdd('');
                                    }} 
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;    






