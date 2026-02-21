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
  doc,
  serverTimestamp 
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

  // --- Logic Helpers ---
  const getStatusColor = (task) => {
    if (!task.last_completed) return "gray";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);

    const schedules = {
      weekly: { due: 7, warn: 5 },
      monthly: { due: 31, warn: 24 },
      quarterly: { due: 91, warn: 81 },
      annual: { due: 365, warn: 350 }
    };

    const s = schedules[task.recurrence_type?.toLowerCase()] || schedules.monthly;
    if (diffDays >= s.due) return "red";
    if (diffDays >= s.warn) return "yellow";
    return "green";
  };

  const getDaysRemaining = (task) => {
    if (!task.last_completed) return "Pending";
    const lastDate = task.last_completed.toDate ? task.last_completed.toDate() : new Date(task.last_completed);
    const now = new Date();
    const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

    const schedules = { weekly: 7, monthly: 31, quarterly: 91, annual: 365 };
    const totalAllowed = schedules[task.recurrence_type?.toLowerCase()] || 31;
    const remaining = totalAllowed - diffDays;

    return remaining <= 0 ? "Overdue" : `${remaining}d left`;
  };

  const handleLogClick = (task) => {
    setLogModalTask(task);
    setLogDate(new Date().toISOString().split('T')[0]);
    setRunTime("");
    setNotes("");
  };

  const submitLog = async () => {
    try {
      await addDoc(collection(db, "entries"), {
        task_id: logModalTask.id,
        task_name: logModalTask.name,
        timestamp: new Date(logDate + "T12:00:00"),
        run_time: runTime || null,
        notes: notes || "",
        logged_at: serverTimestamp(),
      });

      await updateDoc(doc(db, "tasks", logModalTask.id), {
        last_completed: new Date(logDate),
        status: "Completed"
      });

      setLogModalTask(null);
    } catch (e) {
      alert("Error saving log.");
    }
  };

  if (loading) return <div className="loading">Loading {activeTab}...</div>;

  return (
    <div className="generators-container">
      <h1 className="main-title">{activeTab}</h1>

      {sections.map((category) => (
        <div key={category.id} className="generator-card">
          <div className="generator-section-header">{category.name}</div>
          <div className="task-list">
            {category.tasks.map((task) => (
              <div key={task.id} className="task-row">
                <div className="task-label-group">
                  <span className={`status-dot ${getStatusColor(task)}`}></span>
                  <span className="task-name">{task.name}</span>
                  <span className={`days-badge ${getStatusColor(task)}`}>
                    {getDaysRemaining(task)}
                  </span>
                </div>
                <span className="status-pill status-none">{task.recurrence_type}</span>
                <button 
                  className={`log-btn ${getStatusColor(task) === "yellow" ? "yellow-warning" : ""}`} 
                  onClick={() => handleLogClick(task)}
                >
                  Log
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* --- ENHANCED LOG MODAL --- */}
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
                <input type="number" className="calendar-input" placeholder="30" value={runTime} onChange={(e) => setRunTime(e.target.value)} />
              </div>
            )}

            <div className="log-input-group">
              <label>Notes / Observations</label>
              <textarea 
                className="calendar-input notes-area" 
                placeholder="Enter details (e.g. Oil level OK, No leaks)" 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
              />
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



