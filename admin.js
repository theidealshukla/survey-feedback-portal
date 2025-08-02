// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
  authDomain: "smart-customer-support-portal.firebaseapp.com",
  projectId: "smart-customer-support-portal",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Auth state handler
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    // Load dashboard only after authentication
    loadDashboard();
  }
});

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => (location.href = "index.html"));
}

function closeModal() {
  document.getElementById("viewModal").style.display = "none";
}

function getSentiment(text, surveyData = null) {
  // For surveys, prioritize numerical ratings
  if (surveyData) {
    const nps = parseInt(surveyData.npsScore);
    let positiveCount = 0;
    if (nps >= 9) positiveCount += 2;
    if (surveyData.quality?.toLowerCase().includes('excellent')) positiveCount++;
    if (surveyData.ease?.toLowerCase().includes('easy')) positiveCount++;
    if (surveyData.recommend?.toLowerCase().includes('definitely')) positiveCount++;
    if (positiveCount >= 2) return "Positive";
    if (nps <= 6) return "Negative";
  }

  if (!text) return "Neutral";

  const text_lower = text.toLowerCase();
  
  const positiveWords = [
    "good", "great", "excellent", "awesome", "amazing", "fantastic", "wonderful", "superb",
    "happy", "satisfied", "pleased", "delighted", "content", "grateful", "thrilled",
    "perfect", "flawless", "ideal", "brilliant", "genius", "outstanding",
    "love", "like", "enjoy", "appreciate", "adore", "fav", "favorite", "best",
    "easy", "simple", "smooth", "straightforward", "convenient", "intuitive",
    "recommend", "highly recommend", "must try", "would buy again", "will return",
    "responsive", "fast", "quick", "on time", "helpful", "kind", "friendly", "polite",
    "affordable", "cheap", "value", "worth it", "reliable", "trustworthy", "secure",
    "clean", "organized", "neat", "cool", "fun", "engaging", "useful", "productive",
    "efficient", "clear", "strong", "stable", "impressive", "smart", "well done"
  ];
  
  const negativeWords = [
    "bad", "poor", "terrible", "awful", "horrible", "worst", "disgusting", "unacceptable",
    "unhappy", "unsatisfied", "dissatisfied", "frustrated", "disappointed", "regret",
    "issue", "problem", "bug", "error", "crash", "fail", "failure", "doesn't work",
    "does not work", "not working", "not good", "not great", "broken", "glitch",
    "slow", "laggy", "delayed", "late", "complicated", "confusing", "unclear",
    "hard", "difficult", "annoying", "painful", "hate", "dislike", "boring", "waste",
    "expensive", "overpriced", "not worth", "rude", "unhelpful", "ignored", "incomplete",
    "dirty", "messy", "unsafe", "unreliable", "untrustworthy", "crappy", "junk",
    "never again", "no support", "can't use", "can't login", "locked out", "inconvenient"
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  // Check for negative phrases first (they take priority)
  for (const phrase of negativeWords) {
    if (text_lower.includes(phrase)) {
      // Give extra weight to explicit negatives
      negativeCount += phrase.includes("not ") || phrase.includes("n't ") ? 2 : 1;
    }
  }

  // Only check positive if no strong negatives found
  if (negativeCount < 2) {
    for (const word of positiveWords) {
      if (text_lower.includes(word)) {
        positiveCount++;
      }
    }
  }

  // Determine final sentiment
  if (negativeCount > 0) return "Negative";  // Any negative is treated as negative
  if (positiveCount > 0) return "Positive";
  return "Neutral";
}

function checkFields() {
  const rca = document.getElementById("rca").value.trim();
  const capa = document.getElementById("capa").value.trim();
  const statusSelect = document.getElementById("newStatus");

  if (rca && capa) {
    statusSelect.value = "resolved";
    statusSelect.disabled = true; // Prevent manual status change
  } else {
    statusSelect.value = "open";
    statusSelect.disabled = false;
  }
}

async function showModal(
  docId,
  isComplaint,
  _,
  currentStatus,
  data = {}
) {
  // Update this line to pass survey data
  let sentiment = getSentiment(
    isComplaint ? data.message || "" : data.feedback || "",
    isComplaint ? null : data  // Pass survey data as second parameter
  );

  document.getElementById("modalDetails").innerHTML = `
  <p><strong>Name:</strong> ${data.name}</p>
  <p><strong>Email:</strong> ${data.email}</p>
  ${
    isComplaint
      ? `<p><strong>Ticket ID:</strong> <span style="color:#007bff">${
          data.ticketId || "N/A"
        }</span></p>`
      : ""
  }
  <p><strong>${isComplaint ? "Message" : "Feedback"}:</strong> ${
    isComplaint ? data.message : data.feedback || "-"
  }</p>
  <p><strong>Sentiment:</strong> ${sentiment}</p>
`;

  if (isComplaint) {
    const isResolved = currentStatus === "resolved";
    document.getElementById("statusUpdate").innerHTML = `
  <label>Status:</label>
  <select id="newStatus" ${isResolved ? 'disabled' : ''}>
    <option value="open" ${currentStatus === "open" ? "selected" : ""}>Open</option>
    <option value="resolved" ${currentStatus === "resolved" ? "selected" : ""}>Resolved</option>
  </select>

  <label>Investigation Notes:</label>
  <textarea id="investigationNotes" ${isResolved ? 'readonly' : ''}>${
    data.investigationNotes || ""
  }</textarea>

  <label>Root Cause (RCA):*</label>
  <textarea id="rca" ${isResolved ? 'readonly' : ''} required
    onkeyup="checkFields()"
    placeholder="Required for resolving complaint">${data.rca || ""}</textarea>

  <label>Corrective/Preventive Action (CAPA):*</label>
  <textarea id="capa" ${isResolved ? 'readonly' : ''} required
    onkeyup="checkFields()"
    placeholder="Required for resolving complaint">${data.capa || ""}</textarea>

  ${!isResolved ? `<button onclick="saveUpdate('${docId}')">Update</button>` : ''}
  
  ${isResolved ? '<p class="resolved-note">This complaint has been resolved and cannot be edited</p>' : ''}
`;

  // Check fields on modal open
  if (!isResolved) {
    checkFields();
  }
} else {
  document.getElementById("modalDetails").innerHTML += `
  <p><strong>Product Quality:</strong> ${data.quality || "-"}</p>
  <p><strong>Ease of Use:</strong> ${data.ease || "-"}</p>
  <p><strong>Would Recommend:</strong> ${data.recommend || "-"}</p>
  <p><strong>NPS Score:</strong> ${data.npsScore || "-"}</p>
  <p><strong>Additional Feedback:</strong> ${data.feedback || "-"}</p>
`;
    document.getElementById("statusUpdate").innerHTML = "";
  }

  document.getElementById("viewModal").style.display = "flex";
}

async function saveUpdate(docId) {
  const rca = document.getElementById("rca").value.trim();
  const capa = document.getElementById("capa").value.trim();
  
  if (!rca || !capa) {
    alert("Both RCA and CAPA must be filled out before saving");
    return;
  }

  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = "flex";

  try {
    // Status will be automatically set based on RCA and CAPA
    const status = rca && capa ? "resolved" : "open";
    const investigationNotes = document.getElementById("investigationNotes").value;

    await db.collection("complaints").doc(docId).update({
      status,
      investigationNotes,
      rca,
      capa,
      updatedAt: new Date(),
    });

    closeModal();
    await loadDashboard();
  } catch (error) {
    console.error("Error saving update:", error);
    alert("Error saving update: " + error.message);
  } finally {
    overlay.style.display = "none";
  }
}

async function loadDashboard() {
  const overlay = document.getElementById("loadingOverlay");
  overlay.style.display = "flex";

  try {
    let total = 0, open = 0, resolvedToday = 0;
    let promoters = 0, passives = 0, detractors = 0;

    const typeFilter = document.getElementById("filterType").value;
    const statusFilter = document.getElementById("filterStatus").value;
    const dataTable = document.getElementById("dataTable");
    dataTable.innerHTML = ""; // Clear existing data

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch data
    const [complaints, surveys] = await Promise.all([
      db.collection("complaints").get(),
      db.collection("surveys").get()
    ]);

    // Process complaints
    complaints.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate();

      total++;
      if (data.status === "open") open++;
      if (data.status === "resolved" && data.updatedAt?.toDate() >= today) resolvedToday++;

      if ((typeFilter === "complaint" || typeFilter === "all") &&
          (statusFilter === data.status || statusFilter === "all")) {
        const sentiment = getSentiment(data.message || "");
        addComplaintRow(doc, data, sentiment);
      }
    });

    // Process surveys
    surveys.forEach(doc => {
      const data = doc.data();
      const npsScore = parseInt(data.npsScore || 0);

      total++;
      if (npsScore >= 9) promoters++;
      else if (npsScore >= 7) passives++;
      else detractors++;

      if (typeFilter === "survey" || typeFilter === "all") {
        const sentiment = getSentiment(data.feedback || "", data);
        addSurveyRow(doc, data, sentiment);
      }
    });

    // Update dashboard stats
    document.getElementById("totalSubmissions").textContent = total;
    document.getElementById("openTickets").textContent = open;
    document.getElementById("resolvedToday").textContent = resolvedToday;
    
    const totalResponses = promoters + passives + detractors;
    const nps = totalResponses ? Math.round((promoters - detractors) * 100 / totalResponses) : 0;
    document.getElementById("avgNPS").textContent = nps;

  } catch (error) {
    console.error("Error loading dashboard:", error);
    alert("Error loading dashboard data. Please check console for details.");
  } finally {
    overlay.style.display = "none";
  }
}

function addComplaintRow(doc, data, sentiment) {
const dataTable = document.getElementById("dataTable");
dataTable.innerHTML += `
  <tr>
    <td><input type="checkbox" name="rowSelect" data-doc-id="${doc.id}" data-type="Complaint"></td>
    <td>${data.name}</td>
    <td>${data.email}</td>
    <td>Complaint</td>
    <td><span class="status-pill ${data.status}">${data.status}</span></td>
    <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
    <td><span class="sentiment ${sentiment.toLowerCase()}">${sentiment}</span></td>
    <td><button class="btn" onclick='showModal("${doc.id}", true, "", "${data.status}", ${JSON.stringify(data)})'>View</button></td>
  </tr>
`;
}

function addSurveyRow(doc, data, sentiment) {
  const dataTable = document.getElementById("dataTable");
  dataTable.innerHTML += `
    <tr>
      <td><input type="checkbox" name="rowSelect" data-doc-id="${doc.id}" data-type="Survey"></td>
      <td>${data.name}</td>
      <td>${data.email}</td>
      <td>Survey</td>
      <td><span class="status-pill blue">N/A</span></td>
      <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
      <td><span class="sentiment ${sentiment.toLowerCase()}">${sentiment}</span></td>
      <td><button class="btn" onclick='showModal("${doc.id}", false, "", "", ${JSON.stringify(data)})'>View</button></td>
    </tr>
  `;
}

// Add this new helper function
function calculateSurveyStatus(data) {
  const npsScore = parseInt(data.npsScore || 0);
  if (npsScore >= 9) return "Promoter";
  if (npsScore >= 7) return "Passive";
  return "Detractor";
}

document.getElementById("exportRange").addEventListener("change", function () {
  const isCustom = this.value === "custom";
  const startDateEl = document.getElementById("startDate");
  const endDateEl = document.getElementById("endDate");
  
  // Show/hide date inputs
  startDateEl.style.display = isCustom ? "inline-block" : "none";
  endDateEl.style.display = isCustom ? "inline-block" : "none";
  
  // Set default dates when switching to custom
  if (isCustom) {
    const today = new Date().toISOString().split('T')[0];
    if (!startDateEl.value) startDateEl.value = today;
    if (!endDateEl.value) endDateEl.value = today;
  }
  
  loadDashboard();
});

// Add event listeners for date inputs
document.getElementById("startDate").addEventListener("change", loadDashboard);
document.getElementById("endDate").addEventListener("change", loadDashboard);

// Update the getDateFilterFn function
function getDateFilterFn(range, startDate, endDate) {
  const now = new Date();
  return function (d) {
    const date = new Date(d);
    
    switch(range) {
      case "today":
        return date.toDateString() === now.toDateString();
      case "week": {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        return date >= startOfWeek && date <= now;
      }
      case "month":
        return date.getMonth() === now.getMonth() && 
               date.getFullYear() === now.getFullYear();
      case "year":
        return date.getFullYear() === now.getFullYear();
      case "custom": {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Set end date to end of day
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
      }
      default:
        return true;
    }
  };
}

function exportToCSV() {
  const range = document.getElementById("exportRange").value;
  const start = document.getElementById("startDate").value;
  const end = document.getElementById("endDate").value;
  const filterFn = getDateFilterFn(range, start, end);

  // CSV Headers
  let csvContent = "Name,Email,Type,Status,Date,Sentiment,Details\n";

  // Get all complaints and surveys
  Promise.all([
    db.collection("complaints").get(),
    db.collection("surveys").get()
  ]).then(([complaints, surveys]) => {
    // Process complaints
    complaints.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate();
      if (!date || !filterFn(date)) return;

      const sentiment = getSentiment(data.message || "");
      const row = [
        data.name,
        data.email,
        "Complaint",
        data.status,
        date.toLocaleDateString(),
        sentiment,
        `"${(data.message || "").replace(/"/g, '""')}"` // Escape quotes in message
      ];
      csvContent += row.join(",") + "\n";
    });

    // Process surveys
    surveys.forEach(doc => {
      const data = doc.data();
      const date = data.createdAt?.toDate();
      if (!date || !filterFn(date)) return;

      const sentiment = getSentiment(data.feedback || "");
      const details = `NPS: ${data.npsScore || "N/A"}, Quality: ${data.quality || "N/A"}, Ease: ${data.ease || "N/A"}`;
      const row = [
        data.name,
        data.email,
        "Survey",
        "N/A",
        date.toLocaleDateString(),
        sentiment,
        `"${details.replace(/"/g, '""')}"` // Escape quotes in details
      ];
      csvContent += row.join(",") + "\n";
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${range}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

loadDashboard();
