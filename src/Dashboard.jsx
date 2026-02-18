import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";

export default function Dashboard() {
  const [phases, setPhases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState(null);
  const [entryDate, setEntryDate] = useState("");
  const [entryTime, setEntryTime] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const phasesSnap = await getDocs(collection(db, "phases"));
      const categoriesSnap = await getDocs(collection(db, "categories"));
      const tasksSnap = await getDocs(collection(db, "tasks"));
      const entriesSnap = await getDocs(collection(db, "entries"));

      // Sort phases by name
      const sortedPhases = phasesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setPhases(sortedPhases);
      setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTasks(tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const allEntries = {};
      entriesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!allEntries[data.task_id]) allEntries[data.task_id] = [];
        allEntries[data.task_id].push(data);
      });
      setEntries(allEntries);

      setLoading(false);
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const openModal = (task) => {
    setSelectedTask(task);
    setEntryDate("");
    setEntryTime("");
  };

  const closeModal = () => {
    setSelectedTask(null);
  };

  const saveEntry = async () => {
    if (!entryDate) {
      alert("Please select a date.");
      return;
    }
    try {
      await addDoc(collection(db, "entries"), {
        task_id: selectedTask.id,
        date: entryDate,
        time: selectedTask.requires_time ? entryTime : null,
        created_at: new Date(),
      });
      closeModal();
      fetchData();
    } catch (err) {
      console.error("Error saving entry:", err);
      alert("Failed to save entry.");
    }
  };

  const renameTask = async (task) => {
    const newName = prompt("Enter new name for this task", task.name);
    if (!newName) return;

    try {
      await updateDoc(doc(db, "tasks", task.id), { name: newName });
      fetchData();
    } catch (err) {
      console.error("Error renaming task:", err);
      alert("Failed to rename task.");
    }
  };

  const addTaskToCategory = async (category) => {
    const taskName = prompt(`Enter new task name for ${category.name}`);
    if (!taskName) return;

    try {
      await addDoc(collection(db, "tasks"), {
        name: taskName,
        category_id: category.id,
        recurrence_type: "monthly", // default, can edit later
        requires_time: false,       // default, can edit later
      });
      fetchData();
    } catch (err) {
      console.error("Error adding task:", err);
      alert("Failed to add task.");
    }
  };

  const calculateStatus = (task) => {
    const taskEntries = entries[task.id] || [];
    if (taskEntries.length === 0) return "No entries";

    const latest = taskEntries.reduce((a, b) => (a.date > b.date ? a : b));
    const lastDate = new Date(latest.date);

    let intervalDays = 0;
    switch (task.recurrence_type) {
      case "weekly": intervalDays = 7; break;
      case "monthly": intervalDays = 30; break;
      case "quarterly": intervalDays = 90; break;
      case "yearly": intervalDays = 365; break;
      default: intervalDays = 30;
    }

    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + intervalDays);

    const today = new Date();
    const diff = (nextDue - today) / (1000 * 60 * 60 * 24);

    if (diff < 0) return "Overdue";
    if (diff <= 3) return "Due Soon";
    return "On Schedule";
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "On Schedule": return { color: "green", fontWeight: "bold" };
      case "Due Soon": return { color: "orange", fontWeight: "bold" };
      case "Overdue": return { color: "red", fontWeight: "bold" };
      case "No entries": return { color: "gray" };
      default: return {};
    }
  };

  const toggleCategory = (catId) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  if (loading) return <p>Loading...</p>;

  const generatorCategories = categories.filter(cat => !cat.phase_id &&
    (cat.name === "Generator East" || cat.name === "Generator West")
  );

  const phaseCategories = categories.filter(cat => cat.phase_id);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Maintenance Dashboard</h1>

      {/* GENERATORS */}
      <div>
        <h2>Generators</h2>
        {generatorCategories.map(cat => (
          <div key={cat.id}>
            <h3>{cat.name}</h3>
            {tasks.filter(t => t.category_id === cat.id).map(task => {
              const status = calculateStatus(task);
              return (
                <div key={task.id}>
                  {task.name} — <span style={getStatusStyle(status)}>{status}</span>
                  <button onClick={() => openModal(task)} style={{ marginLeft: "10px" }}>Add Entry</button>
                  <button onClick={() => renameTask(task)} style={{ marginLeft: "5px" }}>Rename</button>
                </div>
              );
            })}
            <button onClick={() => addTaskToCategory(cat)} style={{ marginTop: "5px", fontSize: "0.8em" }}>+ Add Task</button>
          </div>
        ))}
      </div>

      {/* PHASES */}
      {phases.map(phase => (
        <div key={phase.id} style={{ marginTop: "30px" }}>
          <h2>{phase.name}</h2>
          {phaseCategories
            .filter(cat => cat.phase_id === phase.id)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(cat => (
              <div key={cat.id} style={{ marginLeft: "10px" }}>
                <h3 style={{ cursor: "pointer" }} onClick={() => toggleCategory(cat.id)}>
                  {cat.name} {collapsedCategories[cat.id] ? "(+)" : "(-)"}
                </h3>

                <button onClick={() => addTaskToCategory(cat)} style={{ marginBottom: "5px", fontSize: "0.8em" }}>+ Add Task</button>

                {!collapsedCategories[cat.id] && tasks
                  .filter(t => t.category_id === cat.id)
                  .map(task => {
                    const status = calculateStatus(task);
                    return (
                      <div key={task.id} style={{ marginLeft: "20px", marginBottom: "5px" }}>
                        {task.name} — <span style={getStatusStyle(status)}>{status}</span>
                        <button onClick={() => openModal(task)} style={{ marginLeft: "10px" }}>Add Entry</button>
                        <button onClick={() => renameTask(task)} style={{ marginLeft: "5px" }}>Rename</button>
                      </div>
                    );
                  })}
              </div>
            ))}
        </div>
      ))}

      {/* MODAL */}
      {selectedTask && (
        <div style={modalOverlay}>
          <div style={modalStyle}>
            <h3>Add Entry for {selectedTask.name}</h3>

            <label>Date:</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />

            {selectedTask.requires_time && (
              <>
                <label style={{ marginTop: "10px" }}>Time:</label>
                <input
                  type="time"
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                />
              </>
            )}

            <div style={{ marginTop: "15px" }}>
              <button onClick={saveEntry}>Save</button>
              <button onClick={closeModal} style={{ marginLeft: "10px" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const modalOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle = {
  backgroundColor: "white",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};




