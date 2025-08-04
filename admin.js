// --- Firebase Config ---
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
  firebase.auth().signOut().then(() => (location.href = "index.html"));
}

// --- Modal, RCA, CAPA handling ---
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
        <div class="detail-row"><label>Name:</label><span>${surveyData.name || "N/A"}</span></div>
        <div class="detail-row"><label>Email:</label><span>${surveyData.email || "N/A"}</span></div>
        <div class="detail-row"><label>Submission Date:</label><span>${submissionDate || "N/A"}</span></div>
        <div class="section-title">Survey Responses</div>
        <div class="detail-row"><label>How likely are you to recommend us?</label><span>${surveyData.recommend || "N/A"}/10</span></div>
        <div class="detail-row"><label>How would you rate our ease of use?</label><span>${surveyData.ease || "N/A"}/5</span></div>
        <div class="detail-row"><label>How would you rate our service quality?</label><span>${surveyData.quality || "N/A"}/5</span></div>
        <div class="detail-row"><label>Additional Feedback:</label><p class="feedback-text">${surveyData.feedback || "No feedback provided"}</p></div>
      </div>
    `;
    statusUpdate.innerHTML = "";
  } else {
    modalDetails.innerHTML = details;
    if (isComplaint) {
      const complaintDoc = await db.collection("complaints").doc(docId).get();
      const complaintData = complaintDoc.data();
      const isResolved = complaintData.status === "resolved";
      statusUpdate.innerHTML = `
        <div class="analysis-section">
          <h4>Root Cause Analysis</h4>
          <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.rca || ""}</textarea>
          <h4>Corrective and Preventive Action</h4>
          <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.capa || ""}</textarea>
          ${
            isResolved
              ? ""
              : "<button onclick=\"updateComplaint('" +
                docId +
                '\')" class="update-btn">Update</button>'
          }
        </div>
      `;
    } else {
      statusUpdate.innerHTML = "";
    }
  }
  const modal = document.getElementById("viewModal");
  modal.classList.add("show");
  document.body.classList.add("modal-open");
}

async function updateComplaint(docId) {
  const rca = document.getElementById("rcaInput").value.trim();
  const capa = document.getElementById("capaInput").value.trim();
  if (!rca || !capa) {
    alert("Please fill both RCA and CAPA sections before updating");
    return;
  }
  try {
    await db.collection("complaints").doc(docId).update({
      rca: rca,
      capa: capa,
      status: "resolved",
      resolvedAt: new Date(),
    });
    closeModal();
    loadDashboard();
  } catch (error) {
    alert("Error updating complaint: " + error.message);
  }
}

// --- Sentiment Analysis ---
function analyzeSentiment(text) {
  const positiveWords = [
    "good", "great", "excellent", "amazing", "wonderful", "fantastic", "helpful", "best", "happy", "satisfied", "thank", "thanks", "awesome", "love", "perfect", "outstanding", "exceptional", "brilliant", "superb", "delightful", "pleasant", "impressed", "efficient", "fast", "quick", "responsive", "easy", "simple", "user-friendly", "intuitive", "smooth", "reliable", "trustworthy", "valuable", "worth", "recommend", "professional", "clean", "organized", "secure", "safe", "innovative", "improved", "better", "working", "works well", "convenient",
  ];
  const negativeWords = [
    "bad", "poor", "terrible", "awful", "horrible", "worst", "disgusting", "unacceptable", "unhappy", "unsatisfied", "dissatisfied", "frustrated", "disappointed", "regret", "issue", "problem", "bug", "error", "crash", "fail", "failure", "doesn't work", "does not work", "not working", "not good", "not great", "broken", "glitch", "slow", "laggy", "delayed", "late", "complicated", "confusing", "unclear", "hard", "difficult", "annoying", "painful", "hate", "dislike", "boring", "waste", "expensive", "overpriced", "not worth", "rude", "unhelpful", "ignored", "incomplete", "dirty", "messy", "unsafe", "unreliable", "untrustworthy", "crappy", "junk", "never again", "no support", "can't use", "can't login", "locked out", "inconvenient",
  ];
  text = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;
  positiveWords.forEach((word) => {
    const regex = new RegExp("\\b" + word + "\\b", "gi");
    const matches = text.match(regex);
    if (matches) positiveScore += matches.length;
  });
  negativeWords.forEach((word) => {
    const regex = new RegExp("\\b" + word + "\\b", "gi");
    const matches = text.match(regex);
    if (matches) negativeScore += matches.length;
  });
  return generateSentimentBadge(positiveScore, negativeScore);
}

function generateSentimentBadge(positiveScore, negativeScore) {
  const diff = positiveScore - negativeScore;
  if (diff > 0) {
    return `<span class="badge badge-positive">Positive (${positiveScore})</span>`;
  } else if (diff < 0) {
    return `<span class="badge badge-negative">Negative (${Math.abs(negativeScore)})</span>`;
  } else {
    return `<span class="badge badge-neutral">Neutral</span>`;
  }
}

function analyzeSurveySentiment(surveyData) {
  const answers = [
    surveyData.quality,
    surveyData.ease,
    surveyData.recommend,
    surveyData.npsScore,
    surveyData.feedback,
  ]
    .map((a) => (a || "").toString().toLowerCase())
    .join(" ");
  return analyzeSentiment(answers);
}

function analyzeComplaintSentiment(complaintData) {
  const message = (complaintData.message || "").toLowerCase();
  return analyzeSentiment(message);
}

// --- Dashboard Loading ---
function isDateInRange(dateToCheck) {
  const dateFilter = document.getElementById("dateFilter").value;
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (dateFilter) {
    case "today":
      return dateToCheck >= startOfDay;
    case "week":
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return dateToCheck >= startOfWeek;
    case "month":
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return dateToCheck >= startOfMonth;
    case "custom":
      const startDate = new Date(document.getElementById("startDate").value);
      const endDate = new Date(document.getElementById("endDate").value);
      endDate.setHours(23, 59, 59);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    default:
      return true;
  }
}

async function loadDashboard() {
  let total = 0, open = 0, resolvedToday = 0;
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
    if (createdDate && isDateInRange(createdDate)) {
      total++;
      if (data.status && data.status.toLowerCase() === "open") open++;
      if (
        data.status === "resolved" &&
        data.createdAt?.toDate().toISOString().startsWith(today)
      )
        resolvedToday++;
      if (
        (typeFilter === "complaint" || typeFilter === "all") &&
        (statusFilter === data.status || statusFilter === "all")
      ) {
        const createdAt = data.createdAt?.toDate().toISOString().split("T")[0];
        let dateCondition = true;
        if (dateFilter === "today") {
          dateCondition = createdAt === today;
        } else if (dateFilter === "week") {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          dateCondition = new Date(createdAt) >= oneWeekAgo;
        } else if (dateFilter === "month") {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
          dateCondition = new Date(createdAt) >= oneMonthAgo;
        } else if (dateFilter === "custom") {
          dateCondition = createdAt >= startDate && createdAt <= endDate;
        }
        if (dateCondition) {
          const details = `
            <p><strong>Name:</strong> ${data.name}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Status:</strong> ${data.status}</p>
            <p><strong>Date:</strong> ${data.createdAt?.toDate().toLocaleDateString()}</p>
            <p><strong>Message:</strong> ${data.message}</p>`;
          const sentiment = analyzeComplaintSentiment(data);
          document.getElementById("dataTable").innerHTML += `
            <tr>
              <td>${data.name}</td>
              <td>${data.email}</td>
              <td>Complaint</td>
              <td><span class="badge ${data.status.toLowerCase() === "open" ? "badge-yellow" : "badge-green"}">${data.status}</span></td>
              <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
              <td>${sentiment}</td>
              <td><button class="btn" onclick='showModal("${doc.id}", true, ${JSON.stringify(details)}, "${data.status}")'>View</button></td>
            </tr>`;
        }
      }
    }
  });

  surveys.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt?.toDate();
    if (createdDate && isDateInRange(createdDate)) {
      total++;
      if (
        typeFilter === "survey" ||
        typeFilter === "all"
      ) {
        const details = `
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Date:</strong> ${data.createdAt?.toDate().toLocaleDateString()}</p>
          <p><strong>NPS Score:</strong> ${data.npsScore || "N/A"}</p>
          <p><strong>Feedback:</strong> ${data.feedback || "N/A"}</p>`;
        const sentiment = analyzeSurveySentiment(data);
        document.getElementById("dataTable").innerHTML += `
          <tr>
            <td>${data.name}</td>
            <td>${data.email}</td>
            <td>Survey</td>
            <td><span class="badge badge-blue">N/A</span></td>
            <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
            <td>${sentiment}</td>
            <td><button class="btn" onclick='showModal("${
              doc.id
            }", false, ${JSON.stringify(details)})'>View</button></td>
          </tr>`;
      }
    }
  });

  document.getElementById("totalSubmissions").innerText = total;
  document.getElementById("openTickets").innerText = open;
  document.getElementById("resolvedToday").innerText = resolvedToday;

  await fetchAIComplaintSummary();
}

// --- AI Complaint Summary (Claude/Gemini/OpenRouter) ---
const OPENROUTER_API_KEY = "Bearer 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";

async function fetchAIComplaintSummary() {
  const summaryElement = document.getElementById('aiIssueSummary');
  if (!summaryElement) return;
  try {
    const snapshot = await db.collection('complaints')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const messages = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.message) messages.push(`Type: ${data.type || "N/A"} | Message: ${data.message}`);
    });
    if (messages.length === 0) {
      summaryElement.innerHTML = '<p>No complaints to analyze</p>';
      return;
    }
    const fullPrompt = `
You are an AI that analyzes customer complaints.

Each complaint includes:
- A type (e.g. Product, Service, Staff, Delivery, Pricing)
- A message

Instructions:
1. Review all the complaints.
2. Identify recurring problems grouped by themes like "Poor Support", "Product Defects", etc.
3. Output a concise list of 3-5 common issues (max 3 words each). No explanation.

Format:
- Poor Support
- Product Defect
- Pricing Confusion

Analyze these ${messages.length} complaints and give a summary of top 5 recurring issues.

Complaints:
${messages.join("\n")}`;
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": OPENROUTER_API_KEY,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [{
          role: "user",
          content: fullPrompt,
        }],
      }),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const result = await response.json();
    const aiSummary = result?.choices?.[0]?.message?.content || "AI summary not available.";
    summaryElement.innerHTML = aiSummary.replace(/\n/g, '<br>');
  } catch (error) {
    console.error('Error generating summary:', error);
    summaryElement.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        Error generating summary: ${error.message}
        <button onclick="fetchAIComplaintSummary()" class="retry-btn">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>`;
  }
}

// --- Modal close handlers ---
document.getElementById("viewModal").addEventListener("click", function (e) {
  if (e.target === this) closeModal();
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && document.getElementById("viewModal").classList.contains("show")) {
    closeModal();
  }
});
