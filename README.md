# Church Maintenance PWA ⛪️🛠

A mobile-first, real-time Progressive Web App (PWA) built to automate and track recurring facility maintenance tasks. 

## 🚀 The Challenge
A local church needed a way to move away from paper-based maintenance logs. The requirements were:
* **Accessibility:** Must work on iPhones/Androids for staff on the move.
* **Proactive Alerts:** Automatically identify "Due Soon" or "Overdue" tasks.
* **Compliance:** Generate instant reports for Fire Department inspections.
* **Offline Access:** Ability to save the app to the home screen with a custom icon.

## 🛠 Tech Stack
* **Frontend:** React.js (Vite)
* **Backend/Database:** Firebase Firestore (Real-time NoSQL)
* **Authentication:** Firebase Auth (Secure Email/Password login)
* **Hosting:** Firebase Hosting
* **Styling:** Custom Responsive CSS-in-JS

## ✨ Key Features
* **Dynamic Status Engine:** Tasks automatically cycle from Green (On Schedule) to Yellow (Due Soon) to Red (Overdue) based on custom recurrence intervals (Daily, Weekly, Monthly, Quarterly, Yearly).
* **Fire Dept Reporting:** A date-filtered reporting engine that generates print-ready PDF logs of all maintenance history.
* **Data Integrity:** CSV Export feature for local data backups and offline record-keeping.
* **Admin Mode:** Secure "Management Mode" for adding, renaming, or deleting tasks and categories.

## 📸 Screenshots
*(Pro-tip: Take a screenshot of your iPhone screen and upload it here!)*

## ⚙️ Installation & Setup
1. Clone the repo: `git clone [your-repo-link]`
2. Install dependencies: `npm install`
3. Create a `.env` file with your Firebase configuration.
4. Run locally: `npm run dev`
5. Deploy: `npm run deploy`