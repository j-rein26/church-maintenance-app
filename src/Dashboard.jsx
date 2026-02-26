import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = ({ activeTab }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Modal & Logging State ---
  const [logModalTask, setLogModalTask] = useState(null);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [runTime, setRunTime] = useState("");
  const [notes, setNotes] = useState("");

  // --- History State ---
  const [historyData, setHistoryData] = useState({ title: "", logs: [], isOpen: false });

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        let categoryQuery;
        if (activeTab === "Generators") {
          categoryQuery = query(collection(db, "categories"), where("phase_id", "==", null));
        } else {
          const phaseSnap = await getDocs(query(collection(db, "phases"), where("name", "==", activeTab)));
          if (phaseSnap.empty) {
            setSections([]);
            setLoading(false);
            return;
          }
          const phaseId = phaseSnap.docs[0].id;
          categoryQuery = query(collection(db, "categories"), where("phase_id", "==", phaseId));
        }

        const unsubCategories = onSnapshot(categoryQuery, (catSnapshot) => {
          const categoryList = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const unsubTasks = onSnapshot(query(collection(db, "tasks")), (taskSnapshot) => {
            const allTasks = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const structuredData = categoryList.map(cat => ({
              ...cat,
              tasks: allTasks
                .filter(t => t.category_id === cat.id)
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
            })).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            setSections(structuredData);
            setLoading(false);
          });
        });
      } catch (error) {
        console.error("Error:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // --- Status & Countdown Helpers ---
  const getStatusColor = (task) => {
    if (!task.last_completed) return "gray";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

    const freq = (task.recurrence_type || "monthly").toLowerCase();
    let daysAllowed = 31; let warnWindow = 24;

    if (freq.includes("week")) { daysAllowed = 7; warnWindow = 5; }
    else if (freq.includes("month")) { daysAllowed = 31; warnWindow = 24; }
    else if (freq.includes("quarter")) { daysAllowed = 91; warnWindow = 81; }
    else if (freq.includes("semi")) { daysAllowed = 182; warnWindow = 167; }
    else if (freq.includes("annual") || freq.includes("year")) { daysAllowed = 365; warnWindow = 350; }

    if (diffDays >= daysAllowed) return "red";
    if (diffDays >= warnWindow) return "yellow";
    return "green";
  };

  const getDaysRemaining = (task) => {
    if (!task.last_completed) return "Pending";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    const freq = (task.recurrence_type || "monthly").toLowerCase();
    let totalAllowed = 31;
    if (freq.includes("week")) totalAllowed = 7;
    else if (freq.includes("month")) totalAllowed = 31;
    else if (freq.includes("quarter")) totalAllowed = 91;
    else if (freq.includes("semi")) totalAllowed = 182;
    else if (freq.includes("annual") || freq.includes("year")) totalAllowed = 365;

    const remaining = totalAllowed - diffDays;
    return remaining <= 0 ? "Overdue" : `${remaining}d left`;
  };

  // --- Actions ---
  const showTaskHistory = async (task) => {
    try {
      const q = query(collection(db, "entries"), where("task_id", "==", task.id), orderBy("timestamp", "desc"), limit(20));
      const snap = await getDocs(q);
      setHistoryData({ title: `History: ${task.name}`, logs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })), isOpen: true });
    } catch (e) { console.error(e); }
  };

  const showPhaseHistory = async () => {
    try {
      const q = query(collection(db, "entries"), where("category", "==", activeTab), orderBy("timestamp", "desc"), limit(50));
      const snap = await getDocs(q);
      setHistoryData({ title: `${activeTab} - Activity`, logs: snap.docs.map(doc => ({ id: doc.id, ...doc.data() })), isOpen: true });
    } catch (e) { console.error(e); }
  };

  const deleteLog = async (logId, task_id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "entries", logId));
      const q = query(collection(db, "entries"), where("task_id", "==", task_id), orderBy("timestamp", "desc"), limit(1));
      const snap = await getDocs(q);
      const taskRef = doc(db, "tasks", task_id);
      if (!snap.empty) {
        await updateDoc(taskRef, { last_completed: snap.docs[0].data().timestamp, status: "Completed" });
      } else {
        await updateDoc(taskRef, { last_completed: null, status: "Pending" });
      }
      setHistoryData(prev => ({ ...prev, logs: prev.logs.filter(log => log.id !== logId) }));
    } catch (e) { console.error(e); }
  };

  const handleLogClick = (task) => {
    setLogModalTask(task);
    setLogDate(new Date().toISOString().split('T')[0]);
    setRunTime(""); setNotes("");
  };

  const submitLog = async () => {
    if (!logModalTask) return;
    try {
      const selectedDate = new Date(logDate + "T12:00:00");
      await addDoc(collection(db, "entries"), {
        task_id: logModalTask.id, task_name: logModalTask.name, timestamp: selectedDate, 
        run_time: runTime || null, notes: notes || "Historical Data Entry", category: activeTab, logged_at: serverTimestamp(),
      });
      const currentLast = logModalTask.last_completed?.toDate ? logModalTask.last_completed.toDate() : new Date(logModalTask.last_completed || 0);
      if (selectedDate >= currentLast) {
        await updateDoc(doc(db, "tasks", logModalTask.id), { last_completed: selectedDate, status: "Completed" });
      }
      setLogModalTask(null);
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="generators-container">
      <div className="header-row no-print">
        <h1 className="main-title">{activeTab}</h1>
        <button type="button" className="phase-history-btn" onClick={showPhaseHistory}>🕒 Phase History</button>
      </div>

      {sections.map((category) => (
        <div key={category.id} className="generator-card">
          <div className="generator-section-header">{category.name}</div>
          <div className="task-list">
            {category.tasks.map((task) => (
              <div key={task.id} className="task-row">
                <div className="task-label-group">
                  <span className={`status-dot ${getStatusColor(task)}`}></span>
                  <div className="name-wrapper">
                    <span className="task-name">{task.name}</span>
                    <span className={`days-badge ${getStatusColor(task)}`}>{getDaysRemaining(task)}</span>
                  </div>
                </div>
                
                <div className="task-actions no-print">
                  <button type="button" className="history-link" onClick={() => showTaskHistory(task)}>History</button>
                  <button 
                    type="button" 
                    className={`log-btn ${getStatusColor(task) === "yellow" ? "yellow-warning" : ""}`} 
                    onClick={() => handleLogClick(task)}
                  >
                    Log
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* --- HISTORY MODAL --- */}
      {historyData.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content history-modal printable-history">
            <div className="modal-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <h2 style={{margin: 0}}>{historyData.title}</h2>
              <div className="modal-header-actions no-print">
                <button type="button" className="print-history-btn" onClick={() => window.print()}>🖨️ Print</button>
                <button type="button" className="close-x" style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer'}} onClick={() => setHistoryData({ ...historyData, isOpen: false })}>✕</button>
              </div>
            </div>
            <div className="history-scroll-area">
              {historyData.logs.map((log) => (
                <div key={log.id} className="history-card">
                   <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span className="history-date">{log.timestamp?.toDate().toLocaleDateString()}</span>
                    <button type="button" className="delete-log-btn no-print" onClick={() => deleteLog(log.id, log.task_id)}>🗑️</button>
                  </div>
                  {log.run_time && <p style={{margin: '5px 0'}}><strong>Run Time:</strong> {log.run_time}m</p>}
                  <p className="history-note-text">"{log.notes}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- LOG MODAL --- */}
      {logModalTask && (
        <div className="modal-overlay">
          <div className="modal-content log-modal" role="dialog" aria-modal="true">
            <h2 className="modal-title">Log Task</h2>
            <p className="modal-subtitle">{logModalTask.name}</p>
            
            <div className="log-input-group">
              <label htmlFor="log-date-field">Date Performed</label>
              <input 
                id="log-date-field"
                type="date" 
                className="calendar-input" 
                value={logDate} 
                onChange={(e) => setLogDate(e.target.value)}
                onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                onKeyDown={(e) => {
                  // SHIFT + TAB: Backwards Loop to Save Button
                  if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('modal-end').focus();
                  }
                }}
                onKeyUp={(e) => {
                  // Chrome Date Trap Escape
                  if (e.key === 'Tab' && !e.shiftKey) {
                    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
                    if (isChrome) {
                      const next = document.getElementById('runtime-input') || document.getElementById('notes-input');
                      if (next) next.focus();
                    }
                  }
                }}
              />
            </div>

            {activeTab === "Generators" && (
              <div className="log-input-group">
                <label htmlFor="runtime-input">Run Time (Minutes)</label>
                <input 
                  id="runtime-input"
                  type="number" 
                  className="calendar-input" 
                  value={runTime} 
                  onChange={(e) => setRunTime(e.target.value)} 
                />
              </div>
            )}

            <div className="log-input-group">
              <label htmlFor="notes-input">Notes</label>
              <textarea 
                id="notes-input"
                className="notes-area" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows="3"
                onKeyDown={(e) => {
                    // Manual Tab: Notes -> Cancel Button
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('modal-cancel').focus();
                    }
                }}
              />
            </div>

            <div className="modal-actions">
              <button 
                id="modal-cancel" 
                className="cancel-btn" 
                type="button"
                onClick={() => setLogModalTask(null)}
                onKeyDown={(e) => {
                    // Manual Tab: Cancel -> Save Button
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('modal-end').focus();
                    }
                    // Manual Shift+Tab: Cancel -> Notes
                    if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        document.getElementById('notes-input').focus();
                    }
                }}
              >
                Cancel
              </button>
              <button 
                id="modal-end" 
                className="confirm-btn" 
                type="button"
                onClick={submitLog}
                onKeyDown={(e) => {
                  // FORWARD LOOP: Save Button -> Date Field
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('log-date-field').focus();
                  }
                  // Backward Link: Save -> Cancel
                  if (e.key === 'Tab' && e.shiftKey) {
                      e.preventDefault();
                      document.getElementById('modal-cancel').focus();
                  }
                }}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


















