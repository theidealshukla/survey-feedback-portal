const API_URL = "https://script.google.com/macros/s/AKfycbxEEjoK_DEeK0mfxd3pwqtWVb-ZQY_IQJ8Tm75OG2TUJ9e9BieWoZMywXm23bcsiA9C/exec";
const SCRIPT_SECRET = "sk_my_super_secret_survey_key_007";

async function pushData() {
  console.log("Starting data seed targeting Google Sheets Web App url: " + API_URL);

  const complaints = [
    { name: "Alice Smith", email: "alice@example.com", type: "Billing", message: "I was overcharged by $50 this month and nobody is replying to my emails! I need this refunded ASAP. Very angry about the terrible service.", ticket_id: "CMP-ABC123" },
    { name: "Bob Jones", email: "bob@example.com", type: "Technical", message: "The app keeps crashing when I try to open the dashboard. It works fine on my laptop but the mobile view is completely broken.", ticket_id: "CMP-DEF456" },
    { name: "Charlie Brown", email: "charlie@example.com", type: "General", message: "I just wanted to say that the new update is okay, but I prefer the old layout. It's a bit confusing to find the settings now.", ticket_id: "CMP-GHI789" },
    { name: "Diana Prince", email: "diana@example.com", type: "Service", message: "The support agent was extremely helpful and resolved my issue in 5 minutes! Thank you so much for the quick turnaround.", ticket_id: "CMP-JKL012" },
    { name: "Evan Wright", email: "evan@example.com", type: "Technical", message: "I can't log in. It says 'invalid password' even though I just reset it 10 minutes ago.", ticket_id: "CMP-MNO345" }
  ];

  const surveys = [
    { name: "Frank Castle", email: "frank@example.com", quality: "Excellent", ease: "Very Easy", recommend: "Critically important", nps_score: 10, feedback: "Absolutely love the new features. Everything works flawlessly." },
    { name: "Grace Lee", email: "grace@example.com", quality: "Good", ease: "Easy", recommend: "Very important", nps_score: 8, feedback: "It's pretty good, but some menus are a bit hidden." },
    { name: "Henry Ford", email: "henry@example.com", quality: "Poor", ease: "Difficult", recommend: "Not important", nps_score: 3, feedback: "Too complicated. I keep getting lost trying to find my previous submissions. Terrible experience." },
    { name: "Ivy Chen", email: "ivy@example.com", quality: "Excellent", ease: "Very Easy", recommend: "Critically important", nps_score: 9, feedback: "Fantastic service and great support. Zero issues!" },
    { name: "Jack Smith", email: "jack@example.com", quality: "Average", ease: "Neutral", recommend: "Somewhat important", nps_score: 6, feedback: "It does the job, nothing spectacular but nothing terrible either." }
  ];

  let fetchFn = null;
  if (typeof fetch !== "undefined") {
    fetchFn = fetch;
  } else {
    // Basic fallback for older Node.js
    console.log("Fetch not found, looking for alternative...");
    return;
  }

  for (let c of complaints) {
    try {
      let res = await fetchFn(API_URL, {
        method: "POST",
        body: JSON.stringify({ ...c, table: "Complaints", secretKey: SCRIPT_SECRET, action: "insert" })
      });
      console.log("Inserted Complaint:", c.name);
    } catch(e) {
      console.error("Error inserting complaint:", e);
    }
  }

  for (let s of surveys) {
    try {
      let res = await fetchFn(API_URL, {
        method: "POST",
        body: JSON.stringify({ ...s, table: "Surveys", secretKey: SCRIPT_SECRET, action: "insert" })
      });
      console.log("Inserted Survey:", s.name);
    } catch(e) {
      console.error("Error inserting survey:", e);
    }
  }
}

pushData();
