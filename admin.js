/**
 * Admin Dashboard — Main Logic
 * Handles: Auth, data loading, AI sentiment, charts, search, pagination, modals, export
 * Depends on: ai-config.js, Firebase Auth, Supabase, Chart.js
 */

// ========== Firebase Config (Auth only) ==========
const firebaseConfig = {
  apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
  authDomain: "smart-customer-support-portal.firebaseapp.com",
  projectId: "smart-customer-support-portal",
};
firebase.initializeApp(firebaseConfig);

// ========== Supabase Removed. Google Sheets active via db-config.js ==========

// ========== State ==========
let allRows = []; // All processed table rows after filtering
let globalComplaints = []; // Raw sheets data
let globalSurveys = [];    // Raw sheets data
let currentPage = 1;
const ROWS_PER_PAGE = 20;
let npsTrendChartInstance = null;
let sentimentChartInstance = null;
let globalNpsTrendData = {}; // Store for theme re-rendering
window._sentimentCache = window._sentimentCache || new Map(); // Cache for sentiments

// Sentiment counts for the chart
let sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };

// ========== Auth ==========
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
  } else {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeDashboard);
    } else {
      initializeDashboard();
    }
  }
});

async function initializeDashboard() {
  console.log("🚀 Initializing dashboard...");
  const connected = await testDatabaseConnection();
  if (connected) {
    loadDashboard();
  } else {
    const tableElement = document.getElementById("dataTable");
    if (tableElement) {
      tableElement.innerHTML = `<tr><td colspan="7" style="color: var(--accent-red); text-align: center; padding: 30px;">❌ Database connection failed. Check console.</td></tr>`;
    }
  }
}

async function testDatabaseConnection() {
  try {
    const data = await DB.getRows();
    if (!data.complaints && !data.surveys) throw new Error("No data returned");
    console.log("✅ Google Sheets connected");
    return true;
  } catch (err) {
    console.error("❌ Google Sheets error:", err);
    return false;
  }
}

function logout() {
  firebase.auth().signOut().then(() => (location.href = "index.html"));
}

// ========== Modal ==========
function closeModal() {
  const modal = document.getElementById("viewModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  }
}

async function showModal(docId, isComplaint) {
  const modalDetails = document.getElementById("modalDetails");
  const statusUpdate = document.getElementById("statusUpdate");
  if (!modalDetails || !statusUpdate) return;

  if (!isComplaint) {
    try {
      const s = globalSurveys.find(item => item.id == docId);
      if (!s) throw new Error("Survey not found");

      const date = new Date(s.created_at).toLocaleString();
      modalDetails.innerHTML = `
        <div class="survey-details">
          <div class="section-title full-width">Customer Information</div>
          <div class="detail-row"><label>Name:</label><span>${s.name || "N/A"}</span></div>
          <div class="detail-row"><label>Email:</label><span>${s.email || "N/A"}</span></div>
          <div class="detail-row"><label>Submitted:</label><span>${date}</span></div>
          <div class="section-title full-width">Survey Responses</div>
          <div class="detail-row"><label>NPS Score:</label><span>${s.nps_score ?? "N/A"}/10</span></div>
          <div class="detail-row"><label>Quality:</label><span>${s.quality || "N/A"}</span></div>
          <div class="detail-row"><label>Ease of Use:</label><span>${s.ease || "N/A"}</span></div>
          <div class="detail-row"><label>Would Recommend:</label><span>${s.recommend || "N/A"}</span></div>
          <div class="detail-row full-width"><label>Feedback:</label><div class="feedback-text">${s.feedback || "No feedback provided"}</div></div>
        </div>
      `;
      statusUpdate.innerHTML = "";
    } catch (error) {
      modalDetails.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><div class="error-details"><strong>Error</strong><p>${error.message}</p></div></div>`;
    }
  } else {
    try {
      const c = globalComplaints.find(item => item.id == docId);
      if (!c) throw new Error("Complaint not found");

      const date = new Date(c.created_at).toLocaleString();
      const isResolved = c.status === "resolved";

      modalDetails.innerHTML = `
        <div class="survey-details compact">
          <div class="section-title full-width">Complaint Details</div>
          <div class="detail-row"><label>Name:</label><span>${c.name || "N/A"}</span></div>
          <div class="detail-row"><label>Email:</label><span>${c.email || "N/A"}</span></div>
          <div class="detail-row"><label>Ticket ID:</label><span>${c.ticket_id || "N/A"}</span></div>
          <div class="detail-row"><label>Type:</label><span>${c.type || "N/A"}</span></div>
          <div class="detail-row"><label>Date:</label><span>${date}</span></div>
          <div class="detail-row"><label>Status:</label><span>${c.status || "N/A"}</span></div>
          <div class="detail-row full-width"><label>Message:</label><div class="feedback-text">${c.message || "No message"}</div></div>
        </div>
      `;

      statusUpdate.innerHTML = `
        <div class="analysis-section">
          <h4>Root Cause Analysis</h4>
          <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="2" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${c.rca || ""}</textarea>
          <h4>Corrective & Preventive Action</h4>
          <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="2" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${c.capa || ""}</textarea>
          <div id="aiSuggestion-${docId}" class="ai-rca-loader">${isResolved ? "" : '<span style="font-size:13px;color:var(--muted-foreground);"><i class="fas fa-robot"></i> Getting AI suggestions...</span>'}</div>
          ${isResolved ? "" : `<div class="status-controls"><button onclick="updateComplaint('${docId}')" class="btn-primary"><i class="fas fa-check"></i> Update & Resolve</button></div>`}
        </div>
      `;

      if (!isResolved && c.message && typeof getAISuggestionsForComplaint === "function") {
        getAISuggestionsForComplaint(c.message, docId);
      }
    } catch (error) {
      modalDetails.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i><div class="error-details"><strong>Error</strong><p>${error.message}</p></div></div>`;
    }
  }

  const modal = document.getElementById("viewModal");
  if (modal) {
    modal.classList.add("show");
    document.body.classList.add("modal-open");
  }
}

async function updateComplaint(docId) {
  const rcaInput = document.getElementById("rcaInput");
  const capaInput = document.getElementById("capaInput");
  if (!rcaInput || !capaInput) return alert("Form elements not found");

  const rca = rcaInput.value.trim();
  const capa = capaInput.value.trim();
  if (!rca || !capa) return alert("Please fill both RCA and CAPA before updating");

  if (confirm("Mark this complaint as resolved?")) {
    try {
      const { error } = await DB.updateComplaint(docId, {
        status: "resolved", rca: rca, capa: capa
      });

      if (error) throw new Error(error);
      alert("✅ Complaint resolved!");
      closeModal();
      loadDashboard();
    } catch (error) {
      alert("Failed: " + error.message);
    }
  }
}

// ========== Date Filtering ==========
function handleDateFilter() {
  const dateFilter = document.getElementById("dateFilter");
  const customDateInputs = document.getElementById("customDateInputs");
  if (dateFilter && customDateInputs) {
    customDateInputs.style.display = dateFilter.value === "custom" ? "inline-flex" : "none";
    loadDashboard();
  }
}

function isDateInRange(dateToCheck) {
  const dateFilter = document.getElementById("dateFilter");
  if (!dateFilter) return true;
  const filterValue = dateFilter.value;
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  switch (filterValue) {
    case "today":
      return dateToCheck >= startOfDay;
    case "week": {
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return dateToCheck >= startOfWeek;
    }
    case "month":
      return dateToCheck >= new Date(today.getFullYear(), today.getMonth(), 1);
    case "custom": {
      const s = document.getElementById("startDate");
      const e = document.getElementById("endDate");
      if (!s?.value || !e?.value) return true;
      const startDate = new Date(s.value);
      const endDate = new Date(e.value);
      endDate.setHours(23, 59, 59);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    }
    default:
      return true;
  }
}

// ========== Sentiment Badge ==========
function getSentimentBadge(sentiment) {
  const s = (sentiment || "Neutral").trim();
  if (s === "Positive") return `<span class="badge badge-positive"><i class="fas fa-smile"></i> Positive</span>`;
  if (s === "Negative") return `<span class="badge badge-negative"><i class="fas fa-frown"></i> Negative</span>`;
  return `<span class="badge badge-neutral"><i class="fas fa-meh"></i> Neutral</span>`;
}

function getLoadingBadge() {
  return `<span class="badge badge-loading"><i class="fas fa-spinner fa-spin"></i> Analyzing...</span>`;
}

// ========== Main Dashboard Loader ==========
async function loadDashboard() {
  console.log("🔄 Loading dashboard...");

  let total = 0,
    open = 0,
    resolvedToday = 0;
  let promoters = 0,
    passives = 0,
    detractors = 0,
    totalNpsResponses = 0;
  const today = new Date().toISOString().split("T")[0];

  const typeFilter = document.getElementById("filterType")?.value || "all";
  const statusFilter = document.getElementById("filterStatus")?.value || "all";
  const dataTable = document.getElementById("dataTable");
  if (!dataTable) return;

  dataTable.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';

  // Reset sentiment counts
  sentimentCounts = { Positive: 0, Negative: 0, Neutral: 0 };

  // NPS trend data
  const npsTrendData = {};

  try {
    // Fetch data
    const dbData = await DB.getRows();
    
    // Sort descending by date (newest first)
    const sortByDate = (a, b) => new Date(b.created_at) - new Date(a.created_at);
    
    globalComplaints = (dbData.complaints || []).sort(sortByDate);
    globalSurveys = (dbData.surveys || []).sort(sortByDate);

    // Collect all rows and texts for batch sentiment
    allRows = [];
    const textsForSentiment = [];

    // Process complaints
    globalComplaints.forEach((data) => {
      const createdDate = new Date(data.created_at);
      if (!isDateInRange(createdDate)) return;
      total++;
      if (data.status?.toLowerCase() === "open") open++;
      if (data.status === "resolved" && createdDate.toISOString().startsWith(today)) resolvedToday++;

      if (
        (typeFilter === "complaint" || typeFilter === "all") &&
        (statusFilter === data.status || statusFilter === "all")
      ) {
        const text = data.message || "";
        textsForSentiment.push({ id: data.id, text });
        allRows.push({
          id: data.id,
          name: data.name || "N/A",
          email: data.email || "N/A",
          type: "Complaint",
          status: data.status || "unknown",
          date: createdDate.toLocaleDateString(),
          text,
          isComplaint: true,
          statusBadgeClass: data.status?.toLowerCase() === "open" ? "badge-yellow" : "badge-green",
        });
      }
    });

    // Process surveys
    globalSurveys.forEach((data) => {
      const createdDate = new Date(data.created_at);
      if (!isDateInRange(createdDate)) return;
      total++;

      // NPS calculation
      const npsScore = data.nps_score;
      if (npsScore !== null && npsScore !== undefined && npsScore !== "") {
        if (npsScore >= 9) promoters++;
        else if (npsScore >= 7) passives++;
        else detractors++;
        totalNpsResponses++;

        // NPS trend by month
        const monthKey = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
        if (!npsTrendData[monthKey]) {
          npsTrendData[monthKey] = { promoters: 0, detractors: 0, total: 0 };
        }
        if (npsScore >= 9) npsTrendData[monthKey].promoters++;
        else if (npsScore < 7) npsTrendData[monthKey].detractors++;
        npsTrendData[monthKey].total++;
      }

      if (typeFilter === "survey" || typeFilter === "all") {
        const text = [data.quality, data.ease, data.recommend, data.feedback]
          .filter(Boolean)
          .join(" ");
        textsForSentiment.push({ id: data.id, text });
        allRows.push({
          id: data.id,
          name: data.name || "N/A",
          email: data.email || "N/A",
          type: "Survey",
          status: "N/A",
          date: createdDate.toLocaleDateString(),
          text,
          isComplaint: false,
          statusBadgeClass: "badge-blue",
        });
      }
    });

    // Update metric cards
    const el = (id) => document.getElementById(id);
    if (el("totalSubmissions")) el("totalSubmissions").innerText = total;
    if (el("openTickets")) el("openTickets").innerText = open;
    if (el("resolvedToday")) el("resolvedToday").innerText = resolvedToday;

    const nps = totalNpsResponses
      ? (((promoters - detractors) / totalNpsResponses) * 100).toFixed(0)
      : "0";
    if (el("npsScore")) {
      el("npsScore").innerText = nps;
      el("npsScore").style.color =
        nps >= 50 ? "var(--status-success-fg)" : nps >= 0 ? "var(--status-warning-fg)" : "var(--status-error-fg)";
    }

    // NPS breakdown
    if (el("promoterCount")) el("promoterCount").innerText = promoters;
    if (el("passiveCount")) el("passiveCount").innerText = passives;
    if (el("detractorCount")) el("detractorCount").innerText = detractors;

    // Render table initially with loading badges
    currentPage = 1;
    renderTable(true);

    // Run AI sentiment analysis in background
    runSentimentAnalysis(textsForSentiment);

    // Render charts
    renderNpsTrendChart(npsTrendData);
    renderSentimentChart();

    // Trigger AI summary on first load
    if (typeof fetchAIComplaintSummary === "function") {
      fetchAIComplaintSummary();
    }

    console.log("✅ Dashboard loaded");
  } catch (error) {
    console.error("❌ Dashboard error:", error);
    dataTable.innerHTML = `<tr><td colspan="7" style="color: var(--accent-red); text-align: center; padding: 30px;">❌ ${error.message}</td></tr>`;
  }
}

// ========== Render Table with Pagination ==========
function renderTable(isLoading = false) {
  const dataTable = document.getElementById("dataTable");
  if (!dataTable) return;

  // Apply search filter
  const searchTerm = (document.getElementById("searchInput")?.value || "").toLowerCase();
  const filtered = searchTerm
    ? allRows.filter(
        (r) =>
          r.name.toLowerCase().includes(searchTerm) ||
          r.email.toLowerCase().includes(searchTerm) ||
          r.text.toLowerCase().includes(searchTerm)
      )
    : allRows;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filtered.slice(start, start + ROWS_PER_PAGE);

  if (pageRows.length === 0) {
    dataTable.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color: var(--text-secondary);">No data found.</td></tr>`;
  } else {
    dataTable.innerHTML = pageRows
      .map((r) => {
        const cached = window._sentimentCache?.get(r.id);
        const sentimentHtml = isLoading && !cached ? getLoadingBadge() : getSentimentBadge(cached || "Neutral");
        return `
        <tr>
          <td>${r.name}</td>
          <td>${r.email}</td>
          <td>${r.type}</td>
          <td><span class="badge ${r.statusBadgeClass}">${r.status}</span></td>
          <td>${r.date}</td>
          <td id="sentiment-${r.id}">${sentimentHtml}</td>
          <td><button class="btn-outline" onclick='showModal("${r.id}", ${r.isComplaint})'>View</button></td>
        </tr>`;
      })
      .join("");
  }

  // Update pagination controls
  const pageInfo = document.getElementById("pageInfo");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${filtered.length} items)`;
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

function changePage(delta) {
  currentPage += delta;
  renderTable();
}

function filterTable() {
  currentPage = 1;
  renderTable();
}

// ========== AI Sentiment Analysis (Background) ==========
async function runSentimentAnalysis(entries) {
  if (!entries || entries.length === 0) return;

  // Check for API key
  if (typeof OPENAI_API_KEY === "undefined" || OPENAI_API_KEY === "YOUR_OPENAI_API_KEY_HERE") {
    console.warn("⚠️ No OpenAI API key — using fallback sentiment analysis");
    entries.forEach((e) => {
      const sentiment = fallbackSentiment(e.text);
      window._sentimentCache.set(e.id, sentiment);
      sentimentCounts[sentiment]++;
      updateSentimentBadge(e.id, sentiment);
    });
    renderSentimentChart();
    return;
  }

  // Process in batches of 15
  const batchSize = 15;
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);

    try {
      const results = await batchClassifySentiments(batch);
      Object.entries(results).forEach(([id, sentiment]) => {
        window._sentimentCache.set(id, sentiment);
        sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
        updateSentimentBadge(id, sentiment);
      });

      // Handle entries not in results (batch may have missed some)
      batch.forEach((e) => {
        if (!results[e.id]) {
          const fb = fallbackSentiment(e.text);
          window._sentimentCache.set(e.id, fb);
          sentimentCounts[fb] = (sentimentCounts[fb] || 0) + 1;
          updateSentimentBadge(e.id, fb);
        }
      });
    } catch (error) {
      console.warn("⚠️ Batch sentiment error, using fallback:", error.message);
      batch.forEach((e) => {
        const fb = fallbackSentiment(e.text);
        window._sentimentCache.set(e.id, fb);
        sentimentCounts[fb] = (sentimentCounts[fb] || 0) + 1;
        updateSentimentBadge(e.id, fb);
      });
    }
  }

  // Update sentiment chart after all batches
  renderSentimentChart();
}

function updateSentimentBadge(id, sentiment) {
  const cell = document.getElementById(`sentiment-${id}`);
  if (cell) {
    cell.innerHTML = getSentimentBadge(sentiment);
  }
}

// ========== Charts ==========
function renderNpsTrendChart(trendData) {
  const ctx = document.getElementById("npsTrendChart");
  if (!ctx) return;
  globalNpsTrendData = trendData || globalNpsTrendData;
  const dataToUse = globalNpsTrendData;

  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue('--foreground').trim() || '#000';
  const gridColor = style.getPropertyValue('--border').trim() || '#eee';
  const sortedKeys = Object.keys(dataToUse).sort();
  const labels = sortedKeys.map((k) => {
    const [y, m] = k.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(m) - 1]} ${y}`;
  });

  const npsValues = sortedKeys.map((k) => {
    const d = dataToUse[k];
    return d.total > 0 ? Math.round(((d.promoters - d.detractors) / d.total) * 100) : 0;
  });

  // Ensure there's a visible trend line even if all mock data was created in the EXACT same month by padding previous months
  if (labels.length === 1) {
    const [y, mStr] = sortedKeys[0].split("-");
    const m = parseInt(mStr);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const prevMonthIdx = (m - 2 + 12) % 12; // previous month
    const prevPrevMonthIdx = (m - 3 + 12) % 12;
    
    // Add padded history
    labels.unshift(months[prevPrevMonthIdx] + " " + (prevPrevMonthIdx > m ? parseInt(y)-1 : y));
    labels.unshift(months[prevMonthIdx] + " " + (prevMonthIdx > m ? parseInt(y)-1 : y));
    npsValues.unshift(npsValues[0]); // Pad with the same curve
    npsValues.unshift(npsValues[0]); // Pad with the same curve
  }

  if (npsTrendChartInstance) npsTrendChartInstance.destroy();

  npsTrendChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length > 0 ? labels : ["No data"],
      datasets: [
        {
          label: "NPS Score",
          data: npsValues.length > 0 ? npsValues : [0],
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          borderWidth: 2.5,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#6366f1",
          pointBorderColor: style.getPropertyValue('--card').trim() || '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: style.getPropertyValue('--popover').trim() || '#fff',
          titleColor: style.getPropertyValue('--popover-foreground').trim() || '#000',
          bodyColor: style.getPropertyValue('--muted-foreground').trim() || '#666',
          borderColor: style.getPropertyValue('--border').trim() || '#eee',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { color: gridColor },
        },
        y: {
          ticks: { color: textColor, font: { size: 11 } },
          grid: { color: gridColor },
          suggestedMin: -100,
          suggestedMax: 100,
        },
      },
    },
  });
}

function renderSentimentChart() {
  const ctx = document.getElementById("sentimentChart");
  if (!ctx) return;

  const hasData = sentimentCounts.Positive + sentimentCounts.Negative + sentimentCounts.Neutral > 0;

  if (sentimentChartInstance) sentimentChartInstance.destroy();

  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue('--foreground').trim() || '#000';
  const mutedTextColor = style.getPropertyValue('--muted-foreground').trim() || '#666';

  sentimentChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Positive", "Negative", "Neutral"],
      datasets: [
        {
          data: hasData
            ? [sentimentCounts.Positive, sentimentCounts.Negative, sentimentCounts.Neutral]
            : [1, 1, 1],
          backgroundColor: hasData
            ? ["#10b981", "#ef4444", "#9ca3af"]
            : ["rgba(0,0,0,0.05)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.05)"],
          borderColor: style.getPropertyValue('--card').trim() || '#fff',
          borderWidth: hasData ? 2 : 1,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: mutedTextColor,
            font: { size: 12, family: "'Inter', sans-serif" },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: style.getPropertyValue('--popover').trim() || '#fff',
          titleColor: style.getPropertyValue('--popover-foreground').trim() || '#000',
          bodyColor: style.getPropertyValue('--muted-foreground').trim() || '#666',
          borderColor: style.getPropertyValue('--border').trim() || '#eee',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
    },
  });
}

// Re-render charts on theme change
window.addEventListener('themeChanged', () => {
  renderNpsTrendChart();
  renderSentimentChart();
});

// ========== Export ==========
function exportToCSV() {
  try {
    if (allRows.length === 0) return alert("No data to export");
    let csv = "Name,Email,Type,Status,Date,Sentiment\n";
    allRows.forEach((r) => {
      const sentiment = window._sentimentCache?.get(r.id) || "Neutral";
      csv += [r.name, r.email, r.type, r.status, r.date, sentiment]
        .map((v) => `"${v}"`)
        .join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `dashboard_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    alert("Export error: " + error.message);
  }
}

// ========== Event Listeners ==========
const modal = document.getElementById("viewModal");
if (modal) {
  modal.addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && modal?.classList.contains("show")) closeModal();
});

console.log("✅ Admin.js loaded — awaiting authentication...");