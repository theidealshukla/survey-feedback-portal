async function generateAISummary(messages) {
  try {
    const response = await fetch("https://ai-backend-df9i.onrender.com/api/ai-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const result = await response.json();
    return result?.choices?.[0]?.message?.content || "AI summary not available.";
  } catch (error) {
    console.error("❌ Error generating AI summary:", error);
    return "Failed to generate AI summary.";
  }
}

async function fetchAIComplaintSummary() {
  const aiSummaryElement = document.querySelector(".ai-summary-content");
  if (!aiSummaryElement) return;

  aiSummaryElement.innerHTML =
    '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Analyzing real customer data...</div>';

  try {
    // Fetch ALL complaints from Supabase (not just open ones)
    console.log("📞 Fetching all complaints for AI analysis...");
    const { data: complaints, error: complaintsError } = await supabase
      .from("complaints")
      .select("id, message, type, status, created_at, name")
      .order("created_at", { ascending: false });
      
    // Fetch ALL surveys from Supabase
    console.log("📊 Fetching all surveys for AI analysis...");
    const { data: surveys, error: surveysError } = await supabase
      .from("surveys")
      .select("id, feedback, nps_score, quality, ease, recommend, created_at, name")
      .order("created_at", { ascending: false });

    if (complaintsError || surveysError) {
      console.error("❌ Data fetch error:", { complaintsError, surveysError });
      aiSummaryElement.innerHTML = `<div class='error-message'>Failed to load data from Supabase. ${complaintsError?.message || surveysError?.message}</div>`;
      return;
    }

    console.log(`✅ Data loaded: ${complaints?.length || 0} complaints, ${surveys?.length || 0} surveys`);

    // Combine real data into structured messages for AI analysis
    const messages = [];
    let openComplaints = 0;
    let resolvedComplaints = 0;

    // Process complaints - include all relevant information
    if (complaints && complaints.length > 0) {
      complaints.forEach((complaint) => {
        if (complaint.message && complaint.message.trim()) {
          const status = complaint.status?.toLowerCase() === 'open' ? 'OPEN' : 'RESOLVED';
          const complaintType = complaint.type || 'General';
          
          if (complaint.status?.toLowerCase() === 'open') {
            openComplaints++;
          } else {
            resolvedComplaints++;
          }
          
          messages.push(
            `[${status} COMPLAINT - ${complaintType}]: ${complaint.message.trim()}`
          );
        }
      });
    }

    // Process surveys - combine multiple fields for richer analysis
    if (surveys && surveys.length > 0) {
      surveys.forEach((survey) => {
        const surveyParts = [];
        
        // Add NPS context
        if (survey.nps_score !== null && survey.nps_score !== undefined) {
          const npsLabel = survey.nps_score >= 9 ? 'PROMOTER' : 
                          survey.nps_score >= 7 ? 'PASSIVE' : 'DETRACTOR';
          surveyParts.push(`NPS: ${survey.nps_score}/10 (${npsLabel})`);
        }
        
        // Add ratings context
        if (survey.quality) surveyParts.push(`Quality: ${survey.quality}`);
        if (survey.ease) surveyParts.push(`Ease: ${survey.ease}`);
        if (survey.recommend) surveyParts.push(`Recommend: ${survey.recommend}`);
        
        // Add feedback text
        if (survey.feedback && survey.feedback.trim()) {
          surveyParts.push(`Feedback: "${survey.feedback.trim()}"`);
        }
        
        if (surveyParts.length > 0) {
          messages.push(`[SURVEY RESPONSE]: ${surveyParts.join(' | ')}`);
        }
      });
    }

    console.log(`📝 Prepared ${messages.length} messages for AI analysis`);

    if (messages.length === 0) {
      aiSummaryElement.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox fa-2x"></i>
          <h3>No Data Available</h3>
          <p>No complaints or survey responses found to analyze.</p>
          <p><a href="survey.html" target="_blank">Submit some test data</a> to see AI insights here.</p>
        </div>`;
      return;
    }

    // Create a comprehensive prompt for better AI analysis
    const analysisPrompt = `
Analyze the following real customer data from our support system and provide actionable business insights:

DATA TO ANALYZE:
${messages.join('\n')}

ANALYSIS REQUEST:
Please provide a comprehensive analysis in this exact format:

**EXECUTIVE SUMMARY:**
- Brief overview of customer sentiment and key findings
- Overall satisfaction trends

**KEY ISSUES IDENTIFIED:**
- List the most common problems and complaints
- Categorize issues by frequency and severity
- Highlight urgent matters requiring immediate attention

**CUSTOMER SATISFACTION INSIGHTS:**
- Analysis of NPS scores and ratings
- Positive feedback themes
- Areas where customers are most satisfied

**ACTIONABLE RECOMMENDATIONS:**
- Specific steps to address identified issues
- Process improvements to prevent recurring problems
- Strategies to improve customer satisfaction

**TRENDS & PATTERNS:**
- Recurring themes in customer feedback
- Seasonal or temporal patterns if evident
- Customer behavior insights

Keep insights specific, actionable, and data-driven. Focus on business impact and practical solutions.
`;

    console.log("🤖 Sending data to AI for analysis...");
    const summary = await generateAISummary([analysisPrompt]);

    // Parse and structure the AI response for better display
    const executiveSummary = extractSection(summary, 'EXECUTIVE SUMMARY');
    const keyIssues = extractSection(summary, 'KEY ISSUES IDENTIFIED');
    const satisfactionInsights = extractSection(summary, 'CUSTOMER SATISFACTION INSIGHTS');
    const recommendations = extractSection(summary, 'ACTIONABLE RECOMMENDATIONS');
    const trends = extractSection(summary, 'TRENDS & PATTERNS');

    // Create rich HTML display with real data context
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
        ` : ''}

        ${keyIssues ? `
          <div class="analysis-section priority-issues">
            <h4><i class="fas fa-exclamation-triangle"></i> Key Issues Identified</h4>
            <div class="section-content">${formatContent(keyIssues)}</div>
          </div>
        ` : ''}

        ${satisfactionInsights ? `
          <div class="analysis-section">
            <h4><i class="fas fa-heart"></i> Customer Satisfaction Insights</h4>
            <div class="section-content">${formatContent(satisfactionInsights)}</div>
          </div>
        ` : ''}

        ${recommendations ? `
          <div class="analysis-section recommendations">
            <h4><i class="fas fa-lightbulb"></i> Actionable Recommendations</h4>
            <div class="section-content">${formatContent(recommendations)}</div>
          </div>
        ` : ''}

        ${trends ? `
          <div class="analysis-section">
            <h4><i class="fas fa-trending-up"></i> Trends & Patterns</h4>
            <div class="section-content">${formatContent(trends)}</div>
          </div>
        ` : ''}

        <div class="analysis-footer">
          <small><i class="fas fa-robot"></i> Analysis based on ${messages.length} real customer interactions</small>
        </div>
      </div>
    `;

    // Update metadata
    const metaElement = document.getElementById("aiSummaryMeta");
    if (metaElement) {
      metaElement.innerText = 
        `Last updated: ${new Date().toLocaleString()} | Analyzed: ${complaints?.length || 0} complaints, ${surveys?.length || 0} surveys`;
    }

    console.log("✅ AI analysis complete and displayed");

  } catch (error) {
    console.error("❌ Error loading AI Summary:", error);
    aiSummaryElement.innerHTML = 
      `<div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Analysis Unavailable</h3>
        <p>Failed to generate AI summary: ${error.message}</p>
        <button onclick="fetchAIComplaintSummary()" class="retry-btn">
          <i class="fas fa-redo"></i> Retry Analysis
        </button>
      </div>`;
  }
}

// Helper function to extract sections from AI response
function extractSection(text, sectionName) {
  const regex = new RegExp(`\\*\\*${sectionName}:\\*\\*([\\s\\S]*?)(?=\\*\\*[A-Z\\s]+:\\*\\*|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

// Helper function to format content with better HTML
function formatContent(content) {
  if (!content) return '';
  
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      if (line.startsWith('-') || line.startsWith('•')) {
        return `<div class="bullet-point">${line.replace(/^[-•]\s*/, '')}</div>`;
      } else {
        return `<p class="content-paragraph">${line}</p>`;
      }
    })
    .join('');
}

// Auto-refresh function for real-time insights
function startAutoRefresh() {
  // Refresh AI summary every 5 minutes
  setInterval(() => {
    console.log("🔄 Auto-refreshing AI analysis...");
    fetchAIComplaintSummary();
  }, 5 * 60 * 1000);
}

// Initialize auto-refresh when the page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', startAutoRefresh);
}
