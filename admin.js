// ✅ Fixed admin.js — AI suggestions now working properly

const firebaseConfig = {
  apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
  authDomain: "smart-customer-support-portal.firebaseapp.com",
  projectId: "smart-customer-support-portal",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

firebase.auth().onAuthStateChanged((user) => {
  if (!user) window.location.href = "index.html";
});

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => (location.href = "index.html"));
}

function closeModal() {
  const modal = document.getElementById("viewModal");
  modal.classList.remove("show");
  document.body.classList.remove("modal-open");
}

async function showModal(docId, isComplaint) {
  const modalDetails = document.getElementById("modalDetails");
  const statusUpdate = document.getElementById("statusUpdate");

  if (!isComplaint) {
    // Survey handling remains the same
    const surveyDoc = await db.collection("surveys").doc(docId).get();
    const surveyData = surveyDoc.data();
    const submissionDate = surveyData.createdAt?.toDate().toLocaleString();

    modalDetails.innerHTML = `
      <div class="survey-details">
        <div class="section-title">Customer Information</div>
        <div class="detail-row"><label>Name:</label><span>${
          surveyData.name || "N/A"
        }</span></div>
        <div class="detail-row"><label>Email:</label><span>${
          surveyData.email || "N/A"
        }</span></div>
        <div class="detail-row"><label>Submission Date:</label><span>${
          submissionDate || "N/A"
        }</span></div>

        <div class="section-title">Survey Responses</div>
        <div class="detail-row"><label>How likely are you to recommend us?</label><span>${
          surveyData.recommend || "N/A"
        }/10</span></div>
        <div class="detail-row"><label>How would you rate our ease of use?</label><span>${
          surveyData.ease || "N/A"
        }/5</span></div>
        <div class="detail-row"><label>How would you rate our service quality?</label><span>${
          surveyData.quality || "N/A"
        }/5</span></div>
        <div class="detail-row"><label>Additional Feedback:</label><p class="feedback-text">${
          surveyData.feedback || "No feedback provided"
        }</p></div>
      </div>
    `;
    statusUpdate.innerHTML = "";
  } else {
    // ** COMPLAINT HANDLING - WITH AI SUGGESTIONS **
    const complaintDoc = await db.collection("complaints").doc(docId).get();
    const complaintData = complaintDoc.data();
    const createdDate = complaintData.createdAt?.toDate().toLocaleString();
    const isResolved = complaintData.status === "resolved";

    // Build the details HTML
    const details = `
      <div class="survey-details">
          <div class="section-title">Complaint Details</div>
          <div class="detail-row"><label>Name:</label><span>${
            complaintData.name || "N/A"
          }</span></div>
          <div class="detail-row"><label>Email:</label><span>${
            complaintData.email || "N/A"
          }</span></div>
           <div class="detail-row"><label>Date:</label><span>${
             createdDate || "N/A"
           }</span></div>
          <div class="detail-row"><label>Message:</label><p class="feedback-text">${
            complaintData.message || "No message provided"
          }</p></div>
      </div>
    `;

    modalDetails.innerHTML = details;

    statusUpdate.innerHTML = `
      <div class="analysis-section">
        <h4>Root Cause Analysis</h4>
        <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="3" ${
          isResolved ? "disabled" : ""
        } class="${isResolved ? "textarea-disabled" : ""}">${
      complaintData.rca || ""
    }</textarea>

        <h4>Corrective and Preventive Action</h4>
        <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="3" ${
          isResolved ? "disabled" : ""
        } class="${isResolved ? "textarea-disabled" : ""}">${
      complaintData.capa || ""
    }</textarea>

        <div id="aiSuggestion-${docId}" class="ai-rca-loader" style="margin-top:10px;">${
      isResolved
        ? ""
        : '<span style="font-size:13px;color:#666;"><i class="fas fa-robot"></i> Getting AI suggestions...</span>'
    }</div>

        ${
          isResolved
            ? ""
            : `
          <div class="status-controls">
            <button onclick="updateComplaint('${docId}')" class="update-btn">Update & Resolve</button>
          </div>
        `
        }
      </div>
    `;

    // **THIS IS THE FIX** - Uncommented and fixed the AI suggestions call
    if (!isResolved && complaintData.message) {
      console.log("Calling AI suggestions for:", complaintData.message);
      // Call the AI suggestion function
      getAISuggestionsForComplaint(complaintData.message, docId);
    }
  }

  document.getElementById("viewModal").classList.add("show");
  document.body.classList.add("modal-open");
}

async function updateComplaint(docId) {
  const rca = document.getElementById("rcaInput").value.trim();
  const capa = document.getElementById("capaInput").value.trim();

  if (!rca || !capa) {
    alert("Please fill both RCA and CAPA sections before updating");
    return;
  }

  if (confirm("This will update the complaint and mark it as resolved. Continue?")) {
    try {
      await db.collection("complaints").doc(docId).update({
        rca,
        capa,
        status: "resolved",
        resolvedAt: new Date(),
        lastUpdated: new Date(),
      });
      alert("Complaint resolved successfully!");
      closeModal();
      loadDashboard();
    } catch (error) {
      console.error("Error updating complaint:", error);
      alert("Failed to update complaint");
    }
  }
}

// Remove the resolveComplaint function since it's no longer needed
// async function resolveComplaint(docId) { ... } - REMOVED

function handleDateFilter() {
  const dateFilter = document.getElementById("dateFilter").value;
  const customDateInputs = document.getElementById("customDateInputs");
  customDateInputs.style.display =
    dateFilter === "custom" ? "inline-block" : "none";
  loadDashboard();
}

function isDateInRange(dateToCheck) {
  const dateFilter = document.getElementById("dateFilter").value;
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  switch (dateFilter) {
    case "today":
      return dateToCheck >= startOfDay;
    case "week":
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return dateToCheck >= startOfWeek;
    case "month":
      return dateToCheck >= new Date(today.getFullYear(), today.getMonth(), 1);
    case "custom":
      const startDate = new Date(document.getElementById("startDate").value);
      const endDate = new Date(document.getElementById("endDate").value);
      endDate.setHours(23, 59, 59);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    default:
      return true;
  }
}

function analyzeSentiment(text) {
  const positiveWords = [
    "good", "great", "excellent", "amazing", "awesome", "love",
  ];
  const negativeWords = [
    "bad", "poor", "terrible", "awful", "hate", "issue", "problem",
  ];

  text = text.toLowerCase();
  let positiveScore = 0,
    negativeScore = 0;

  positiveWords.forEach((word) => {
    const matches = text.match(new RegExp("\\b" + word + "\\b", "gi"));
    if (matches) positiveScore += matches.length;
  });

  negativeWords.forEach((word) => {
    const matches = text.match(new RegExp("\\b" + word + "\\b", "gi"));
    if (matches) negativeScore += matches.length;
  });

  return generateSentimentBadge(positiveScore, negativeScore);
}

function generateSentimentBadge(pos, neg) {
  const diff = pos - neg;
  if (diff > 0)
    return `<span class="badge badge-positive">Positive (${pos})</span>`;
  if (diff < 0)
    return `<span class="badge badge-negative">Negative (${Math.abs(
      neg
    )})</span>`;
  return `<span class="badge badge-neutral">Neutral</span>`;
}

function analyzeSurveySentiment(data) {
  const combined = [
    data.quality, data.ease, data.recommend, data.npsScore, data.feedback,
  ]
    .map((v) => (v || "").toString().toLowerCase())
    .join(" ");
  return analyzeSentiment(combined);
}

function analyzeComplaintSentiment(data) {
  return analyzeSentiment((data.message || "").toLowerCase());
}

async function loadDashboard() {
  let total = 0,
    open = 0,
    resolvedToday = 0;
  let promoters = 0,
    passives = 0,
    detractors = 0,
    totalResponses = 0;
  const today = new Date().toISOString().split("T")[0];
  const typeFilter = document.getElementById("filterType").value;
  const statusFilter = document.getElementById("filterStatus").value;
  document.getElementById("dataTable").innerHTML = "";

  const complaints = await db.collection("complaints").get();
  const surveys = await db.collection("surveys").get();

  complaints.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt?.toDate();
    if (!createdDate || !isDateInRange(createdDate)) return;

    total++;
    if (data.status?.toLowerCase() === "open") open++;
    if (
      data.status === "resolved" &&
      createdDate.toISOString().startsWith(today)
    )
      resolvedToday++;

    if (
      (typeFilter === "complaint" || typeFilter === "all") &&
      (statusFilter === data.status || statusFilter === "all")
    ) {
      document.getElementById("dataTable").innerHTML += `
        <tr>
          <td>${data.name}</td>
          <td>${data.email}</td>
          <td>Complaint</td>
          <td><span class="badge ${
            data.status.toLowerCase() === "open"
              ? "badge-yellow"
              : "badge-green"
          }">${data.status}</span></td>
          <td>${createdDate.toLocaleDateString()}</td>
          <td>${analyzeComplaintSentiment(data)}</td>
          <td><button class="btn" onclick='showModal("${doc.id}", true)'>View</button></td>
        </tr>`;
    }
  });

  surveys.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt?.toDate();
    if (!createdDate || !isDateInRange(createdDate)) return;

    total++;
    const sentiment = analyzeSurveySentiment(data);
    if (sentiment.includes("Positive")) promoters++;
    else if (sentiment.includes("Negative")) detractors++;
    else passives++;
    totalResponses++;

    if (typeFilter === "survey" || typeFilter === "all") {
      document.getElementById("dataTable").innerHTML += `
        <tr>
          <td>${data.name}</td>
          <td>${data.email}</td>
          <td>Survey</td>
          <td><span class="badge badge-blue">N/A</span></td>
          <td>${createdDate.toLocaleDateString()}</td>
          <td>${sentiment}</td>
          <td><button class="btn" onclick='showModal("${doc.id}", false)'>View</button></td>
        </tr>`;
    }
  });

  document.getElementById("totalSubmissions").innerText = total;
  document.getElementById("openTickets").innerText = open;
  document.getElementById("resolvedToday").innerText = resolvedToday;

  const nps = totalResponses
    ? (((promoters - detractors) / totalResponses) * 100).toFixed(2)
    : "0";
  const npsElement = document.getElementById("npsScore");
  npsElement.innerText = nps;

  if (nps >= 80) npsElement.style.color = "#4caf50";
  else if (nps >= 50) npsElement.style.color = "#ffc107";
  else npsElement.style.color = "#dc3545";
}

function exportToCSV() {
  try {
    const table = document.getElementById("dataTable");
    if (!table) return alert("No data to export");
    const rows = Array.from(table.getElementsByTagName("tr"));
    let csvContent = "Name,Email,Type,Status,Date,Sentiment\n";
    rows.forEach((row) => {
      const cells = Array.from(row.getElementsByTagName("td"));
      if (cells.length) {
        const rowData = [
          cells[0].textContent,
          cells[1].textContent,
          cells[2].textContent,
          cells[3].textContent.replace(/[\n\r]+/g, " "),
          cells[4].textContent,
          cells[5].textContent.replace(/[()]/g, ""),
        ]
          .map((cell) => `"${cell.trim()}"`)
          .join(",");
        csvContent += rowData + "\n";
      }
    });
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `dashboard_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Export error:", error);
    alert("Error exporting data to CSV");
  }
}

document.getElementById("viewModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && document.getElementById("viewModal").classList.contains("show")) {
    closeModal();
  }
});

window.addEventListener("DOMContentLoaded", () => {
  loadDashboard().then(() => {
      if(typeof fetchAIComplaintSummary === 'function') {
          fetchAIComplaintSummary();
      }
  });
});
