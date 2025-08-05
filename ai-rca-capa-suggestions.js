async function getAISuggestionsForComplaint(message, docId) {
  try {
    const apiKey = "Bearer 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";

    const prompt = `You are a senior quality analyst. A customer has submitted this complaint:

"${message}"

Your task:
1. Write a very concise, clear Root Cause Analysis (RCA) in 1 sentence. No filler words.
2. Write a very concise, clear Corrective and Preventive Action (CAPA) in 1-2 short actionable sentences. No unnecessary details.

Format exactly:
**RCA:** [short RCA]
**CAPA:** [short CAPA]

Be factual, brief, and avoid assumptions.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        model: "anthropic/claude-3-haiku",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    const result = await response.json();
    const suggestion = result?.choices?.[0]?.message?.content || "";

    // ✅ Extract RCA & CAPA
    const rcaMatch = suggestion.match(/\*\*RCA:\*\*\s*(.+?)\n/i);
    const capaMatch = suggestion.match(/\*\*CAPA:\*\*\s*(.+)/i);

    const rcaText = rcaMatch ? rcaMatch[1].trim() : "No suggestion generated.";
    const capaText = capaMatch ? capaMatch[1].trim() : "No suggestion generated.";

    const container = document.getElementById("aiSuggestion-" + docId);
    if (container) {
      container.innerHTML = `
        <div class="ai-rca-capa-suggestions">
          <p><strong>AI Suggested RCA:</strong><br><em>${rcaText}</em></p>
          <p><strong>AI Suggested CAPA:</strong><br><em>${capaText}</em></p>
          <button id="useSuggestionBtn-${docId}" class="update-btn">Use Suggestions</button>
        </div>
      `;

      // ✅ Attach event listener (safe)
      document.getElementById(`useSuggestionBtn-${docId}`).addEventListener("click", () => {
        document.getElementById("rcaInput").value = rcaText;
        document.getElementById("capaInput").value = capaText;
      });
    }
  } catch (error) {
    console.error("AI RCA/CAPA suggestion error:", error);
    const container = document.getElementById("aiSuggestion-" + docId);
    if (container) {
      container.innerHTML = `<p style="color:#dc3545;">AI suggestion failed. Please try again.</p>`;
    }
  }
}
