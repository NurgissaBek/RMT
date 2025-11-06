import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const QuizzesManager = () => {
  const { token } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', questionsText: '', assignedGroups: [] });

  const fetchQuizzes = async () => {
    const res = await fetch(`${API_BASE}/api/quizzes`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setQuizzes(data.quizzes);
  };

  const fetchGroups = async () => {
    const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setGroups(data.groups);
  };

  useEffect(() => { fetchQuizzes(); fetchGroups(); }, []);

  const parseQuestions = (text) => {
    // Each block separated by blank line; first line: question, next lines: options; prefix * marks correct
    return text.split(/\n\s*\n/).map(block => {
      const lines = block.split(/\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) return null;
      const text = lines[0];
      const choices = [];
      let correctIndex = 0;
      lines.slice(1).forEach((opt, idx) => {
        if (opt.startsWith('*')) { correctIndex = idx; choices.push(opt.slice(1).trim()); }
        else choices.push(opt);
      });
      return { text, choices, correctIndex, points: 1 };
    }).filter(Boolean);
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    const questions = parseQuestions(form.questionsText);
    const res = await fetch(`${API_BASE}/api/quizzes`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: form.title, description: form.description, questions, assignedGroups: form.assignedGroups })
    });
    const data = await res.json();
    if (data.success) { setShowCreate(false); setForm({ title: '', description: '', questionsText: '' }); fetchQuizzes(); }
    else alert(data.message || 'Ошибка создания квиза');
  };

  return (
    <div className="section">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3>Квизы</h3>
        <button className="btn-create" onClick={() => setShowCreate(true)}>+ Создать квиз</button>
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h3>Создать квиз</h3>
            <form onSubmit={createQuiz}>
              <div className="form-group"><label>Название *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
              </div>
              <div className="form-group"><label>Описание</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div className="form-group"><label>Вопросы (шаблон):</label>
                <textarea rows={8} value={form.questionsText} onChange={e=>setForm({...form,questionsText:e.target.value})}
                  placeholder={'Вопрос 1\n*Правильный вариант\nВариант 2\nВариант 3\n\nВопрос 2\nВариант 1\n*Правильный вариант'} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={()=>setShowCreate(false)}>Отмена</button>
                <button type="submit" className="btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="list">
        {quizzes.length === 0 ? <p className="empty">Нет квизов</p> : (
          quizzes.map(q => (
            <div key={q._id} className="task-row">
              <div className="task-row-content">
                <strong>{q.title}</strong>
                <span className="task-meta">вопросов: {q.questions?.length || 0} • групп: {q.assignedGroups?.length || 0}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div className="form-group">
          <label>Назначить группам</label>
          <select multiple value={form.assignedGroups} onChange={(e)=>{
            const arr = Array.from(e.target.options).filter(o=>o.selected).map(o=>o.value);
            setForm({...form, assignedGroups: arr});
          }} size={Math.min(6, Math.max(3, groups.length))}>
            {groups.map(g => (
              <option key={g._id} value={g._id}>{g.name} ({g.students.length} студ.)</option>
            ))}
          </select>
          <small>Оставьте пустым для доступа всем студентам</small>
        </div>
      )}
    </div>
  );
};

export default QuizzesManager;
