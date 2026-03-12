/**
 * AI Analysis Module
 * Generates comprehensive dashboard summaries using OpenAI directly.
 * Depends on: ai-config.js (callOpenAI), admin.js (supabase client)
 */

async function fetchAIComplaintSummary() {
  const aiSummaryElement = document.querySelector(".ai-summary-content");
  if (!aiSummaryElement) return;

  aiSummaryElement.innerHTML =
    '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Analyzing real customer data with AI...</div>';

  try {
    // Fetch from global cache to save API calls, or load from DB if not yet loaded
    let complaints = typeof globalComplaints !== "undefined" && globalComplaints.length ? globalComplaints : null;
    let surveys = typeof globalSurveys !== "undefined" && globalSurveys.length ? globalSurveys : null;

    if (!complaints || !surveys) {
      const dbData = await DB.getRows();
      complaints = dbData.complaints || [];
      surveys = dbData.surveys || [];
    }

    if (!complaints && !surveys) {
      aiSummaryElement.innerHTML = `<div class='error-message'><i class="fas fa-exclamation-circle"></i> Failed to load data from Google Sheets.</div>`;
      return;
    }

    // Build structured messages for AI
    const messages = [];
    let openComplaints = 0;
    let resolvedComplaints = 0;

    if (complaints && complaints.length > 0) {
      complaints.forEach((c) => {
        if (c.message && c.message.trim()) {
          const status = c.status?.toLowerCase() === "open" ? "OPEN" : "RESOLVED";
          if (c.status?.toLowerCase() === "open") openComplaints++;
          else resolvedComplaints++;
          messages.push(`[${status} COMPLAINT - ${c.type || "General"}]: ${c.message.trim()}`);
        }
      });
    }

    if (surveys && surveys.length > 0) {
      surveys.forEach((s) => {
        const parts = [];
        if (s.nps_score !== null && s.nps_score !== undefined) {
          const label = s.nps_score >= 9 ? "PROMOTER" : s.nps_score >= 7 ? "PASSIVE" : "DETRACTOR";
          parts.push(`NPS: ${s.nps_score}/10 (${label})`);
        }
        if (s.quality) parts.push(`Quality: ${s.quality}`);
        if (s.ease) parts.push(`Ease: ${s.ease}`);
        if (s.recommend) parts.push(`Recommend: ${s.recommend}`);
        if (s.feedback && s.feedback.trim()) parts.push(`Feedback: "${s.feedback.trim()}"`);
        if (parts.length > 0) messages.push(`[SURVEY RESPONSE]: ${parts.join(" | ")}`);
      });
    }

    if (messages.length === 0) {
      aiSummaryElement.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox fa-2x"></i>
          <h3>No Data Available</h3>
          <p>No complaints or survey responses found to analyze.</p>
          <p><a href="survey.html" target="_blank">Submit test data</a> to see AI insights here.</p>
        </div>`;
      return;
    }

    const systemPrompt = `You are a senior business intelligence analyst. Provide a comprehensive, data-driven analysis of customer feedback. Be specific — reference actual complaint types and survey scores. Structure your response exactly as requested.`;

    const userPrompt = `
Analyze the following real customer data (${complaints?.length || 0} complaints, ${surveys?.length || 0} surveys):

${messages.join("\n")}

Provide analysis in this EXACT format:

**EXECUTIVE SUMMARY:**
- Brief overview (2-3 sentences max)

**KEY ISSUES IDENTIFIED:**
- List top 3-5 recurring problems with severity

**CUSTOMER SATISFACTION INSIGHTS:**
- NPS score analysis, positive themes, areas of strength

**ACTIONABLE RECOMMENDATIONS:**
- 3-5 specific, implementable steps

**TRENDS & PATTERNS:**
- Recurring themes and patterns in the data
`;

    const summary = await callOpenAI(systemPrompt, userPrompt, { temperature: 0.3, max_tokens: 1500 });

    // Parse sections
    const executiveSummary = extractSection(summary, "EXECUTIVE SUMMARY");
    const keyIssues = extractSection(summary, "KEY ISSUES IDENTIFIED");
    const satisfactionInsights = extractSection(summary, "CUSTOMER SATISFACTION INSIGHTS");
    const recommendations = extractSection(summary, "ACTIONABLE RECOMMENDATIONS");
    const trends = extractSection(summary, "TRENDS & PATTERNS");

    aiSummaryElement.innerHTML = `
      <div class="ai-analysis-container">
        <div class="data-summary">
          <div class="metric-card">
            <div class="metric-number">${complaints?.length || 0}</div>
            <div class="metric-label">Total Complaints</div>
          </div>
          <div class="metric-card">
            <div class="metric-number">${openComplaints}</div>
            <div class="metric-label">Open Issues</div>
          </div>
          <div class="metric-card">
            <div class="metric-number">${surveys?.length || 0}</div>
            <div class="metric-label">Survey Responses</div>
          </div>
          <div class="metric-card">
            <div class="metric-number">${resolvedComplaints}</div>
            <div class="metric-label">Resolved</div>
          </div>
        </div>

        ${executiveSummary ? `
          <div class="analysis-section">
            <h4><i class="fas fa-chart-line"></i> Executive Summary</h4>
            <div class="section-content">${formatContent(executiveSummary)}</div>
          </div>
        ` : ""}

        ${keyIssues ? `
          <div class="analysis-section priority-issues">
            <h4><i class="fas fa-exclamation-triangle"></i> Key Issues Identified</h4>
            <div class="section-content">${formatContent(keyIssues)}</div>
          </div>
        ` : ""}

        ${satisfactionInsights ? `
          <div class="analysis-section">
            <h4><i class="fas fa-heart"></i> Customer Satisfaction Insights</h4>
            <div class="section-content">${formatContent(satisfactionInsights)}</div>
          </div>
        ` : ""}

        ${recommendations ? `
          <div class="analysis-section recommendations">
            <h4><i class="fas fa-lightbulb"></i> Actionable Recommendations</h4>
            <div class="section-content">${formatContent(recommendations)}</div>
          </div>
        ` : ""}

        ${trends ? `
          <div class="analysis-section">
            <h4><i class="fas fa-chart-bar"></i> Trends & Patterns</h4>
            <div class="section-content">${formatContent(trends)}</div>
          </div>
        ` : ""}

        <div class="analysis-footer">
          <small><i class="fas fa-robot"></i> AI analysis based on ${messages.length} real interactions • ${new Date().toLocaleString()}</small>
        </div>
      </div>
    `;

    const metaElement = document.getElementById("aiSummaryMeta");
    if (metaElement) {
      metaElement.innerText = `Last updated: ${new Date().toLocaleString()} | Analyzed: ${complaints?.length || 0} complaints, ${surveys?.length || 0} surveys`;
    }

  } catch (error) {
    console.error("❌ Error loading AI Summary:", error);
    aiSummaryElement.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <div class="error-details">
          <strong>Analysis Unavailable</strong>
          <p>${error.message}</p>
          <button onclick="fetchAIComplaintSummary()" class="retry-btn">
            <i class="fas fa-redo"></i> Retry Analysis
          </button>
        </div>
      </div>`;
  }
}

// Helper: extract a section from the AI response
function extractSection(text, sectionName) {
  const regex = new RegExp(
    `\\*\\*${sectionName}:\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z][A-Z\\s&]+:\\*\\*|$)`,
    "i"
  );
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Helper: format content lines into styled HTML
function formatContent(content) {
  if (!content) return "";
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.startsWith("-") || line.startsWith("•")) {
        return `<div class="bullet-point">${line.replace(/^[-•]\s*/, "")}</div>`;
      }
      return `<p class="content-paragraph">${line}</p>`;
    })
    .join("");
}

// Auto-refresh every 5 minutes
function startAutoRefresh() {
  setInterval(() => {
    console.log("🔄 Auto-refreshing AI analysis...");
    fetchAIComplaintSummary();
  }, 5 * 60 * 1000);
}

if (typeof window !== "undefined") {
  window.addEventListener("load", startAutoRefresh);
}
