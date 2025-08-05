// ✅ Cleaned admin.js — Unused chart-related code fully removed

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

async function showModal(docId, isComplaint, details, currentStatus) {
  const modalDetails = document.getElementById("modalDetails");
  const statusUpdate = document.getElementById("statusUpdate");

  if (!isComplaint) {
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
    modalDetails.innerHTML = details;
    const complaintDoc = await db.collection("complaints").doc(docId).get();
    const complaintData = complaintDoc.data();
    const isResolved = complaintData.status === "resolved";

    statusUpdate.innerHTML = `
      <div class="analysis-section">
        <h4>Root Cause Analysis</h4>
        <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.rca || ""}</textarea>

        <h4>Corrective and Preventive Action</h4>
        <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.capa || ""}</textarea>

        <div id="aiSuggestion-${docId}" class="ai-rca-loader" style="margin-top:10px;">${
          isResolved ? "" : '<span style="font-size:13px;color:#666;"><i class="fas fa-robot"></i> Getting AI suggestions...</span>'
        }</div>

        ${
          isResolved
            ? ""
            : `<button onclick="updateComplaint('${docId}')" class="update-btn">Update</button>`
        }
      </div>
    `;

    if (!isResolved && complaintData.message) {
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

  await db.collection("complaints").doc(docId).update({
    rca,
    capa,
    status: "resolved",
    resolvedAt: new Date(),
  });

  closeModal();
  loadDashboard();
}

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
    "good",
    "great",
    "excellent",
    "amazing",
    "awesome",
    "love",
  ];
  const negativeWords = [
    "bad",
    "poor",
    "terrible",
    "awful",
    "hate",
    "issue",
    "problem",
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
    data.quality,
    data.ease,
    data.recommend,
    data.npsScore,
    data.feedback,
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
  const dateFilter = document.getElementById("dateFilter").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
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
      const details = `<p><strong>Name:</strong> ${
        data.name
      }</p><p><strong>Email:</strong> ${
        data.email
      }</p><p><strong>Status:</strong> ${
        data.status
      }</p><p><strong>Date:</strong> ${createdDate.toLocaleDateString()}</p><p><strong>Message:</strong> ${
        data.message
      }</p>`;
      const sentiment = analyzeComplaintSentiment(data);
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
          <td>${sentiment}</td>
          <td><button class="btn" onclick='showModal("${
            doc.id
          }", true, ${JSON.stringify(details)}, "${
        data.status
      }")'>View</button></td>
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
      const details = `<p><strong>Name:</strong> ${
        data.name
      }</p><p><strong>Email:</strong> ${
        data.email
      }</p><p><strong>Date:</strong> ${createdDate.toLocaleDateString()}</p><p><strong>NPS Score:</strong> ${
        data.npsScore || "N/A"
      }</p><p><strong>Feedback:</strong> ${data.feedback || "N/A"}</p>`;
      document.getElementById("dataTable").innerHTML += `
        <tr>
          <td>${data.name}</td>
          <td>${data.email}</td>
          <td>Survey</td>
          <td><span class="badge badge-blue">N/A</span></td>
          <td>${createdDate.toLocaleDateString()}</td>
          <td>${sentiment}</td>
          <td><button class="btn" onclick='showModal("${
            doc.id
          }", false, ${JSON.stringify(details)})'>View</button></td>
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

  // Optional: Color code the NPS Score
  if (nps >= 80) {
    npsElement.style.color = "#4caf50"; // green
  } else if (nps >= 50) {
    npsElement.style.color = "#ffc107"; // yellow
  } else {
    npsElement.style.color = "#dc3545"; // red
  }
}

function exportToCSV() {
  try {
    const table = document.getElementById("dataTable");
    if (!table) {
      alert("No data to export");
      return;
    }

    // Get all rows
    const rows = Array.from(table.getElementsByTagName("tr"));

    // CSV Header
    let csvContent = "Name,Email,Type,Status,Date,Sentiment\n";

    // Convert rows to CSV format
    rows.forEach((row) => {
      const cells = Array.from(row.getElementsByTagName("td"));
      if (cells.length) {
        const rowData = [
          cells[0].textContent, // Name
          cells[1].textContent, // Email
          cells[2].textContent, // Type
          cells[3].textContent.replace(/[\n\r]+/g, " "), // Status (remove line breaks)
          cells[4].textContent, // Date
          cells[5].textContent.replace(/[()]/g, ""), // Sentiment (remove parentheses)
        ]
          .map((cell) => `"${cell.trim()}"`)
          .join(",");

        csvContent += rowData + "\n";
      }
    });

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `dashboard_export_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export error:", error);
    alert("Error exporting data to CSV");
  }
}

document.getElementById("viewModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});

document.addEventListener("keydown", function (e) {
  if (
    e.key === "Escape" &&
    document.getElementById("viewModal").classList.contains("show")
  ) {
    closeModal();
  }
});

// const OPENROUTER_API_KEY =
//   "Bearer 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";

// async function fetchAIComplaintSummary() {
//   const aiSummaryElement = document.getElementById("aiSummary");
//   if (!aiSummaryElement) return;
//   aiSummaryElement.innerHTML = "Analyzing complaints and surveys...";
//   const [complaintsSnap, surveysSnap] = await Promise.all([
//     db.collection("complaints").get(),
//     db.collection("surveys").get(),
//   ]);

//   const messages = [];
//   complaintsSnap.forEach((doc) => {
//     const data = doc.data();
//     if (data.message) messages.push(`Complaint: ${data.message}`);
//   });
//   surveysSnap.forEach((doc) => {
//     const data = doc.data();
//     if (data.feedback) messages.push(`Survey: ${data.feedback}`);
//   });

//   if (messages.length === 0) {
//     aiSummaryElement.innerHTML = "No complaints or survey feedback to analyze.";
//     return;
//   }

//   const prompt = `You're an AI trained to analyze customer issues. Analyze the following ${
//     messages.length
//   } complaints and feedback entries. Return 3-5 bullet points of top issues, count per issue, and short descriptions.\n\n${messages.join(
//     "\n"
//   )}`;

//   const response = await fetch(
//     "https://openrouter.ai/api/v1/chat/completions",
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: OPENROUTER_API_KEY,
//       },
//       body: JSON.stringify({
//         model: "anthropic/claude-3-haiku",
//         messages: [{ role: "user", content: prompt }],
//       }),
//     }
//   );

//   const result = await response.json();
//   aiSummaryElement.innerHTML = `<pre>${
//     result?.choices?.[0]?.message?.content || "No summary generated."
//   }</pre>`;
// }

window.addEventListener("DOMContentLoaded", () => {
  loadDashboard().then(fetchAIComplaintSummary);
});
