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
      aiSummaryElement.innerHTML = "No complaints or survey feedback to analyze.";
      return;
    }

    const summary = await generateAISummary(messages);

    const keyInsights =
      summary.match(/\*\*KEY INSIGHTS:\*\*([\s\S]*?)(?=\*\*COMMON ISSUES:\*\*)/)?.[1]?.trim() || "";
    const commonIssues =
      summary.match(/\*\*COMMON ISSUES:\*\*([\s\S]*?)(?=\*\*SUGGESTIONS:\*\*)/)?.[1]?.trim() || "";
    const suggestions =
      summary.match(/\*\*SUGGESTIONS:\*\*([\s\S]*)/)?.[1]?.trim() || "";

    const issuesHTML = commonIssues
      .split("\n")
      .filter((line) => line.trim() && line.match(/^[-•]/))
      .map((line) => `<div class="issue-item">${line.replace(/^[-•]\s*/, "")}</div>`)
      .join("");

    const suggestionsHTML = suggestions
      .split("\n")
      .filter((line) => line.trim() && line.match(/^[-•]/))
      .map((line) => `<div class="recommendation-item">${line.replace(/^[-•]\s*/, "")}</div>`)
      .join("");

    aiSummaryElement.innerHTML = `
      <div class="summary-grid">
        <div class="issues-column">
          <h4><i class="fas fa-exclamation-circle"></i> COMMON ISSUES</h4>
          ${issuesHTML}
        </div>
        <div class="recommendations-column">
          <h4><i class="fas fa-lightbulb"></i> SUGGESTIONS</h4>
          ${suggestionsHTML}
        </div>
      </div>
    `;

    document.getElementById("aiSummaryMeta").innerText =
      `Last updated: ${new Date().toLocaleString()}`;
  } catch (error) {
    console.error("❌ Error loading AI Summary:", error);
    aiSummaryElement.innerHTML =
      '<div class="error-message">Failed to generate AI summary.</div>';
  }
}
