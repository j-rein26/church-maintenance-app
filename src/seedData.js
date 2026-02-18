import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const seedDatabase = async () => {
  try {

    // 1️⃣ Create Phases
    const phaseNames = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"];
    const phaseRefs = {};

    for (const name of phaseNames) {
      const docRef = await addDoc(collection(db, "phases"), { name });
      phaseRefs[name] = docRef.id;
    }

    // Helper to create category
    const createCategory = async (name, phaseId) => {
      const docRef = await addDoc(collection(db, "categories"), {
        name,
        phase_id: phaseId
      });
      return docRef.id;
    };

    // Helper to create task
    const createTask = async (name, categoryId, recurrence, requiresTime = false) => {
      await addDoc(collection(db, "tasks"), {
        name,
        category_id: categoryId,
        recurrence_type: recurrence,
        requires_time: requiresTime
      });
    };

    // ===============================
    // PHASES 1-4 (Standard Layout)
    // ===============================
    for (let phase of phaseNames) {
      const phaseId = phaseRefs[phase];

      // Exit Signs category (start empty or with placeholder)
      const exitCat = await createCategory("Exit Signs", phaseId);
      await createTask("Placeholder Exit Sign", exitCat, "monthly");

      // Uranyl Pads
      const uranylCat = await createCategory("Uranyl Pads", phaseId);
      await createTask("Uranyl Pad Check", uranylCat, "monthly");

      // Elevator Pits
      const elevatorCat = await createCategory("Elevator Pits", phaseId);
      await createTask("Elevator Pit Check", elevatorCat, "quarterly");

      // Seal Plates & Tracks
      const sealCat = await createCategory("Seal Plates & Tracks", phaseId);
      await createTask("Seal Plates & Tracks Check", sealCat, "monthly");
    }

    // ===============================
    // Sump Pumps (specific phases)
    // ===============================
    // Phase 3
    const phase3Id = phaseRefs["Phase 3"];
    const sumpCat3 = await createCategory("Sump Pumps", phase3Id);
    await createTask("Lower Level – Janitorial Closet", sumpCat3, "quarterly");
    await createTask("Lower Level – Under Elevator", sumpCat3, "quarterly");
    await createTask("Stairwell", sumpCat3, "quarterly");

    // Phase 4
    const phase4Id = phaseRefs["Phase 4"];
    const sumpCat4 = await createCategory("Sump Pumps", phase4Id);
    await createTask("Lower Level – Mechanical Room Pump 1", sumpCat4, "quarterly");
    await createTask("Lower Level – Mechanical Room Pump 2", sumpCat4, "quarterly");

    // Grinder Pumps (Phase 4 only)
    const grinderCat4 = await createCategory("Grinder Pumps", phase4Id);
    await createTask("Lower Level – Mechanical Room Grinder 1", grinderCat4, "quarterly");
    await createTask("Lower Level – Mechanical Room Grinder 2", grinderCat4, "quarterly");

    // ===============================
    // GENERATORS (No Phase)
    // ===============================
    const eastGenCat = await createCategory("Generator East", null);
    await createTask("Weekly Test", eastGenCat, "weekly", true);
    await createTask("Annual Service", eastGenCat, "yearly", false);

    const westGenCat = await createCategory("Generator West", null);
    await createTask("Weekly Test", westGenCat, "weekly", true);
    await createTask("Annual Service", westGenCat, "yearly", false);

    alert("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
    alert("Error seeding database");
  }
};

export default seedDatabase;




