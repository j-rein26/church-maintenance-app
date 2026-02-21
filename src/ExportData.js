import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

export const exportToCSV = async () => {
  try {
    // 1. Fetch all data
    const tasksSnap = await getDocs(collection(db, "tasks"));
    const entriesSnap = await getDocs(collection(db, "entries"));

    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const entries = entriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Define CSV Headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Task Name,Category ID,Status,Notes\r\n";

    // 3. Map entries to rows
    entries.forEach(entry => {
      const task = tasks.find(t => t.id === entry.task_id);
      const date = entry.timestamp?.toDate().toLocaleDateString() || "N/A";
      const name = task ? task.name : entry.task_name || "Unknown Task";
      const catId = task ? task.category_id : "N/A";
      
      // Clean text to avoid breaking CSV format (removing commas)
      const cleanName = name.replace(/,/g, ""); 
      
      csvContent += `${date},${cleanName},${catId},Completed,\r\n`;
    });

    // 4. Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maintenance_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);

    // 5. Trigger download
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export data.");
  }
};