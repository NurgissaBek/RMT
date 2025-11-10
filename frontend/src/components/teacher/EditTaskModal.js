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
        autoCheckEnabled: !!task.autoCheckEnabled,
        timeLimit: typeof task.timeLimit === 'number' ? task.timeLimit : (typeof task.timeLimitMs === 'number' && task.timeLimitMs > 0 ? Math.round(task.timeLimitMs/1000) : 2),
        memoryLimit: typeof task.memoryLimit === 'number' ? task.memoryLimit : (typeof task.memoryLimitMb === 'number' && task.memoryLimitMb > 0 ? task.memoryLimitMb : 128),
        checker: task.checker?.type ? task.checker : { type: 'diff' },
        testCases: Array.isArray(task.testCases) ? task.testCases : [],
        testGroups: Array.isArray(task.testGroups) ? task.testGroups : []
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
                    <h2>✏️ Edit Task</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit} className="edit-task-form">
                    <div className="form-group">
                        <label>Task Title *</label>
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
                            /> Auto-check with code (Judge0)
                        </label>
                        <small>If disabled, only manual review by teacher</small>
                    </div>

                    {formData.autoCheckEnabled && (
                        <div className="form-group" style={{ border: '1px solid #eee', padding: 12, borderRadius: 8 }}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Time Limit (sec)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.timeLimit || 2}
                                        onChange={(e)=> setFormData({ ...formData, timeLimit: parseInt(e.target.value || '0') })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Memory Limit (MB)</label>
                                    <input
                                        type="number"
                                        min="16"
                                        value={formData.memoryLimit || 128}
                                        onChange={(e)=> setFormData({ ...formData, memoryLimit: parseInt(e.target.value || '0') })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Checker</label>
                                    <select
                                        value={formData.checker?.type || 'diff'}
                                        onChange={(e)=> setFormData({ ...formData, checker: { ...(formData.checker||{}), type: e.target.value } })}
                                    >
                                        <option value="diff">Strict (diff)</option>
                                        <option value="ignore_whitespace">Ignore whitespace</option>
                                        <option value="ignore_case_whitespace">Ignore case + whitespace</option>
                                    </select>
                                </div>
                            </div>

                            <hr />

                            <div style={{ marginBottom: 8, fontWeight: 600 }}>Test cases (simple)</div>
                            {(formData.testCases || []).length === 0 && (
                                <small>No test cases yet</small>
                            )}
                            {(formData.testCases || []).map((tc, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 120px 40px', gap: 8, marginBottom: 8 }}>
                                    <textarea
                                        placeholder="stdin"
                                        rows={2}
                                        value={tc.input || ''}
                                        onChange={(e)=>{
                                            const tcs = [...(formData.testCases||[])];
                                            tcs[idx] = { ...tcs[idx], input: e.target.value };
                                            setFormData({ ...formData, testCases: tcs, testGroups: [] });
                                        }}
                                    />
                                    <textarea
                                        placeholder="expected stdout"
                                        rows={2}
                                        value={tc.expectedOutput || ''}
                                        onChange={(e)=>{
                                            const tcs = [...(formData.testCases||[])];
                                            tcs[idx] = { ...tcs[idx], expectedOutput: e.target.value };
                                            setFormData({ ...formData, testCases: tcs, testGroups: [] });
                                        }}
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={tc.points ?? 10}
                                        onChange={(e)=>{
                                            const tcs = [...(formData.testCases||[])];
                                            tcs[idx] = { ...tcs[idx], points: parseInt(e.target.value || '0') };
                                            setFormData({ ...formData, testCases: tcs, testGroups: [] });
                                        }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <input
                                            type="checkbox"
                                            checked={!!tc.isHidden}
                                            onChange={(e)=>{
                                                const tcs = [...(formData.testCases||[])];
                                                tcs[idx] = { ...tcs[idx], isHidden: e.target.checked };
                                                setFormData({ ...formData, testCases: tcs, testGroups: [] });
                                            }}
                                        />
                                        Hidden
                                    </label>
                                    <button type="button" className="btn-danger" title="Remove" onClick={()=>{
                                        const tcs = [...(formData.testCases||[])];
                                        tcs.splice(idx,1);
                                        setFormData({ ...formData, testCases: tcs });
                                    }}>✕</button>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <button type="button" className="btn-secondary" onClick={()=>{
                                    setFormData({
                                        ...formData,
                                        testGroups: [],
                                        testCases: [ ...(formData.testCases||[]), { input: '', expectedOutput: '', points: 10, isHidden: false } ]
                                    });
                                }}>+ Add test</button>
                                <button type="button" className="btn-cancel" onClick={()=> setFormData({ ...formData, testCases: [] })}>Clear tests</button>
                            </div>

                            <div style={{ fontWeight: 600, marginBottom: 8 }}>OR grouped tests</div>
                            {(formData.testGroups || []).length === 0 && (
                                <small>No test groups (optional)</small>
                            )}
                            {(formData.testGroups || []).map((grp, gidx) => (
                                <div key={gidx} style={{ border: '1px dashed #ddd', padding: 8, borderRadius: 6, marginBottom: 10 }}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Group name</label>
                                            <input
                                                type="text"
                                                value={grp.name || ''}
                                                onChange={(e)=>{
                                                    const groupsLocal = [...(formData.testGroups||[])];
                                                    groupsLocal[gidx] = { ...groupsLocal[gidx], name: e.target.value };
                                                    setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
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
                                                    const groupsLocal = [...(formData.testGroups||[])];
                                                    groupsLocal[gidx] = { ...groupsLocal[gidx], weight: parseInt(e.target.value || '0') };
                                                    setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ alignSelf: 'end' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={grp.continueOnFailure !== false}
                                                    onChange={(e)=>{
                                                        const groupsLocal = [...(formData.testGroups||[])];
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], continueOnFailure: e.target.checked };
                                                        setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                                Continue on failure
                                            </label>
                                        </div>
                                        <div className="form-group" style={{ alignSelf: 'end' }}>
                                            <button type="button" className="btn-danger" onClick={()=>{
                                                const groupsLocal = [...(formData.testGroups||[])];
                                                groupsLocal.splice(gidx,1);
                                                setFormData({ ...formData, testGroups: groupsLocal });
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
                                                        const groupsLocal = [...(formData.testGroups||[])];
                                                        const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                        testsLocal[tidx] = { ...testsLocal[tidx], input: e.target.value };
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                        setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                                <textarea
                                                    placeholder="expected stdout"
                                                    rows={2}
                                                    value={t.expectedOutput || ''}
                                                    onChange={(e)=>{
                                                        const groupsLocal = [...(formData.testGroups||[])];
                                                        const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                        testsLocal[tidx] = { ...testsLocal[tidx], expectedOutput: e.target.value };
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                        setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={t.points ?? 1}
                                                    onChange={(e)=>{
                                                        const groupsLocal = [...(formData.testGroups||[])];
                                                        const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                        testsLocal[tidx] = { ...testsLocal[tidx], points: parseInt(e.target.value || '0') };
                                                        groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                        setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                    }}
                                                />
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={!!t.isHidden}
                                                        onChange={(e)=>{
                                                            const groupsLocal = [...(formData.testGroups||[])];
                                                            const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                            testsLocal[tidx] = { ...testsLocal[tidx], isHidden: e.target.checked };
                                                            groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                            setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                                        }}
                                                    />
                                                    Hidden
                                                </label>
                                                <button type="button" className="btn-danger" title="Remove" onClick={()=>{
                                                    const groupsLocal = [...(formData.testGroups||[])];
                                                    const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                                    testsLocal.splice(tidx,1);
                                                    groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                                    setFormData({ ...formData, testGroups: groupsLocal });
                                                }}>✕</button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn-secondary" onClick={()=>{
                                            const groupsLocal = [...(formData.testGroups||[])];
                                            const testsLocal = [...(groupsLocal[gidx].tests||[])];
                                            testsLocal.push({ input: '', expectedOutput: '', isHidden: false, points: 1 });
                                            groupsLocal[gidx] = { ...groupsLocal[gidx], tests: testsLocal };
                                            setFormData({ ...formData, testGroups: groupsLocal, testCases: [] });
                                        }}>+ Add test to group</button>
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="button" className="btn-secondary" onClick={()=>{
                                    setFormData({
                                        ...formData,
                                        testCases: [],
                                        testGroups: [ ...(formData.testGroups||[]), { name: 'default', weight: 100, continueOnFailure: true, tests: [] } ]
                                    });
                                }}>+ Add group</button>
                                <button type="button" className="btn-cancel" onClick={()=> setFormData({ ...formData, testGroups: [] })}>Clear groups</button>
                            </div>
                            <small style={{ display: 'block', marginTop: 8 }}>Use either simple test cases or grouped tests (if any group exists, simple tests will be ignored)</small>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Task Description *</label>
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
                            <label>Bloom Level *</label>
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
                            <label>Difficulty (1-5) *</label>
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
                            <label>Points *</label>
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
                            <label>Programming Language</label>
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
                        <label>Deadline (optional)</label>
                        <input
                            type="datetime-local"
                            name="deadline"
                            value={formData.deadline}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="form-group">
                        <label>Assign to Groups (leave empty for all students)</label>
                        <select
                            multiple
                            name="assignedGroups"
                            value={formData.assignedGroups}
                            onChange={handleGroupsChange}
                            size="5"
                        >
                            {groups.map(group => (
                                <option key={group._id} value={group._id}>
                                    {group.name} ({group.students?.length || 0} students)
                                </option>
                            ))}
                        </select>
                        <div style={{ marginTop: 8 }}>
                          <button type="button" className="btn-cancel" onClick={()=>setFormData({ ...formData, assignedGroups: [] })}>Clear Groups</button>
                        </div>
                        <small>Hold Ctrl/Cmd to select multiple groups</small>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn-save" disabled={loading}>
                            {loading ? 'Saving...' : '✅ Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskModal;
