<<<<<<< HEAD
# Smart Customer Support Portal 🚀

A lightweight and modern web portal that allows customers to submit surveys, feedback, and complaints—and enables admins to monitor responses, resolve issues, and track Net Promoter Scores (NPS). Built using **HTML, CSS, Firebase, and JavaScript**, this project features Google Authentication, ticket generation, email notifications, and a dashboard with advanced filtering and RCA/CAPA inputs.

---

## 🔗 Live Demo

**Customer Survey Page:** [https://smart-customer-support-portal.web.app](https://smart-customer-support-portal.web.app)
**Admin Dashboard:** Google Sign-In required

---

## 📌 Features

### 👤 Customer Side:

* Submit:

  * Product Surveys (with multiple-choice & feedback)
  * Feedback
  * Complaints / Queries
* Collects customer details like name, email, and phone
* Automatically generates a **Ticket ID** for complaints (e.g., `CMP-123456`)
* Sends **email confirmation** using EmailJS on complaint submission
* Smooth, clean UI with subtle animations

### 🛠️ Admin Side:

* **Google Sign-In** authentication
* Admin Dashboard to:

  * View all submissions (Survey, Feedback, Complaint)
  * Sort/filter by **type, status, date**
  * **View & update** complaint status
  * Add:

    * Investigation Notes
    * RCA (Root Cause Analysis)
    * CAPA (Corrective/Preventive Actions)
  * Track NPS Score & Sentiment Analysis
  * Display stats: open tickets, NPS, resolved cases, positive feedback %

---

## 🔐 Authentication

* Built with **Firebase Authentication** (Google login)
* Admin login restricted to authorized Google accounts (or open to all, depending on config)
* Firebase Firestore used for real-time data storage and retrieval

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend / DB:** Firebase (Firestore, Auth)
* **Email Service:** EmailJS (for auto-replies on ticket submission)
* **Hosting:** Firebase Hosting / Netlify (optional)

---

## 📁 Project Structure

```
/
├── index.html              # Customer-facing survey & complaint form
├── admin.html              # Admin dashboard
├── login.html              # Google Sign-in for admins
├── script.js               # Firebase, form, and modal logic
├── styles.css              # Common CSS styling
├── /assets                 # Logos, icons, images
└── firebaseConfig.js       # Your Firebase project credentials
```

---

## 📊 NPS Calculation

* On survey submission, user rates product from **0 to 10**
* NPS is calculated as:

```
NPS = % Promoters (9–10) - % Detractors (0–6)
```

* Real-time score shown on admin dashboard using Firestore aggregation

---

## ✉️ Email Notification (EmailJS)

* On complaint submission, user receives an email:

  ```
  Your complaint has been logged with Ticket ID: CMP-XXXXXX.
  We’ll get back to you shortly.
  ```
* Optional: Notify admin email with complaint details

---

## 🔥 Firebase Setup

1. Enable:

   * Firestore Database
   * Firebase Authentication (Google)
2. Add your domain to **Authorized Domains**
3. Replace the Firebase config in your code:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  ...
};
```

---

## 🛆 Deployment

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init
firebase deploy
```

### Netlify (Optional)

* Drag and drop your project folder on [netlify.com](https://app.netlify.com/)
* Add domain to Firebase authorized domains if using auth

---

## 💡 Future Improvements

* Role-based access control for different admin levels
* Analytics dashboard with charts
* AI-based sentiment classification from feedback
* Export tickets & responses to CSV
* Dark mode toggle 🌙

---

## 🧐 Learnings

* Firebase Authentication and Firestore integration
* Real-time form handling with state updates
* Modal-based admin editing (CAPA, RCA)
* Handling secure access to sensitive dashboards

---

## 🧑‍💻 Author

Made with ❤️ by [Adarsh Shukla](https://github.com/theidealshukla)
📧 `adarshshuklawork@gmail.com`

---

## 📜 License

MIT License - Use freely, give credit 💌
=======
# survey-feedback-portal
>>>>>>> f19e038 (Initial commit)
