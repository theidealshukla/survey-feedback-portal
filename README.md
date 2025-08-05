# Smart Customer Support Portal

Collect, Manage & Resolve Customer Feedback — Intelligently.

---

## 🚀 Overview

In a world where every customer's voice counts, this project simplifies feedback collection, ticket management, and insight generation. It merges complaints and surveys into one portal — complete with automated ticketing, AI summaries, NPS analysis, and an admin dashboard.

---

## 🔑 Key Features

- **Unified Feedback Form**: Users can submit complaints or survey responses with auto-generated ticket IDs.
- **Email Automation**: Instant confirmation emails on submission and resolution updates once closed.
- **Admin Dashboard (Google Auth Protected)**:
  - View complaints and surveys.
  - Filter/sort/search/export data.
  - Update statuses and add RCA/CAPA notes.
- **AI-Powered Summaries**: Get sentiment tags, root cause analysis, and improvement suggestions.
- **NPS & Sentiment Analytics**: Real-time tracking of Net Promoter Score and feedback moods.
- **Data Exports**: Download CSV or sync with Google Sheets.

---

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Backend / Data**: Firebase (Firestore, Auth, Hosting)
- **AI Summaries**: OpenAI API via custom integration
- **Emails**: EmailJS for confirmation and resolution messages
- **Exports**: CSV + Google Sheets integration
- **Hosting**: GitHub Pages / Netlify

---

## 🔄 System Architecture

### 1. 📝 Customer Submission
- Choose complaint or survey.
- Submit feedback.
- Ticket ID generated (for complaints).
- Confirmation email sent.

### 2. 🔐 Admin Management
- Login with Google Sign-In.
- Dashboard displays metrics (total submissions, NPS, open/resolved counts).
- View & manage detailed entries via modal.

### 3. 🎟️ Ticket Handling
- Admin updates status, adds RCA/CAPA/notes.
- Resolution email auto-triggered.

### 4. 📊 Insights & AI
- Sentiment tags (Positive, Neutral, Negative).
- AI summaries & RCA suggestions.
- NPS trends and future complaint trend graphs (WIP).

---



## ✅ Completed Features

- Unified input form (complaint/survey)
- Ticketing system (`CMP-XXXXXX`)
- Email notifications (confirmation & closure)
- Google Sign-In for admins
- Real-time metrics: NPS, sentiment, complaints
- RCA/CAPA & investigation notes in modals
- CSV & Google Sheets export

---

## 🧠 AI-Integrated Features

- AI-generated summaries of each complaint/survey
- RCA and CAPA recommendations
- Sentiment classification via tags

---

## 🔄 In Progress

- Auto sentiment detection
- NPS trend charts
- Top recurring complaint visualization

---

## 🔮 Future Enhancements

- Priority ticket alerts
- Auto-assignment to support teams
- Chatbot for AI recommendations
- Bulk ticket updates

---

## 🧪 How to Run (Dev & Demo)

### 1. Clone the Repo
```bash
git clone https://github.com/<your-username>/SmartCustomerSupportPortal.git
cd SmartCustomerSupportPortal
```

### 2. Firebase Setup
- Enable Google Sign-In in Firebase Auth.
- Replace Firebase config in `login.js` and `admin.js`.

### 3. EmailJS Setup
- Configure EmailJS account with templates and public key.
- Update the relevant JS files with API keys.

### 4. Run Locally or Deploy
- Open `index.html` for the user-facing form.
- Open `admin.html` for the dashboard (requires login).
- Deploy via Netlify or Firebase Hosting.

---

## 💡 Why This Matters

- Avoid missed complaints with real-time tracking.
- Build trust through automated updates.
- Use AI insights to drive improvements.
- RCA/CAPA ensures continuous learning and faster resolution.

---

## 📁 Key Files

- `index.html` — Admin login form
- `admin.html` — Admin dashboard
- `admin.js`, `login.js` — Logic & Firebase integration
- `ai-analysis.js`, `ai-rca-capa-suggestions.js` — AI integration logic
- `admin.css`, `login.css` — Styling

---

## 📬 Questions or Suggestions?

Feel free to open an issue or email:  
📩 **adarshshuklawork@gmail.com**

---

> Let's turn customer feedback into action, not just inbox clutter.
