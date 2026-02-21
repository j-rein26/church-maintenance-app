import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Dashboard from "./Dashboard";
import TaskManager from "./TaskManager";
import FireReport from "./FireReport"; // 1. New Import
import Login from "./Login";
import seedDatabase from "./seedData";
import "./App.css"; 

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("Generators");
  const [isManageMode, setIsManageMode] = useState(false);
  const [showReport, setShowReport] = useState(false); // 2. New State

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe(); 
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (!user) return <Login />;

  const phases = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];

  const changeTab = (tab) => {
    setActiveTab(tab);
    setIsManageMode(false);
    setShowReport(false); // Ensure report closes when switching tabs
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-header">
          <h2 className="brand-name">Maintenance</h2>
          <button 
            className={`manage-btn ${isManageMode ? 'active-manage' : ''}`}
            onClick={() => {
              setIsManageMode(!isManageMode);
              setShowReport(false);
            }}
          >
            {isManageMode ? "⬅ Back to View" : "⚙️ Manage Tasks"}
          </button>
        </div>

        <div className="sidebar-menu">
          <button 
            className={`nav-item ${activeTab === "Generators" ? "active" : ""}`}
            onClick={() => changeTab("Generators")}
          >
            <span className="icon">⚡</span> Generators
          </button>

          <p className="menu-label">PHASES</p>
          {phases.map((phase) => (
            <button
              key={phase}
              className={`nav-item ${activeTab === phase ? "active" : ""}`}
              onClick={() => changeTab(phase)}
            >
              {phase}
            </button>
          ))}
        </div>

        <div className="sidebar-footer">
          {/* 3. Updated Report Button */}
          <button className="footer-btn report" onClick={() => setShowReport(true)}>
            📋 Fire Dept Report
          </button>
          
          <button className="footer-btn backup">💾 Export Backup</button>
          
          <div className="auth-row">
             <button className="text-btn" onClick={handleLogout}>Logout</button>
             <button className="text-btn" onClick={seedDatabase}>Seed DB</button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="content-area">
        {/* 4. Logic to show Report Overlay */}
        {showReport && <FireReport onClose={() => setShowReport(false)} />}

        {isManageMode ? (
          <TaskManager activeTab={activeTab} />
        ) : (
          <Dashboard activeTab={activeTab} />
        )}
      </main>
    </div>
  );
}

export default App;
