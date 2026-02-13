import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Dashboard from "./Dashboard";
import Login from "./Login";
import seedDatabase from "./seedData";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  if (!user) return <Login />;

  return (
    <div>
      <button onClick={() => signOut(auth)}>Logout</button>
      <button onClick={seedDatabase} style={{ marginLeft: "10px" }}>
        Seed Database
      </button>
      <Dashboard />
    </div>
  );
}

export default App;




