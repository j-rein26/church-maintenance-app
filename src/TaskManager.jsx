import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { 
  collection, onSnapshot, query, where, getDocs, 
  addDoc, deleteDoc, updateDoc, doc 
} from 'firebase/firestore';
import './Dashboard.css';

const TaskManager = ({ activeTab }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let categoryQuery;
        if (activeTab === "Generators") {
          categoryQuery = query(collection(db, "categories"), where("phase_id", "==", null));
        } else {
          const phaseSnap = await getDocs(query(collection(db, "phases"), where("name", "==", activeTab)));
          if (phaseSnap.empty) return;
          categoryQuery = query(collection(db, "categories"), where("phase_id", "==", phaseSnap.docs[0].id));
        }

        onSnapshot(categoryQuery, (catSnapshot) => {
          const categoryList = catSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          onSnapshot(query(collection(db, "tasks")), (taskSnapshot) => {
            const allTasks = taskSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const structured = categoryList.map(cat => ({
              ...cat,
              tasks: allTasks.filter(t => t.category_id === cat.id).sort((a, b) => a.name.localeCompare(b.name))
            })).sort((a, b) => a.name.localeCompare(b.name));
            setSections(structured);
            setLoading(false);
          });
        });
      } catch (error) { console.error(error); }
    };
    fetchData();
  }, [activeTab]);

  const handleRename = async (taskId) => {
    if (!newName) return setEditingId(null);
    await updateDoc(doc(db, "tasks", taskId), { name: newName });
    setEditingId(null);
    setNewName("");
  };

  // Trigger Modal
  const confirmDelete = (task) => {
    setTaskToDelete(task);
    setShowModal(true);
  };

  // Actual Delete Execution
  const executeDelete = async () => {
    if (taskToDelete) {
      await deleteDoc(doc(db, "tasks", taskToDelete.id));
      setShowModal(false);
      setTaskToDelete(null);
    }
  };

  const handleAddTask = async (categoryId) => {
    const taskName = prompt("Enter new task name:");
    if (taskName) {
      await addDoc(collection(db, "tasks"), {
        name: taskName,
        category_id: categoryId,
        recurrence_type: "monthly",
        status: "No entries"
      });
    }
  };

  if (loading) return <div className="loading">Loading Editor...</div>;

  return (
    <div className="generators-container manager-view">
      <h1 className="main-title">Managing: {activeTab}</h1>
      
      {sections.map((category) => (
        <div key={category.id} className="generator-card">
          <div className="generator-section-header manage-header">
            {category.name}
            <button className="add-task-inline" onClick={() => handleAddTask(category.id)}>+ Add Task</button>
          </div>
          
          <div className="task-list">
            {category.tasks.map((task) => (
              <div key={task.id} className="task-row manage-row">
                {editingId === task.id ? (
                  <input 
                    className="edit-input"
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={() => handleRename(task.id)}
                    autoFocus
                  />
                ) : (
                  <span className="task-name" onClick={() => {setEditingId(task.id); setNewName(task.name);}}>
                    {task.name} <small>✏️</small>
                  </span>
                )}
                
                <div className="manage-actions">
                  <button className="delete-btn" onClick={() => confirmDelete(task)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* CONFIRMATION MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete <strong>{taskToDelete?.name}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="confirm-delete-btn" onClick={executeDelete}>Delete Task</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskManager;
