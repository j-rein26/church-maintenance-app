import React, { useState, useEffect } from 'react';
import { db } from './firebase'; 
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import './Dashboard.css';

const Dashboard = ({ activeTab }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    const fetchData = async () => {
      try {
        let categoryQuery;

        // 1. Handle Generators vs Phases
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

        // 2. Listen to Categories
        const unsubCategories = onSnapshot(categoryQuery, (catSnapshot) => {
          const categoryList = catSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(), 
            tasks: [] 
          }));

          // 3. Listen to Tasks and Sort Everything
          const tasksQuery = query(collection(db, "tasks"));
          const unsubTasks = onSnapshot(tasksQuery, (taskSnapshot) => {
            const allTasks = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Map tasks to categories and APPLY ALPHABETICAL SORTING
            const structuredData = categoryList.map(cat => ({
              ...cat,
              tasks: allTasks
                .filter(t => t.category_id === cat.id)
                .sort((a, b) => (a.name || "").localeCompare(b.name || "")) // Sort Tasks A-Z
            })).sort((a, b) => (a.name || "").localeCompare(b.name || "")); // Sort Categories A-Z

            setSections(structuredData);
            setLoading(false);
          });
        });

      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleLog = async (taskId, taskName) => {
    try {
      await addDoc(collection(db, "entries"), {
        task_id: taskId,
        task_name: taskName,
        timestamp: serverTimestamp(),
      });
      alert(`Logged: ${taskName}`);
    } catch (e) {
      alert("Error logging task");
    }
  };

  if (loading) return <div className="loading">Organizing {activeTab}...</div>;

  return (
    <div className="generators-container">
      <h1 className="main-title">{activeTab}</h1>

      {sections.length > 0 ? (
        sections.map((category) => (
          <div key={category.id} className="generator-card">
            <div className="generator-section-header">{category.name}</div>
            <div className="task-list">
              {category.tasks.map((task) => (
                <div key={task.id} className="task-row">
                  <div className="task-label-group">
                    <span className="status-dot gray"></span>
                    <span className="task-name">{task.name}</span>
                  </div>
                  <span className="status-pill status-none">{task.recurrence_type}</span>
                  <button className="log-btn" onClick={() => handleLog(task.id, task.name)}>Log</button>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="no-tasks">No tasks found for {activeTab}.</div>
      )}
    </div>
  );
};

export default Dashboard;




