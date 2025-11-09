import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const LecturesManager = () => {
  const { token } = useContext(AuthContext);
  const [lectures, setLectures] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', resources: '', assignedGroups: [] });

  const fetchLectures = async () => {
    const res = await fetch(`${API_BASE}/api/lectures`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setLectures(data.lectures);
  };

  const fetchGroups = async () => {
    const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setGroups(data.groups);
  };

  useEffect(() => { fetchLectures(); fetchGroups(); }, []);

  const createLecture = async (e) => {
    e.preventDefault();
    const resources = (form.resources || '')
      .split(/\n/).map(l => l.trim()).filter(Boolean)
      .map(line => {
        const [title, url] = line.split('|').map(s => s.trim());
        return { title, url };
      });
    const body = { title: form.title, description: form.description, videoUrl: form.videoUrl, resources, assignedGroups: form.assignedGroups };
    const res = await fetch(`${API_BASE}/api/lectures`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) { setShowCreate(false); setForm({ title: '', description: '', videoUrl: '', resources: '' }); fetchLectures(); }
    else alert(data.message || 'Error creating lecture');
  };

  return (
    <div className="section">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h3>Lectures</h3>
        <button className="btn-create" onClick={() => setShowCreate(true)}>+ Create Lecture</button>
      </div>
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <h3>Create Lecture</h3>
            <form onSubmit={createLecture}>
              <div className="form-group"><label>Title *</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
              </div>
              <div className="form-group"><label>Description</label>
                <textarea rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
              </div>
              <div className="form-group"><label>Video URL</label>
                <input value={form.videoUrl} onChange={e=>setForm({...form,videoUrl:e.target.value})} placeholder="https://..." />
              </div>
              <div className="form-group"><label>Resources (each line: Title | URL)</label>
                <textarea rows={3} value={form.resources} onChange={e=>setForm({...form,resources:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Assign to Groups</label>
                <select multiple value={form.assignedGroups} onChange={(e)=>{
                  const arr = Array.from(e.target.options).filter(o=>o.selected).map(o=>o.value);
                  setForm({...form, assignedGroups: arr});
                }} size={Math.min(6, Math.max(3, groups.length))}>
                  {groups.map(g => (
                    <option key={g._id} value={g._id}>{g.name} ({g.students?.length || 0} students)</option>
                  ))}
                </select>
                <small>Leave empty for all students</small>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={()=>setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="list">
        {lectures.length === 0 ? <p className="empty">No lectures</p> : (
          lectures.map(l => (
            <div key={l._id} className="task-row">
              <div className="task-row-content">
                <strong>{l.title}</strong>
                <span className="task-meta">{l.videoUrl ? '🎥 video' : '—'} • groups: {l.assignedGroups?.length || 0}</span>
              </div>
              <div className="task-row-actions">
                {l.videoUrl && <a className="btn-secondary" href={l.videoUrl} target="_blank" rel="noreferrer">Open Video</a>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LecturesManager;
