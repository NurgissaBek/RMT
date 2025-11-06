import React, { useState } from 'react';
import './EditTaskModal.css';

const EditTaskModal = ({ task, onClose, onUpdate, groups }) => {
    const [formData, setFormData] = useState({
        title: task.title || '',
        description: task.description || '',
        bloomLevel: task.bloomLevel || 'understanding',
        difficulty: task.difficulty || 3,
        points: task.points || 10,
        programmingLanguage: task.programmingLanguage || 'python',
        deadline: task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '',
        assignedGroups: task.assignedGroups?.map(g => g._id) || [],
        autoCheckEnabled: !!task.autoCheckEnabled
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleGroupsChange = (e) => {
        const options = e.target.options;
        const selected = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(options[i].value);
            }
        }
        setFormData({ ...formData, assignedGroups: selected });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const success = await onUpdate(task._id, formData);
        
        if (success) {
            onClose();
        }
        
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="edit-task-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>✏️ Редактировать задачу</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="edit-task-form">
                    <div className="form-group">
                        <label>Название задачи *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                name="autoCheckEnabled"
                                checked={formData.autoCheckEnabled}
                                onChange={(e)=> setFormData({ ...formData, autoCheckEnabled: e.target.checked })}
                            /> Проверка кодом (Judge0)
                        </label>
                        <small>Если выключено — проверка только вручную преподавателем</small>
                    </div>

                    <div className="form-group">
                        <label>Описание задачи *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            required
                            rows="5"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Уровень Блума *</label>
                            <select
                                name="bloomLevel"
                                value={formData.bloomLevel}
                                onChange={handleChange}
                            >
                                <option value="remembering">Remembering</option>
                                <option value="understanding">Understanding</option>
                                <option value="applying">Applying</option>
                                <option value="analyzing">Analyzing</option>
                                <option value="evaluating">Evaluating</option>
                                <option value="creating">Creating</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Сложность (1-5) *</label>
                            <input
                                type="number"
                                name="difficulty"
                                min="1"
                                max="5"
                                value={formData.difficulty}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Баллы *</label>
                            <input
                                type="number"
                                name="points"
                                min="1"
                                value={formData.points}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Язык программирования</label>
                            <select
                                name="programmingLanguage"
                                value={formData.programmingLanguage}
                                onChange={handleChange}
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
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Назначить группам (оставьте пустым для всех студентов)</label>
                        <select
                            multiple
                            name="assignedGroups"
                            value={formData.assignedGroups}
                            onChange={handleGroupsChange}
                            size="5"
                        >
                            {groups.map(group => (
                                <option key={group._id} value={group._id}>
                                    {group.name} ({group.students.length} студ.)
                                </option>
                            ))}
                        </select>
                        <div style={{ marginTop: 8 }}>
                          <button type="button" className="btn-cancel" onClick={()=>setFormData({ ...formData, assignedGroups: [] })}>Очистить группы</button>
                        </div>
                        <small>Удерживайте Ctrl/Cmd для выбора нескольких групп</small>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Отмена
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Сохранение...' : '✅ Сохранить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskModal;
