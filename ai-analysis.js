const OPENROUTER_API_KEY =
  "Bearer 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";

function formatAISummary(text) {
  // Convert numbered headings to <h4>, bullets to <ul><li>, paragraphs to <p>
  let html = text
    .replace(/^\s*Based on.*$/m, "<p>$&</p>") // intro line
    .replace(/^\d+\.\s.*$/gm, (match) => `<h4>${match}</h4>`) // numbered headings
    .replace(/^- (.*)$/gm, "<li>$1</li>"); // bullet points

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>");
  return html;
}

async function fetchAIComplaintSummary() {
  const aiSummaryElement = document.querySelector(".ai-summary-content");
  if (!aiSummaryElement) return;

  // Show loading state
  aiSummaryElement.innerHTML =
    '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Analyzing complaints and surveys...</div>';

  try {
    const [complaintsSnap, surveysSnap] = await Promise.all([
      db.collection("complaints").get(),
      db.collection("surveys").get(),
    ]);

    const messages = [];
    complaintsSnap.forEach((doc) => {
      const data = doc.data();
      if (data.message) messages.push(`Complaint: ${data.message}`);
    });
    surveysSnap.forEach((doc) => {
      const data = doc.data();
      if (data.feedback) messages.push(`Survey: ${data.feedback}`);
    });

    if (messages.length === 0) {
      aiSummaryElement.innerHTML =
        "No complaints or survey feedback to analyze.";
      return;
    }

    const prompt = `Analyze the following ${messages.length} customer feedback entries and summarize in this format:

**KEY INSIGHTS:**
- 1–2 sentence summary

**TOP ISSUES:**
1. **Issue Name** (X mentions) – short explanation
2. ...
3. ...

**SENTIMENT:** Positive / Negative / Mixed

**RECOMMENDATIONS:**
• Recommendation 1
• Recommendation 2

Be concise, factual, and use only the format above.



Data: ${messages.join(" | ")}`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: OPENROUTER_API_KEY,
        },
        body: JSON.stringify({
          model: "anthropic/claude-3-haiku",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
        }),
      }
    );

    const result = await response.json();
    const summaryText =
      result?.choices?.[0]?.message?.content || "No summary generated.";

    // Parse and format the summary with improved structure
    let formattedSummary = summaryText;

    // Extract sections
    const keyInsights =
      summaryText
        .match(/\*\*KEY INSIGHTS:\*\*([\s\S]*?)(?=\*\*TOP ISSUES:\*\*)/)?.[1]
        ?.trim() || "";
    const topIssues =
      summaryText
        .match(/\*\*TOP ISSUES:\*\*([\s\S]*?)(?=\*\*SENTIMENT:\*\*)/)?.[1]
        ?.trim() || "";
    const sentiment =
      summaryText
        .match(/\*\*SENTIMENT:\*\*([\s\S]*?)(?=\*\*RECOMMENDATIONS:\*\*)/)?.[1]
        ?.trim() || "";
    const recommendations =
      summaryText.match(/\*\*RECOMMENDATIONS:\*\*([\s\S]*?)$/)?.[1]?.trim() ||
      "";

    // Format issues list
    const issuesHTML = topIssues
      .split("\n")
      .filter((line) => line.trim() && line.match(/^\d+\./))
      .map((issue) => `<div class="issue-item">${issue.trim()}</div>`)
      .join("");

    // Format recommendations list
    const recommendationsHTML = recommendations
      .split("\n")
      .filter((line) => line.trim() && line.startsWith("•"))
      .map((rec) => `<div class="recommendation-item">${rec.trim()}</div>`)
      .join("");

    // Create final formatted HTML
    const finalHTML = `
      
      
      <div class="summary-grid">
        <div class="issues-column">
          <h4><i class="fas fa-exclamation-triangle"></i> TOP ISSUES</h4>
          ${issuesHTML}
        </div>
        
        <div class="recommendations-column">
          <h4><i class="fas fa-lightbulb"></i> RECOMMENDATIONS</h4>
          ${recommendationsHTML}
        </div>
      </div>
      
      
    `;

    aiSummaryElement.innerHTML = finalHTML;
    document.getElementById(
      "aiSummaryMeta"
    ).innerText = `Last updated: ${new Date().toLocaleString()}`;
  } catch (error) {
    console.error("Error fetching AI summary:", error);
    aiSummaryElement.innerHTML =
      '<div class="error-message">Failed to generate AI summary. Please try again.</div>';
  }
}

