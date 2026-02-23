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

  // --- Status & Countdown Helpers (Fixed for Annual 365-day Logic) ---
  const getStatusColor = (task) => {
    if (!task.last_completed) return "gray";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

    const freq = task.recurrence_type?.toLowerCase().trim() || "monthly";

    const schedules = {
      weekly: { due: 7, warn: 5 },
      monthly: { due: 31, warn: 24 },
      quarterly: { due: 91, warn: 81 },
      semiannual: { due: 182, warn: 167 },
      annual: { due: 365, warn: 350 }
    };

    const s = schedules[freq] || schedules.monthly;
    if (diffDays >= s.due) return "red";
    if (diffDays >= s.warn) return "yellow";
    return "green";
  };

  const getDaysRemaining = (task) => {
    if (!task.last_completed) return "Pending";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    const freq = task.recurrence_type?.toLowerCase().trim() || "monthly";
    const schedules = { weekly: 7, monthly: 31, quarterly: 91, semiannual: 182, annual: 365 };
    
    const totalAllowed = schedules[freq] || 31;
    const remaining = totalAllowed - diffDays;

    return remaining <= 0 ? "Overdue" : `${remaining}d left`;
  };

  // --- History Logic (Fetch, Smart Delete, Print) ---
  const showTaskHistory = async (task) => {
    try {
      const q = query(
        collection(db, "entries"),
        where("task_id", "==", task.id),
        orderBy("timestamp", "desc"),
        limit(20)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryData({ title: `History: ${task.name}`, logs, isOpen: true });
    } catch (e) {
      alert("Database index is being built. Try again in 2 minutes.");
    }
  };

  const showPhaseHistory = async () => {
    try {
      const q = query(
        collection(db, "entries"),
        where("category", "==", activeTab),
        orderBy("timestamp", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryData({ title: `${activeTab} - Recent Activity`, logs, isOpen: true });
    } catch (e) {
      alert("Database index is being built. Try again in 2 minutes.");
    }
  };

  const deleteLog = async (logId, task_id) => {
    if (!window.confirm("Are you sure you want to delete this log? Status will revert to previous entry.")) return;
    try {
      // 1. Delete the entry
      await deleteDoc(doc(db, "entries", logId));

      // 2. Find the new "most recent" entry
      const q = query(
        collection(db, "entries"),
        where("task_id", "==", task_id),
        orderBy("timestamp", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      const taskRef = doc(db, "tasks", task_id);

      if (!snap.empty) {
        const prevEntry = snap.docs[0].data();
        await updateDoc(taskRef, {
          last_completed: prevEntry.timestamp,
          status: "Completed"
        });
      } else {
        await updateDoc(taskRef, {
          last_completed: null,
          status: "Pending"
        });
      }

      // 3. Update local state
      setHistoryData(prev => ({
        ...prev,
        logs: prev.logs.filter(log => log.id !== logId)
      }));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // --- Logging Logic ---
  const handleLogClick = (task) => {
    setLogModalTask(task);
    setLogDate(new Date().toISOString().split('T')[0]);
    setRunTime("");
    setNotes("");
  };

  const submitLog = async () => {
    if (!logModalTask) return;
    try {
      const selectedDate = new Date(logDate + "T12:00:00");
      await addDoc(collection(db, "entries"), {
        task_id: logModalTask.id,
        task_name: logModalTask.name,
        timestamp: selectedDate, 
        run_time: runTime || null,
        notes: notes || "Historical Data Entry",
        category: activeTab,
        logged_at: serverTimestamp(),
      });

      const currentLastCompleted = logModalTask.last_completed?.toDate 
        ? logModalTask.last_completed.toDate() 
        : new Date(logModalTask.last_completed || 0);

      if (selectedDate >= currentLastCompleted) {
        await updateDoc(doc(db, "tasks", logModalTask.id), {
          last_completed: selectedDate,
          status: "Completed"
        });
      }
      setLogModalTask(null);
    } catch (e) {
      alert("Error saving log.");
    }
  };

  if (loading) return <div className="loading">Loading {activeTab}...</div>;

  return (
    <div className="generators-container">
      <div className="header-row no-print">
        <h1 className="main-title">{activeTab}</h1>
        <button className="phase-history-btn" onClick={showPhaseHistory}>
          🕒 Phase History
        </button>
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
                    <span className={`days-badge ${getStatusColor(task)}`}>
                      {getDaysRemaining(task)}
                    </span>
                  </div>
                </div>
                
                <div className="task-actions no-print">
                  <button className="history-link" onClick={() => showTaskHistory(task)}>
                    History
                  </button>
                  <button 
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
            <div className="modal-header">
              <h2>{historyData.title}</h2>
              <div className="modal-header-actions no-print">
                <button className="print-history-btn" onClick={() => window.print()}>🖨️ Print Log</button>
                <button className="close-x" onClick={() => setHistoryData({ ...historyData, isOpen: false })}>✕</button>
              </div>
            </div>
            <div className="history-scroll-area">
              {historyData.logs.length > 0 ? (
                historyData.logs.map((log) => (
                  <div key={log.id} className="history-card">
                    <div className="history-card-header">
                      <span className="history-date">{log.timestamp?.toDate().toLocaleDateString()}</span>
                      {historyData.title.includes("Activity") && <span className="history-task-tag">{log.task_name}</span>}
                      <button className="delete-log-btn no-print" onClick={() => deleteLog(log.id, log.task_id)}>🗑️</button>
                    </div>
                    <div className="history-card-body">
                      {log.run_time && <p className="history-runtime"><strong>Run Time:</strong> {log.run_time} mins</p>}
                      <p className="history-note-text">"{log.notes}"</p>
                    </div>
                  </div>
                ))
              ) : <p className="no-history">No records found.</p>}
            </div>
          </div>
        </div>
      )}

      {/* --- LOG MODAL --- */}
      {logModalTask && (
        <div className="modal-overlay">
          <div className="modal-content log-modal">
            <h2 className="modal-title">Log Task</h2>
            <p className="modal-subtitle">{logModalTask.name}</p>
            <div className="log-input-group">
              <label>Date Performed</label>
              <input type="date" className="calendar-input" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
            </div>
            {activeTab === "Generators" && (
              <div className="log-input-group">
                <label>Run Time (Minutes)</label>
                <input type="number" className="calendar-input" value={runTime} onChange={(e) => setRunTime(e.target.value)} />
              </div>
            )}
            <div className="log-input-group">
              <label>Notes / Observations</label>
              <textarea className="calendar-input notes-area" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setLogModalTask(null)}>Cancel</button>
              <button className="confirm-btn" onClick={submitLog}>Save Entry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;



