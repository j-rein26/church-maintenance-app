import { useEffect, useState, useMemo } from "react";
import { db } from "./firebase";
import { 
  collection, getDocs, addDoc, query, orderBy, 
  updateDoc, doc, deleteDoc 
} from "firebase/firestore";

const RECURRENCE_DAYS = { 
  daily: 1, 
  weekly: 7, 
  monthly: 30, 
  quarterly: 90, 
  yearly: 365 
};

export default function Dashboard() {
  const [phases, setPhases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("generators");

  const [selectedTask, setSelectedTask] = useState(null);
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pSnap, cSnap, tSnap, eSnap] = await Promise.all([
        getDocs(collection(db, "phases")),
        getDocs(collection(db, "categories")),
        getDocs(collection(db, "tasks")),
        getDocs(query(collection(db, "entries"), orderBy("date", "desc")))
      ]);

      const sortedPhases = pSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

      setPhases(sortedPhases);
      setCategories(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTasks(tSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const allEntries = {};
      eSnap.docs.forEach(d => {
        const data = d.data();
        if (!allEntries[data.task_id]) allEntries[data.task_id] = [];
        allEntries[data.task_id].push(data);
      });
      setEntries(allEntries);
      setLoading(false);
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  const updateTaskName = async (id, newName) => {
    if (!newName) return;
    await updateDoc(doc(db, "tasks", id), { name: newName });
    fetchData();
  };

  const deleteTask = async (id) => {
    if (window.confirm("Permanent Delete: Are you sure? This will also remove the history for this task.")) {
      try {
        await deleteDoc(doc(db, "tasks", id));
        fetchData();
      } catch (e) {
        console.error("Error deleting task:", e);
      }
    }
  };

  const addNewTask = async (categoryId) => {
    const name = prompt("Enter new task name:");
    if (!name) return;

    const type = prompt("Enter frequency (daily, weekly, monthly, quarterly, yearly):", "monthly");
    const validTypes = ["daily", "weekly", "monthly", "quarterly", "yearly"];
    const recurrence = validTypes.includes(type?.toLowerCase()) ? type.toLowerCase() : "monthly";

    try {
      await addDoc(collection(db, "tasks"), {
        name: name,
        category_id: categoryId,
        recurrence_type: recurrence 
      });
      fetchData();
    } catch (e) {
      console.error("Error adding task:", e);
    }
  };

  const calculateStatus = (taskId, recurrence) => {
    const taskEntries = entries[taskId] || [];
    if (taskEntries.length === 0) return "No entries";
    const lastDate = new Date(taskEntries[0].date);
    const nextDue = new Date(lastDate);
    
    // Logic: Look up the days based on the task's specific recurrence type
    const daysToAdd = RECURRENCE_DAYS[recurrence] || 30;
    nextDue.setDate(nextDue.getDate() + daysToAdd);
    
    const diff = (nextDue - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "Overdue";
    if (diff <= 3) return "Due Soon";
    return "On Schedule";
  };

  const downloadBackupCSV = () => {
    let csvContent = "Date,Phase,Category,Task,Frequency\n";
    tasks.forEach(task => {
      const taskEntries = entries[task.id] || [];
      const cat = categories.find(c => c.id === task.category_id);
      const phase = phases.find(p => p.id === cat?.phase_id);
      taskEntries.forEach(entry => {
        const taskName = task.name.replace(/,/g, "");
        const catName = (cat?.name || "N/A").replace(/,/g, "");
        const phaseName = (phase?.name || "Generator").replace(/,/g, "");
        csvContent += `${entry.date},${phaseName},${catName},${taskName},${task.recurrence_type}\n`;
      });
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Church_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredReportData = useMemo(() => {
    const flatReport = [];
    tasks.forEach(task => {
      const taskEntries = entries[task.id] || [];
      const cat = categories.find(c => c.id === task.category_id);
      const phase = phases.find(p => p.id === cat?.phase_id);
      taskEntries.forEach(entry => {
        if (entry.date >= startDate && entry.date <= endDate) {
          flatReport.push({
            date: entry.date,
            task: task.name,
            category: cat?.name || "N/A",
            phase: phase?.name || "Generator",
          });
        }
      });
    });
    return flatReport.sort((a, b) => b.date.localeCompare(a.date));
  }, [tasks, entries, startDate, endDate, categories, phases]);

  if (loading) return <div style={centerStyle}>Loading Dashboard...</div>;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#fdfdfd", color: "#333" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          .report-container { padding: 0 !important; width: 100% !important; position: static !important; }
        }
      `}</style>

      {/* SIDEBAR */}
      <nav className="no-print" style={sidebarStyle}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Maintenance</h2>
        
        <button 
          onClick={() => setIsEditMode(!isEditMode)}
          style={{ ...btnEditToggle, backgroundColor: isEditMode ? "#ef4444" : "#4b5563" }}
        >
          {isEditMode ? "Exit Edit Mode" : "Manage Tasks"}
        </button>
        
        <div onClick={() => setActiveSection("generators")} style={navItemStyle(activeSection === "generators")}>⚡ Generators</div>
        
        <p style={labelStyle}>Phases</p>
        {phases.map(p => (
          <div key={p.id} onClick={() => setActiveSection(p.id)} style={navItemStyle(activeSection === p.id)}>{p.name}</div>
        ))}

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          <button onClick={() => setShowReport(true)} style={btnReport}>📋 Fire Dept Report</button>
          <button onClick={downloadBackupCSV} style={btnBackup}>💾 Export Backup</button>
        </div>
      </nav>

      {/* MAIN VIEW */}
      <main style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
        <h1 className="no-print" style={{ marginBottom: "30px" }}>
          {activeSection === "generators" ? "Generators" : phases.find(p => p.id === activeSection)?.name}
        </h1>

        {categories
          .filter(c => activeSection === "generators" ? c.name.includes("Generator") : c.phase_id === activeSection)
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
          .map(cat => (
            <div key={cat.id} style={{ marginBottom: "30px" }}>
              <h3 style={catHeaderStyle}>{cat.name}</h3>
              {tasks
                .filter(t => t.category_id === cat.id)
                .sort((a, b) => a.name.localeCompare(b.name)) 
                .map(task => (
                  <EditableTaskRow 
                    key={task.id} 
                    task={task} 
                    isEditMode={isEditMode}
                    status={calculateStatus(task.id, task.recurrence_type)}
                    onLog={() => setSelectedTask(task)}
                    onRename={(newName) => updateTaskName(task.id, newName)}
                    onDelete={() => deleteTask(task.id)}
                  />
                ))}
              {isEditMode && (
                <button onClick={() => addNewTask(cat.id)} style={btnAddSmall}>+ Add New Task</button>
              )}
            </div>
          ))}

        {/* LOG MODAL */}
        {selectedTask && (
          <div style={modalOverlay}>
            <div style={modalBody}>
              <h3>Log Completion: {selectedTask.name}</h3>
              <p style={{fontSize: "0.8rem", color: "#666"}}>Frequency: {selectedTask.recurrence_type}</p>
              <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} style={inputStyle} />
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button onClick={async () => {
                  await addDoc(collection(db, "entries"), { task_id: selectedTask.id, date: entryDate });
                  setSelectedTask(null);
                  fetchData();
                }} style={btnPrimary}>Save</button>
                <button onClick={() => setSelectedTask(null)} style={btnSecondary}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* REPORT VIEW */}
        {showReport && (
          <div style={reportOverlay} className="report-container">
            <div style={{ maxWidth: "850px", margin: "0 auto" }}>
              <div className="no-print" style={filterBarStyle}>
                <div>
                  <label style={{ marginRight: "10px", fontWeight: "bold" }}>From:</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                  <label style={{ margin: "0 10px 0 20px", fontWeight: "bold" }}>To:</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => window.print()} style={btnPrimary}>Print / PDF</button>
                  <button onClick={() => setShowReport(false)} style={btnSecondary}>Close</button>
                </div>
              </div>
              
              <div style={{ textAlign: "center", borderBottom: "3px solid #333", paddingBottom: "10px" }}>
                <h1>Maintenance History Log</h1>
                <p>Period: {startDate} to {endDate}</p>
              </div>

              <table style={reportTable}>
                <thead>
                  <tr>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Area</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Task</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReportData.map((row, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{row.date}</td>
                      <td style={tdStyle}>{row.phase}</td>
                      <td style={tdStyle}>{row.category}</td>
                      <td style={tdStyle}>{row.task}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EditableTaskRow({ task, isEditMode, status, onLog, onRename, onDelete }) {
  const getStatusColor = (s) => {
    if (s === "On Schedule") return "#10b981";
    if (s === "Due Soon") return "#f59e0b";
    if (s === "Overdue") return "#ef4444";
    return "#94a3b8";
  };

  return (
    <div style={taskRowStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
        <div style={{ 
          width: "12px", height: "12px", borderRadius: "50%", 
          backgroundColor: getStatusColor(status), flexShrink: 0 
        }} />
        {isEditMode ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <div style={{display: "flex", flexDirection: "column", width: "70%"}}>
               <input 
                style={renameInputStyle} 
                defaultValue={task.name} 
                onBlur={(e) => e.target.value !== task.name && onRename(e.target.value)} 
              />
              <span style={{fontSize: "0.7rem", color: "#666"}}>Freq: {task.recurrence_type}</span>
            </div>
            <button onClick={onDelete} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>🗑️</button>
          </div>
        ) : (
          <span>{task.name}</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <span style={{ color: getStatusColor(status), fontWeight: "bold", fontSize: "0.85rem" }}>{status}</span>
        {!isEditMode && <button onClick={onLog} style={btnLog}>Log</button>}
      </div>
    </div>
  );
}

// --- STYLES ---
const sidebarStyle = { width: "260px", background: "#1a1a1a", color: "#fff", padding: "25px", display: "flex", flexDirection: "column" };
const navItemStyle = (active) => ({ padding: "12px 15px", borderRadius: "8px", cursor: "pointer", marginBottom: "5px", backgroundColor: active ? "#3b82f6" : "transparent", color: active ? "#fff" : "#ccc" });
const labelStyle = { fontSize: "0.75rem", color: "#666", textTransform: "uppercase", marginTop: "20px", marginBottom: "10px", fontWeight: "bold" };
const catHeaderStyle = { background: "#f1f5f9", padding: "12px", borderRadius: "6px", fontSize: "1rem", color: "#334155", fontWeight: "bold" };
const taskRowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 5px", borderBottom: "1px solid #eee" };
const btnLog = { background: "#3b82f6", color: "white", border: "none", padding: "6px 14px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" };
const btnEditToggle = { color: "#fff", border: "none", padding: "10px", borderRadius: "6px", cursor: "pointer", marginBottom: "20px", fontSize: "0.85rem" };
const btnAddSmall = { background: "none", border: "1px dashed #cbd5e1", color: "#64748b", padding: "10px", width: "100%", cursor: "pointer", marginTop: "10px", borderRadius: "6px" };
const btnReport = { background: "#059669", color: "white", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const btnBackup = { background: "#475569", color: "white", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const renameInputStyle = { border: "1px solid #3b82f6", borderRadius: "4px", padding: "6px", width: "100%" };
const modalOverlay = { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 };
const modalBody = { background: "white", padding: "30px", borderRadius: "12px", width: "350px", display: "flex", flexDirection: "column", gap: "10px" };
const btnPrimary = { background: "#3b82f6", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" };
const btnSecondary = { background: "#e2e8f0", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", color: "#475569" };
const inputStyle = { padding: "8px", border: "1px solid #ddd", borderRadius: "6px" };
const reportOverlay = { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "white", zIndex: 2000, overflowY: "auto", padding: "40px" };
const reportTable = { width: "100%", borderCollapse: "collapse", marginTop: "20px" };
const thStyle = { border: "1px solid #ddd", padding: "12px", textAlign: "left", backgroundColor: "#f8fafc" };
const tdStyle = { border: "1px solid #ddd", padding: "10px", fontSize: "0.9rem" };
const filterBarStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #e2e8f0" };
const centerStyle = { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" };