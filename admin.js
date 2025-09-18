// ✅ FIXED VERSION - Corrected null reference errors

// Firebase config (Keep for Authentication only)
const firebaseConfig = {
  apiKey: "AIzaSyC1XazQLwfBHUW527Yqz5FyRzNFDjv5mII",
  authDomain: "smart-customer-support-portal.firebaseapp.com",
  projectId: "smart-customer-support-portal",
};
firebase.initializeApp(firebaseConfig);

// Supabase config (New database layer)
const SUPABASE_URL = 'https://wqgaboyirihxccrzsjnn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxZ2Fib3lpcmloeGNjcnpzam5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNzA1NzAsImV4cCI6MjA3Mjg0NjU3MH0.9JOkoTP6cVZYbVD0I9BzH5Jm06t1us4xvjMcpsFNYrY';

console.log("🔧 Initializing Supabase client...");
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("✅ Supabase client initialized:", supabase);

// Test Supabase connection
async function testSupabaseConnection() {
  try {
    console.log("🔍 Testing Supabase connection...");
    const { data, error } = await supabase
      .from("complaints")
      .select("count", { count: "exact", head: true });
    
    if (error) {
      console.error("❌ Supabase connection failed:", error);
      return false;
    }
    
    console.log("✅ Supabase connection successful. Complaint count:", data);
    return true;
  } catch (err) {
    console.error("❌ Supabase connection error:", err);
    return false;
  }
}

// Keep Firebase Authentication exactly as is
firebase.auth().onAuthStateChanged((user) => {
  console.log("🔐 Auth state changed:", user ? "User logged in" : "No user");
  if (!user) {
    console.log("🔄 Redirecting to login...");
    window.location.href = "index.html";
  } else {
    console.log("✅ User authenticated, waiting for DOM...");
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeDashboard);
    } else {
      initializeDashboard();
    }
  }
});

async function initializeDashboard() {
  console.log("🚀 Initializing dashboard...");
  
  // Test connection and load dashboard
  const connected = await testSupabaseConnection();
  if (connected) {
    loadDashboard();
  } else {
    const tableElement = document.getElementById("dataTable");
    if (tableElement) {
      tableElement.innerHTML = `
        <tr><td colspan="7" style="color: red;">❌ Database connection failed. Check console for details.</td></tr>
      `;
    }
  }
}

function logout() {
  firebase
    .auth()
    .signOut()
    .then(() => (location.href = "index.html"));
}

function closeModal() {
  const modal = document.getElementById("viewModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.classList.remove("modal-open");
  }
}

async function showModal(docId, isComplaint) {
  console.log(`🔍 Opening modal for ${isComplaint ? 'complaint' : 'survey'} ID:`, docId);
  
  const modalDetails = document.getElementById("modalDetails");
  const statusUpdate = document.getElementById("statusUpdate");

  if (!modalDetails || !statusUpdate) {
    console.error("❌ Modal elements not found");
    return;
  }

  if (!isComplaint) {
    // Survey handling - fetch from Supabase
    try {
      console.log("📊 Fetching survey data...");
      const { data: surveyData, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", docId)
        .single();

      if (error) {
        console.error("❌ Survey fetch error:", error);
        throw error;
      }

      console.log("✅ Survey data loaded:", surveyData);

      const submissionDate = new Date(surveyData.created_at).toLocaleString();

      modalDetails.innerHTML = `
        <div class="survey-details">
          <div class="section-title">Customer Information</div>
          <div class="detail-row"><label>Name:</label><span>${surveyData.name || "N/A"}</span></div>
          <div class="detail-row"><label>Email:</label><span>${surveyData.email || "N/A"}</span></div>
          <div class="detail-row"><label>Submission Date:</label><span>${submissionDate || "N/A"}</span></div>
          <div class="section-title">Survey Responses</div>
          <div class="detail-row"><label>NPS Score:</label><span>${surveyData.nps_score || "N/A"}/10</span></div>
          <div class="detail-row"><label>Ease of use:</label><span>${surveyData.ease || "N/A"}</span></div>
          <div class="detail-row"><label>Quality:</label><span>${surveyData.quality || "N/A"}</span></div>
          <div class="detail-row"><label>Would recommend:</label><span>${surveyData.recommend || "N/A"}</span></div>
          <div class="detail-row"><label>Additional Feedback:</label><p class="feedback-text">${surveyData.feedback || "No feedback provided"}</p></div>
        </div>
      `;
      statusUpdate.innerHTML = "";
    } catch (error) {
      console.error("❌ Error fetching survey:", error);
      modalDetails.innerHTML = `<p style="color: red;">Error loading survey data: ${error.message}</p>`;
    }
  } else {
    // Complaint handling - fetch from Supabase
    try {
      console.log("📞 Fetching complaint data...");
      const { data: complaintData, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("id", docId)
        .single();

      if (error) {
        console.error("❌ Complaint fetch error:", error);
        throw error;
      }

      console.log("✅ Complaint data loaded:", complaintData);

      const createdDate = new Date(complaintData.created_at).toLocaleString();
      const isResolved = complaintData.status === "resolved";

      const details = `
        <div class="survey-details">
            <div class="section-title">Complaint Details</div>
            <div class="detail-row"><label>Name:</label><span>${complaintData.name || "N/A"}</span></div>
            <div class="detail-row"><label>Email:</label><span>${complaintData.email || "N/A"}</span></div>
            <div class="detail-row"><label>Ticket ID:</label><span>${complaintData.ticket_id || "N/A"}</span></div>
            <div class="detail-row"><label>Type:</label><span>${complaintData.type || "N/A"}</span></div>
            <div class="detail-row"><label>Date:</label><span>${createdDate || "N/A"}</span></div>
            <div class="detail-row"><label>Status:</label><span>${complaintData.status || "N/A"}</span></div>
            <div class="detail-row"><label>Message:</label><p class="feedback-text">${complaintData.message || "No message provided"}</p></div>
        </div>
      `;

      modalDetails.innerHTML = details;

      statusUpdate.innerHTML = `
        <div class="analysis-section">
          <h4>Root Cause Analysis</h4>
          <textarea id="rcaInput" placeholder="Enter root cause analysis..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.rca || ""}</textarea>
          <h4>Corrective and Preventive Action</h4>
          <textarea id="capaInput" placeholder="Enter corrective and preventive actions..." rows="3" ${isResolved ? "disabled" : ""} class="${isResolved ? "textarea-disabled" : ""}">${complaintData.capa || ""}</textarea>
          <div id="aiSuggestion-${docId}" class="ai-rca-loader" style="margin-top:10px;">${isResolved ? "" : '<span style="font-size:13px;color:#666;"><i class="fas fa-robot"></i> Getting AI suggestions...</span>'}</div>
          ${isResolved ? "" : `<div class="status-controls"><button onclick="updateComplaint('${docId}')" class="update-btn">Update & Resolve</button></div>`}
        </div>
      `;

      // Call AI suggestions if not resolved
      if (!isResolved && complaintData.message && typeof getAISuggestionsForComplaint === 'function') {
        console.log("🤖 Calling AI suggestions for:", complaintData.message);
        getAISuggestionsForComplaint(complaintData.message, docId);
      }
    } catch (error) {
      console.error("❌ Error fetching complaint:", error);
      modalDetails.innerHTML = `<p style="color: red;">Error loading complaint data: ${error.message}</p>`;
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
  
  if (!rcaInput || !capaInput) {
    alert("Form elements not found");
    return;
  }
  
  const rca = rcaInput.value.trim();
  const capa = capaInput.value.trim();

  if (!rca || !capa) {
    alert("Please fill both RCA and CAPA sections before updating");
    return;
  }

  if (confirm("This will update the complaint and mark it as resolved. Continue?")) {
    try {
      console.log("💾 Updating complaint:", docId);
      const { error } = await supabase
        .from("complaints")
        .update({
          rca,
          capa,
          status: "resolved",
          resolved_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
        .eq("id", docId);

      if (error) {
        console.error("❌ Update error:", error);
        throw error;
      }

      console.log("✅ Complaint updated successfully");
      alert("Complaint resolved successfully!");
      closeModal();
      loadDashboard();
    } catch (error) {
      console.error("❌ Error updating complaint:", error);
      alert("Failed to update complaint: " + error.message);
    }
  }
}

function handleDateFilter() {
  const dateFilter = document.getElementById("dateFilter");
  const customDateInputs = document.getElementById("customDateInputs");
  
  if (dateFilter && customDateInputs) {
    customDateInputs.style.display = dateFilter.value === "custom" ? "inline-block" : "none";
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
    case "week":
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      return dateToCheck >= startOfWeek;
    case "month":
      return dateToCheck >= new Date(today.getFullYear(), today.getMonth(), 1);
    case "custom":
      const startDateElement = document.getElementById("startDate");
      const endDateElement = document.getElementById("endDate");
      if (!startDateElement || !endDateElement) return true;
      
      const startDate = new Date(startDateElement.value);
      const endDate = new Date(endDateElement.value);
      endDate.setHours(23, 59, 59);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    default:
      return true;
  }
}

function analyzeSentiment(text) {
  const positiveWords = ["good", "great", "excellent", "amazing", "awesome", "love"];
  const negativeWords = ["bad", "poor", "terrible", "awful", "hate", "issue", "problem"];

  text = text.toLowerCase();
  let positiveScore = 0, negativeScore = 0;

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
  if (diff > 0) return `<span class="badge badge-positive">Positive (${pos})</span>`;
  if (diff < 0) return `<span class="badge badge-negative">Negative (${Math.abs(neg)})</span>`;
  return `<span class="badge badge-neutral">Neutral</span>`;
}

function analyzeSurveySentiment(data) {
  const combined = [data.quality, data.ease, data.recommend, data.nps_score, data.feedback]
    .map((v) => (v || "").toString().toLowerCase())
    .join(" ");
  return analyzeSentiment(combined);
}

function analyzeComplaintSentiment(data) {
  return analyzeSentiment((data.message || "").toLowerCase());
}

async function loadDashboard() {
  console.log("🔄 Loading dashboard...");
  
  let total = 0, open = 0, resolvedToday = 0;
  let promoters = 0, passives = 0, detractors = 0, totalResponses = 0;
  const today = new Date().toISOString().split("T")[0];
  
  // Safe filter access with null checks
  const typeFilterElement = document.getElementById("filterType");
  const statusFilterElement = document.getElementById("filterStatus");
  const typeFilter = typeFilterElement ? typeFilterElement.value : "all";
  const statusFilter = statusFilterElement ? statusFilterElement.value : "all";
  
  console.log("📊 Filters:", { typeFilter, statusFilter });
  
  const dataTable = document.getElementById("dataTable");
  if (!dataTable) {
    console.error("❌ Data table element not found");
    return;
  }
  
  dataTable.innerHTML = '<tr><td colspan="7">🔄 Loading data...</td></tr>';

  try {
    // Fetch complaints from Supabase
    console.log("📞 Fetching complaints...");
    const { data: complaints, error: complaintsError } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false });

    if (complaintsError) {
      console.error("❌ Complaints fetch error:", complaintsError);
      throw complaintsError;
    }
    
    console.log("✅ Complaints loaded:", complaints?.length || 0, "records");

    // Fetch surveys from Supabase
    console.log("📊 Fetching surveys...");
    const { data: surveys, error: surveysError } = await supabase
      .from("surveys")
      .select("*")
      .order("created_at", { ascending: false });

    if (surveysError) {
      console.error("❌ Surveys fetch error:", surveysError);
      throw surveysError;
    }
    
    console.log("✅ Surveys loaded:", surveys?.length || 0, "records");

    // Clear the table
    dataTable.innerHTML = "";

    // Process complaints
    if (complaints && complaints.length > 0) {
      console.log("🔄 Processing complaints...");
      complaints.forEach((data, index) => {
        console.log(`Processing complaint ${index + 1}:`, data);
        
        const createdDate = new Date(data.created_at);
        if (!createdDate || !isDateInRange(createdDate)) {
          console.log("⏭️ Skipping complaint due to date filter");
          return;
        }

        total++;
        if (data.status?.toLowerCase() === "open") open++;
        if (data.status === "resolved" && createdDate.toISOString().startsWith(today)) {
          resolvedToday++;
        }

        if ((typeFilter === "complaint" || typeFilter === "all") && 
            (statusFilter === data.status || statusFilter === "all")) {
          
          const tableRow = `
            <tr>
              <td>${data.name || "N/A"}</td>
              <td>${data.email || "N/A"}</td>
              <td>Complaint</td>
              <td><span class="badge ${data.status?.toLowerCase() === "open" ? "badge-yellow" : "badge-green"}">${data.status || "unknown"}</span></td>
              <td>${createdDate.toLocaleDateString()}</td>
              <td>${analyzeComplaintSentiment(data)}</td>
              <td><button class="btn" onclick='showModal("${data.id}", true)'>View</button></td>
            </tr>`;
          
          dataTable.innerHTML += tableRow;
        }
      });
    } else {
      console.log("ℹ️ No complaints found");
    }

    // Process surveys
    if (surveys && surveys.length > 0) {
      console.log("🔄 Processing surveys...");
      surveys.forEach((data, index) => {
        console.log(`Processing survey ${index + 1}:`, data);
        
        const createdDate = new Date(data.created_at);
        if (!createdDate || !isDateInRange(createdDate)) {
          console.log("⏭️ Skipping survey due to date filter");
          return;
        }

        total++;
        const sentiment = analyzeSurveySentiment(data);
        
        // Calculate NPS based on nps_score field
        const npsScore = data.nps_score;
        if (npsScore !== null && npsScore !== undefined) {
          if (npsScore >= 9) promoters++;
          else if (npsScore >= 7) passives++;
          else detractors++;
          totalResponses++;
        }

        if (typeFilter === "survey" || typeFilter === "all") {
          const tableRow = `
            <tr>
              <td>${data.name || "N/A"}</td>
              <td>${data.email || "N/A"}</td>
              <td>Survey</td>
              <td><span class="badge badge-blue">N/A</span></td>
              <td>${createdDate.toLocaleDateString()}</td>
              <td>${sentiment}</td>
              <td><button class="btn" onclick='showModal("${data.id}", false)'>View</button></td>
            </tr>`;
          
          dataTable.innerHTML += tableRow;
        }
      });
    } else {
      console.log("ℹ️ No surveys found");
    }

    // Update metrics with null checks
    const totalElement = document.getElementById("totalSubmissions");
    const openElement = document.getElementById("openTickets");
    const resolvedElement = document.getElementById("resolvedToday");
    const npsElement = document.getElementById("npsScore");
    
    if (totalElement) totalElement.innerText = total;
    if (openElement) openElement.innerText = open;
    if (resolvedElement) resolvedElement.innerText = resolvedToday;

    // Calculate NPS
    const nps = totalResponses ? (((promoters - detractors) / totalResponses) * 100).toFixed(2) : "0";
    if (npsElement) {
      npsElement.innerText = nps;
      
      // Color code NPS
      if (nps >= 80) npsElement.style.color = "#4caf50";
      else if (nps >= 50) npsElement.style.color = "#ffc107";
      else npsElement.style.color = "#dc3545";
    }

    // If no data found, show a message
    if (total === 0) {
      dataTable.innerHTML = `
        <tr><td colspan="7" style="text-align: center; padding: 20px;">
          ℹ️ No data found. Try <a href="survey.html" target="_blank">submitting some test data</a> first.
        </td></tr>
      `;
    }

    console.log("✅ Dashboard loaded successfully");

  } catch (error) {
    console.error("❌ Error loading dashboard:", error);
    dataTable.innerHTML = `
      <tr><td colspan="7" style="color: red; text-align: center; padding: 20px;">
        ❌ Error loading data: ${error.message}<br>
        <small>Check browser console for details</small>
      </td></tr>
    `;
  }
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
          cells[0].textContent, cells[1].textContent, cells[2].textContent,
          cells[3].textContent.replace(/[\n\r]+/g, " "), cells[4].textContent,
          cells[5].textContent.replace(/[()]/g, "")
        ].map((cell) => `"${cell.trim()}"`).join(",");
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

// Event listeners with null checks
const modal = document.getElementById("viewModal");
if (modal) {
  modal.addEventListener("click", function (e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && modal && modal.classList.contains("show")) {
    closeModal();
  }
});

console.log("🚀 Admin.js loaded, waiting for authentication...");