import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../../../context/AuthContext';
import { API_BASE } from '../../../config';

const LecturesManager = () => {
  const { token } = useContext(AuthContext);
  const [lectures, setLectures] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', resources: '', assignedGroups: [] });
  const [files, setFiles] = useState([]);

  const fetchLectures = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/lectures`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        setLectures(data.lectures || []);
      } else {
        console.error('Failed to fetch lectures:', data.message);
        setLectures([]);
      }
    } catch (error) {
      console.error('Error fetching lectures:', error);
      setLectures([]);
    }
  };

  const fetchGroups = async () => {
    const res = await fetch(`${API_BASE}/api/groups`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setGroups(data.groups);
  };

  useEffect(() => { 
    fetchLectures(); 
    fetchGroups(); 
  }, [token]);

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
    if (data.success) {
      // If files selected, upload them
      if (files && files.length > 0) {
        try {
          const fd = new FormData();
          Array.from(files).forEach(file => fd.append('files', file));
          const uploadRes = await fetch(`${API_BASE}/api/lectures/${data.lecture._id}/attachments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          });
          const uploadData = await uploadRes.json();
          if (!uploadData.success) {
            alert(uploadData.message || 'Failed to upload attachments');
          }
        } catch {
          alert('Error uploading attachments');
        }
      }
      setShowCreate(false);
      setForm({ title: '', description: '', videoUrl: '', resources: '', assignedGroups: [] });
      setFiles([]);
      fetchLectures();
    }
    else alert(data.message || 'Error creating lecture');
  };

  const deleteLecture = async (lectureId) => {
    if (!window.confirm('Are you sure you want to delete this lecture?')) return;
    
    try {
      const res = await fetch(`${API_BASE}/api/lectures/${lectureId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Удаляем лекцию из локального состояния сразу, затем обновляем список
        setLectures(prev => prev.filter(l => l._id !== lectureId));
        // Обновляем список с сервера для уверенности
        await fetchLectures();
      } else {
        alert('Error: ' + (data.message || 'Failed to delete lecture'));
      }
    } catch (error) {
      alert('Error deleting lecture');
      console.error(error);
    }
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
              <div className="form-group">
                <label>Attachments (ppt, pdf, docx, etc.)</label>
                <input type="file" multiple onChange={(e)=>setFiles(e.target.files)} />
                <small>Up to 10 files, max 50MB each</small>
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
                <button 
                  className="btn-icon btn-danger"
                  onClick={() => deleteLecture(l._id)}
                  title="Delete Lecture"
                  style={{ marginLeft: '10px', backgroundColor: '#f44336', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LecturesManager;
