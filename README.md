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
<img width="1465" height="781" alt="generators" src="https://github.com/user-attachments/assets/02aae327-11b9-4ac0-8ed7-193a6b23aaef" />
<img width="1460" height="776" alt="Phase1" src="https://github.com/user-attachments/assets/47b936a0-6367-4a7b-bd29-883e57902233" />
<img width="1470" height="777" alt="editMode" src="https://github.com/user-attachments/assets/507514c6-6dd4-4853-9431-ffb570b59d23" />
<img width="1451" height="764" alt="printPdfLog" src="https://github.com/user-attachments/assets/4fb1d164-f864-462a-90c8-3dd5bf9b0097" />


## ⚙️ Installation & Setup
1. Clone the repo: `git clone [your-repo-link]`
2. Install dependencies: `npm install`
3. Create a `.env` file with your Firebase configuration.
4. Run locally: `npm run dev`
5. Deploy: `npm run deploy`
