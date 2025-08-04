const firebaseConfig = {
  apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
  authDomain: "smart-customer-support-portal.firebaseapp.com",
  projectId: "smart-customer-support-portal",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

firebase.auth().onAuthStateChanged((user) => {
  if (!user) window.location.href = "index.html"; // Changed from login.html
});

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => (location.href = "index.html")); // Changed from login.html
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

    // Log the survey data to debug
    console.log("Survey Data:", surveyData);

    const submissionDate = surveyData.createdAt?.toDate().toLocaleString();

    modalDetails.innerHTML = `
          <div class="survey-details">
            <!-- Basic Customer Info -->
            <div class="section-title">Customer Information</div>
            <div class="detail-row">
              <label>Name:</label>
              <span>${surveyData.name || "N/A"}</span>
            </div>
            <div class="detail-row">
              <label>Email:</label>
              <span>${surveyData.email || "N/A"}</span>
            </div>
            <div class="detail-row">
              <label>Submission Date:</label>
              <span>${submissionDate || "N/A"}</span>
            </div>

            <!-- Survey Responses -->
            <div class="section-title">Survey Responses</div>
            <div class="detail-row">
              <label>How likely are you to recommend us?</label>
              <span>${surveyData.recommend || "N/A"}/10</span>
            </div>
            <div class="detail-row">
              <label>How would you rate our ease of use?</label>
              <span>${surveyData.ease || "N/A"}/5</span>
            </div>
            <div class="detail-row">
              <label>How would you rate our service quality?</label>
              <span>${surveyData.quality || "N/A"}/5</span>
            </div>
            <div class="detail-row">
              <label>Additional Feedback:</label>
              <p class="feedback-text">${
                surveyData.feedback || "No feedback provided"
              }</p>
            </div>
          </div>
        `;

    statusUpdate.innerHTML = "";
  } else {
    modalDetails.innerHTML = details;

    if (isComplaint) {
      const complaintDoc = await db.collection("complaints").doc(docId).get();
      const complaintData = complaintDoc.data();

      // Check if complaint is already resolved
      const isResolved = complaintData.status === "resolved";

      statusUpdate.innerHTML = `
            <div class="analysis-section">
              <h4>Root Cause Analysis</h4>
              <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="3" 
                ${isResolved ? "disabled" : ""} 
                class="${isResolved ? "textarea-disabled" : ""}">${
        complaintData.rca || ""
      }</textarea>
              
              <h4>Corrective and Preventive Action</h4>
              <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="3"
                ${isResolved ? "disabled" : ""} 
                class="${isResolved ? "textarea-disabled" : ""}">${
        complaintData.capa || ""
      }</textarea>
              
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

// Add new function to handle complaint updates
async function updateComplaint(docId) {
  const rca = document.getElementById("rcaInput").value.trim();
  const capa = document.getElementById("capaInput").value.trim();

  // Validate inputs
  if (!rca || !capa) {
    alert("Please fill both RCA and CAPA sections before updating");
    return;
  }

  try {
    await db.collection("complaints").doc(docId).update({
      rca: rca,
      capa: capa,
      status: "resolved", // Automatically set to resolved
      resolvedAt: new Date(),
    });

    closeModal();
    loadDashboard();
  } catch (error) {
    alert("Error updating complaint: " + error.message);
  }
}

async function updateStatus(id) {
  const newStatus = document.getElementById("newStatus").value;
  await db.collection("complaints").doc(id).update({ status: newStatus });
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
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return dateToCheck >= startOfMonth;

    case "custom":
      const startDate = new Date(document.getElementById("startDate").value);
      const endDate = new Date(document.getElementById("endDate").value);
      endDate.setHours(23, 59, 59); // Include the entire end date
      return dateToCheck >= startDate && dateToCheck <= endDate;

    default:
      return true; // 'all' case
  }
}

function analyzeSentiment(text) {
  const positiveWords = [
    "good",
    "great",
    "excellent",
    "amazing",
    "wonderful",
    "fantastic",
    "helpful",
    "best",
    "happy",
    "satisfied",
    "thank",
    "thanks",
    "awesome",
    "love",
    "perfect",
    "outstanding",
    "exceptional",
    "brilliant",
    "superb",
    "delightful",
    "pleasant",
    "impressed",
    "efficient",
    "fast",
    "quick",
    "responsive",
    "easy",
    "simple",
    "user-friendly",
    "intuitive",
    "smooth",
    "reliable",
    "trustworthy",
    "valuable",
    "worth",
    "recommend",
    "professional",
    "clean",
    "organized",
    "secure",
    "safe",
    "innovative",
    "improved",
    "better",
    "working",
    "works well",
    "convenient",
  ];

  const negativeWords = [
    "bad",
    "poor",
    "terrible",
    "awful",
    "horrible",
    "worst",
    "disgusting",
    "unacceptable",
    "unhappy",
    "unsatisfied",
    "dissatisfied",
    "frustrated",
    "disappointed",
    "regret",
    "issue",
    "problem",
    "bug",
    "error",
    "crash",
    "fail",
    "failure",
    "doesn't work",
    "does not work",
    "not working",
    "not good",
    "not great",
    "broken",
    "glitch",
    "slow",
    "laggy",
    "delayed",
    "late",
    "complicated",
    "confusing",
    "unclear",
    "hard",
    "difficult",
    "annoying",
    "painful",
    "hate",
    "dislike",
    "boring",
    "waste",
    "expensive",
    "overpriced",
    "not worth",
    "rude",
    "unhelpful",
    "ignored",
    "incomplete",
    "dirty",
    "messy",
    "unsafe",
    "unreliable",
    "untrustworthy",
    "crappy",
    "junk",
    "never again",
    "no support",
    "can't use",
    "can't login",
    "locked out",
    "inconvenient",
  ];

  text = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  // Count matches
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

  // Add CSS for sentiment badges
  return generateSentimentBadge(positiveScore, negativeScore);
}

function generateSentimentBadge(positiveScore, negativeScore) {
  const diff = positiveScore - negativeScore;

  if (diff > 0) {
    return `<span class="badge badge-positive">Positive (${positiveScore})</span>`;
  } else if (diff < 0) {
    return `<span class="badge badge-negative">Negative (${Math.abs(
      negativeScore
    )})</span>`;
  } else {
    return `<span class="badge badge-neutral">Neutral</span>`;
  }
}

function analyzeSurveyData(surveyData) {
  let sentimentScore = 0;

  // Analyze recommendation score
  const recommendText = String(surveyData.recommend).toLowerCase();
  if (recommendText.includes("definitely")) sentimentScore += 2;

  // Analyze ease of use
  const easeText = String(surveyData.ease).toLowerCase();
  if (easeText.includes("very easy")) sentimentScore += 1;

  // Analyze quality
  const qualityText = String(surveyData.quality).toLowerCase();
  if (qualityText.includes("excellent")) sentimentScore += 1;

  // Analyze text feedback
  const feedback = surveyData.feedback?.toLowerCase() || "";
  if (feedback.includes("nice")) sentimentScore += 1;

  // Generate final sentiment badge with more detailed scoring
  if (sentimentScore > 0) {
    return `<span class="badge badge-positive">Positive (+${sentimentScore})</span>`;
  } else if (sentimentScore < 0) {
    return `<span class="badge badge-negative">Negative (${sentimentScore})</span>`;
  } else {
    return `<span class="badge badge-neutral">Neutral</span>`;
  }
}

function analyzeSurveySentiment(surveyData) {
  // Combine all dropdown answers and feedback
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

let gaugeChart = null;

function updateNPSGauge(score) {
  // Ensure score is between -100 and 100
  score = Math.max(-100, Math.min(100, score));

  // Update the display value with color based on score
  const npsElement = document.getElementById("avgNPS");
  npsElement.innerText = score + "%";

  // Set color based on score ranges
  if (score >= 80) {
    npsElement.style.color = "#4caf50"; // green
  } else if (score >= 50) {
    npsElement.style.color = "#ffc107"; // yellow
  } else {
    npsElement.style.color = "#dc3545"; // red
  }
}

let npsChart = null;

function initNPSChart() {
    const ctx = document.getElementById('npsChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
    // Make gradient more visible
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.15)');  // Increased opacity
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0.01)');

    npsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'NPS Score',
                data: [],
                borderColor: '#0066cc',           // Darker blue line
                backgroundColor: gradient,
                borderWidth: 2.5,                 // Slightly thicker line
                tension: 0.2,                     // Less curve (more angular)
                pointRadius: 4,                   // Larger points
                pointHoverRadius: 8,
                pointBackgroundColor: '#007bff',
                pointHoverBackgroundColor: '#007bff',
                pointBorderColor: '#fff',
                pointHoverBorderColor: '#fff',
                pointBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#333',
                    bodyColor: '#666',
                    borderColor: '#e0e0e0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].label);
                            return date.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                            });
                        },
                        label: function(context) {
                            const score = Math.round(context.parsed.y);
                            const color = score >= 0 ? '🟢' : '🔴';
                            return `${color} NPS: ${score}%`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        maxRotation: 45,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    min: -100,
                    max: 100,
                    grid: {
                        color: '#f0f0f0',
                        display: true,
                        drawBorder: false
                    },
                    ticks: {
                        stepSize: 25,  // Show ticks at -100, -75, -50, etc.
                        font: {
                            size: 11
                        },
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

async function updateChartData(timeRange) {
    const endDate = new Date();
    let startDate = new Date();

    // Set proper time range
    switch(timeRange) {
        case '1D':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case '5D':
            startDate.setDate(endDate.getDate() - 5);
            break;
        case '1M':
            startDate.setMonth(endDate.getMonth() - 1);
            break;
        case '1Y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        case 'ALL':
            startDate = new Date(0);
            break;
    }

    // Fetch surveys within date range
    const surveys = await db.collection('surveys')
        .where('createdAt', '>=', startDate)
        .where('createdAt', '<=', endDate)
        .orderBy('createdAt')
        .get();

    const dataPoints = new Map();

    // Process survey data
    surveys.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt.toDate().toISOString().split('T')[0];
        
        if (!dataPoints.has(date)) {
            dataPoints.set(date, {
                promoters: 0,
                detractors: 0,
                total: 0
            });
        }

        const point = dataPoints.get(date);
        // Ensure npsScore is treated as a number
        const score = parseInt(data.npsScore || 0);
        
        if (score >= 9) point.promoters++;
        else if (score <= 6) point.detractors++;
        point.total++;
    });

    // Calculate NPS scores and format data for chart
    const chartData = Array.from(dataPoints.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, data]) => ({
            date,
            // Calculate NPS as whole number between -100 and 100
            nps: Math.round(((data.promoters - data.detractors) / data.total) * 100) || 0
        }));

    // Update chart with new data
    if (chartData.length > 0) {
        npsChart.data.labels = chartData.map(d => d.date);
        npsChart.data.datasets[0].data = chartData.map(d => d.nps);
        npsChart.update();
    }
}

async function loadDashboard() {
  console.log("Starting dashboard data load...");

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

  // Log complaints data
  const complaints = await db.collection("complaints").get();
  console.log(`Found ${complaints.size} complaints in database`);

  complaints.forEach((doc) => {
    const data = doc.data();
    console.log("Complaint data:", {
      id: doc.id,
      name: data.name,
      email: data.email,
      status: data.status,
      message: data.message,
      createdAt: data.createdAt?.toDate(),
      rca: data.rca,
      capa: data.capa,
    });
  });

  // Log surveys data
  const surveys = await db.collection("surveys").get();
  console.log(`Found ${surveys.size} surveys in database`);

  surveys.forEach((doc) => {
    const data = doc.data();
    console.log("Survey data:", {
      id: doc.id,
      name: data.name,
      email: data.email,
      npsScore: data.npsScore,
      feedback: data.feedback,
      wouldRecommend: data.wouldRecommend,
      serviceRating: data.serviceRating,
      createdAt: data.createdAt?.toDate(),
    });
  });

  complaints.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt?.toDate();

    // Only process if date is in selected range
    if (createdDate && isDateInRange(createdDate)) {
      total++;

      // Add console log to debug status
      console.log("Complaint status:", data.status);

      // Check if status exists and is "open"
      if (data.status && data.status.toLowerCase() === "open") {
        open++;
      }
      if (
        data.status === "resolved" &&
        data.createdAt?.toDate().toISOString().startsWith(today)
      )
        resolvedToday++;

      if (
        (typeFilter === "complaint" || typeFilter === "all") &&
        (statusFilter === data.status || statusFilter === "all")
      ) {
        // Filter by date ranges
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
                <p><strong>Date:</strong> ${data.createdAt
                  ?.toDate()
                  .toLocaleDateString()}</p>
                <p><strong>Message:</strong> ${data.message}</p>`;

          // For complaints
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
                  <td>${data.createdAt?.toDate().toLocaleDateString()}</td>
                  <td>${sentiment}</td>
                  <td><button class="btn" onclick='showModal("${
                    doc.id
                  }", true, ${JSON.stringify(details)}, "${
            data.status
          }")'>View</button></td>
                </tr>`;
        }
      }
    }
  });

  surveys.forEach((doc) => {
    const data = doc.data();
    const createdDate = data.createdAt?.toDate();

    // Only process if date is in selected range
    if (createdDate && isDateInRange(createdDate)) {
      total++;

      // Sentiment analysis for survey
      const sentiment = analyzeSurveySentiment(data);
      if (sentiment.includes("Positive")) promoters++;
      else if (sentiment.includes("Negative")) detractors++;
      else passives++;
      totalResponses++;

      // Add this section to display survey data in table
      if (typeFilter === "survey" || typeFilter === "all") {
        const details = `
              <p><strong>Name:</strong> ${data.name}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Date:</strong> ${data.createdAt
                ?.toDate()
                .toLocaleDateString()}</p>
              <p><strong>NPS Score:</strong> ${data.npsScore || "N/A"}</p>
              <p><strong>Feedback:</strong> ${data.feedback || "N/A"}</p>`;

        // For surveys
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

  // Update dashboard metrics
  document.getElementById("totalSubmissions").innerText = total;
  document.getElementById("openTickets").innerText = open;
  document.getElementById("resolvedToday").innerText = resolvedToday;
  document.getElementById("avgNPS").innerText = totalResponses
    ? (((promoters - detractors) / totalResponses) * 100).toFixed(2) + "%"
    : "-";

  // Update NPS gauge
  const npsScore = totalResponses
    ? ((promoters - detractors) / totalResponses) * 100
    : 0;
  updateNPSGauge(Number(npsScore.toFixed(0)));

  if (!npsChart) {
    await initNPSChart();
  }
}

// Close modal when clicking outside
document.getElementById("viewModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeModal();
  }
});

// Close modal on ESC key
document.addEventListener("keydown", function (e) {
  if (
    e.key === "Escape" &&
    document.getElementById("viewModal").classList.contains("show")
  ) {
    closeModal();
  }
});

loadDashboard();
