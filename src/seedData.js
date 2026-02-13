import { db } from "./firebase";
import { collection, doc, setDoc, addDoc } from "firebase/firestore";

async function seedDatabase() {
  try {
    console.log("Starting new seed...");

    // -------------------------
    // PHASES
    // -------------------------
    const phases = [
      { id: "phase1", name: "Phase 1" },
      { id: "phase2", name: "Phase 2" },
      { id: "phase3", name: "Phase 3" },
      { id: "phase4", name: "Phase 4" },
    ];

    for (let phase of phases) {
      await setDoc(doc(db, "phases", phase.id), {
        name: phase.name
      });
    }

    // -------------------------
    // CATEGORY TYPES
    // -------------------------
    const phaseCategoryTypes = [
      "Exit Signs",
      "Uranyl Pads",
      "Sump Pumps & Pits",
      "Elevator Pits",
      "Seal Plates & Tracks"
    ];

    // Create categories under EACH phase
    for (let phase of phases) {
      for (let categoryName of phaseCategoryTypes) {

        const categoryId = `${categoryName.replace(/\s+/g, "")}_${phase.id}`;

        await setDoc(doc(db, "categories", categoryId), {
          name: categoryName,
          phase_id: phase.id,
          active: true
        });

        // -------------------------
        // TASKS FOR EACH CATEGORY
        // -------------------------

        if (categoryName === "Exit Signs") {
          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Monthly Battery Test",
            recurrence_type: "monthly",
            requires_time: false,
            active: true
          });

          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Quarterly Breaker Test",
            recurrence_type: "quarterly",
            requires_time: false,
            active: true
          });
        }

        if (categoryName === "Uranyl Pads") {
          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Monthly Replacement",
            recurrence_type: "monthly",
            requires_time: false,
            active: true
          });
        }

        if (categoryName === "Sump Pumps & Pits") {
          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Quarterly Check",
            recurrence_type: "quarterly",
            requires_time: false,
            active: true
          });
        }

        if (categoryName === "Elevator Pits") {
          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Quarterly Check",
            recurrence_type: "quarterly",
            requires_time: false,
            active: true
          });
        }

        if (categoryName === "Seal Plates & Tracks") {
          await addDoc(collection(db, "tasks"), {
            category_id: categoryId,
            name: "Quarterly Inspection",
            recurrence_type: "quarterly",
            requires_time: false,
            active: true
          });
        }
      }
    }

    // -------------------------
    // GENERATORS (NO PHASE)
    // -------------------------

    const generators = [
      { id: "genEast", name: "Generator East" },
      { id: "genWest", name: "Generator West" }
    ];

    for (let gen of generators) {
      await setDoc(doc(db, "categories", gen.id), {
        name: gen.name,
        phase_id: null,
        active: true
      });

      // Weekly Test
      await addDoc(collection(db, "tasks"), {
        category_id: gen.id,
        name: "Weekly Test",
        recurrence_type: "weekly",
        requires_time: true,
        required_day_of_week: "Monday",
        time_window_start: gen.id === "genEast" ? "09:00" : "11:00",
        time_window_end: gen.id === "genEast" ? "09:05" : "11:05",
        active: true
      });

      // Annual Service (September)
      await addDoc(collection(db, "tasks"), {
        category_id: gen.id,
        name: "Annual Service",
        recurrence_type: "yearly",
        recurrence_month: 9,
        requires_time: false,
        active: true
      });
    }

    console.log("Seed completed successfully!");
    alert("Database seeded successfully!");
  } catch (error) {
    console.error("Seeding error:", error);
    alert("Seeding failed. Check console.");
  }
}

export default seedDatabase;

