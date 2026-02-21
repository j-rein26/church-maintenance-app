import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const FireReport = ({ onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State (Defaults to past year)
  const [startDate, setStartDate] = useState(
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const tasksSnap = await getDocs(collection(db, "tasks"));
        const allTasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(allTasks);

        const entriesSnap = await getDocs(query(collection(db, "entries"), orderBy("timestamp", "desc")));
        const allEntries = entriesSnap.docs.map(doc => ({
          ...doc.data(),
          // Convert Firestore timestamp to JS Date for comparison
          jsDate: doc.data().timestamp?.toDate() 
        }));
        setEntries(allEntries);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching report data:", error);
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Filter logic runs whenever tasks, entries, or dates change
  useEffect(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59); // Include the full end day

    const compiled = tasks.map(task => {
      // Find logs for THIS task that fall WITHIN the date range
      const lastLogInRange = entries.find(e => 
        e.task_id === task.id && 
        e.jsDate >= start && 
        e.jsDate <= end
      );

      return {
        ...task,
        lastDate: lastLogInRange 
          ? lastLogInRange.jsDate.toLocaleDateString() 
          : "No record in range"
      };
    }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    setFilteredData(compiled);
  }, [startDate, endDate, tasks, entries]);

  if (loading) return <div className="report-overlay"><div className="report-paper">Loading...</div></div>;

  return (
    <div className="report-overlay">
      <div className="report-paper">
        <header className="report-header">
          <div className="header-text">
            <h1>Compliance Report</h1>
            <div className="date-controls no-print">
              <label>From: 
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>To: 
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
            <p className="print-only">Report Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
          </div>
          <div className="report-actions">
            <button className="print-btn" onClick={() => window.print()}>Print to PDF</button>
            <button className="close-print" onClick={onClose}>Close</button>
          </div>
        </header>

        <table className="report-table">
          <thead>
            <tr>
              <th>System / Task</th>
              <th>Frequency</th>
              <th>Last Inspection (In Range)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{item.recurrence_type}</td>
                <td>{item.lastDate}</td>
                <td>
                  <span className={item.lastDate === "No record in range" ? "status-fail" : "status-pass"}>
                    {item.lastDate === "No record in range" ? "⚠️ Missing" : "✅ OK"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FireReport;