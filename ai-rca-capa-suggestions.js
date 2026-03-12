/**
 * AI RCA/CAPA Suggestions Module
 * Generates Root Cause Analysis and Corrective/Preventive Actions via OpenAI.
 * Depends on: ai-config.js (callOpenAI)
 */

async function generateRcaCapaSuggestions(complaintMessage) {
  const systemPrompt = `You are an expert business analyst specializing in Root Cause Analysis (RCA) and Corrective and Preventive Actions (CAPA) for customer complaints. Provide structured, actionable recommendations based on the specific complaint. Be concise and practical.`;

  const userPrompt = `
Analyze this customer complaint and provide structured recommendations:

**COMPLAINT:** "${complaintMessage}"

Respond in this EXACT format:

**ROOT CAUSE ANALYSIS:**
- [Identify the underlying cause of this specific issue]
- [Consider systemic factors that may have contributed]

**CORRECTIVE ACTIONS (Immediate fixes):**
- [Specific actions to resolve this customer's issue]
- [Steps to prevent immediate recurrence]

**PREVENTIVE ACTIONS (Long-term improvements):**
- [Process improvements to prevent similar issues]
- [Training or system changes needed]

Keep responses concise, actionable, and specific to the complaint.
  `.trim();

  try {
    const aiResponse = await callOpenAI(systemPrompt, userPrompt, {
      temperature: 0.3,
      max_tokens: 800,
    });
    return aiResponse;
  } catch (err) {
    console.error("❌ RCA/CAPA AI Error:", err);
    return `**ROOT CAUSE ANALYSIS:**
- Unable to generate automated analysis: ${err.message}
- Manual investigation recommended

**CORRECTIVE ACTIONS:**
- Contact customer directly to resolve immediate concern
- Document issue details for further investigation

**PREVENTIVE ACTIONS:**
- Review similar complaints to identify patterns
- Implement monitoring for this type of issue`;
  }
}

async function getAISuggestionsForComplaint(message, docId) {
  try {
    const suggestionContainer = document.getElementById(`aiSuggestion-${docId}`);
    if (!suggestionContainer) {
      console.error("❌ AI suggestion container not found for docId:", docId);
      return;
    }

    suggestionContainer.innerHTML = `
      <div class="loading" style="text-align: center; padding: 10px;">
        <i class="fas fa-robot fa-spin" style="color: var(--accent-blue, #007bff);"></i> 
        <span style="margin-left: 8px; font-size: 13px; color: var(--text-secondary, #666);">Analyzing complaint and generating RCA/CAPA suggestions...</span>
      </div>
    `;

    const aiResponse = await generateRcaCapaSuggestions(message);

    // Parse response sections
    const rcaMatch = aiResponse.match(
      /\*\*ROOT CAUSE ANALYSIS:\*\*([\s\S]*?)(?=\*\*CORRECTIVE ACTIONS|$)/i
    );
    const correctiveMatch = aiResponse.match(
      /\*\*CORRECTIVE ACTIONS[^:]*:\*\*([\s\S]*?)(?=\*\*PREVENTIVE ACTIONS|$)/i
    );
    const preventiveMatch = aiResponse.match(
      /\*\*PREVENTIVE ACTIONS[^:]*:\*\*([\s\S]*?)$/i
    );

    const rcaSuggestion = rcaMatch ? rcaMatch[1].trim() : "Unable to generate RCA suggestions";
    const correctiveSuggestion = correctiveMatch ? correctiveMatch[1].trim() : "Unable to generate corrective action suggestions";
    const preventiveSuggestion = preventiveMatch ? preventiveMatch[1].trim() : "Unable to generate preventive action suggestions";
    const capaSuggestion = `CORRECTIVE ACTIONS:\n${correctiveSuggestion}\n\nPREVENTIVE ACTIONS:\n${preventiveSuggestion}`;

    // Escape text for safe insertion into onclick handlers
    const escapeForAttr = (str) =>
      str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/'/g, "\\'").replace(/"/g, "&quot;");

    suggestionContainer.innerHTML = `
      <div class="ai-suggestions">
        <h4 class="ai-suggestions-title">
          <i class="fas fa-robot"></i> AI-Generated Suggestions
        </h4>
        
        <div class="suggestion-section">
          <strong class="suggestion-label suggestion-label--rca">📋 Root Cause Analysis:</strong>
          <div class="suggestion-text suggestion-text--rca">
            ${rcaSuggestion.replace(/^-\s*/gm, "• ")}
          </div>
          <button onclick="applyAISuggestion('rcaInput', \`${escapeForAttr(rcaSuggestion)}\`)" class="apply-btn apply-btn--rca">
            <i class="fas fa-check"></i> Apply to RCA
          </button>
        </div>
        
        <div class="suggestion-section">
          <strong class="suggestion-label suggestion-label--capa">🔧 Corrective & Preventive Actions:</strong>
          <div class="suggestion-text suggestion-text--capa">
            ${capaSuggestion.replace(/^-\s*/gm, "• ").replace(/\n/g, "<br>")}
          </div>
          <button onclick="applyAISuggestion('capaInput', \`${escapeForAttr(capaSuggestion)}\`)" class="apply-btn apply-btn--capa">
            <i class="fas fa-check"></i> Apply to CAPA
          </button>
        </div>
        
        <div class="ai-suggestions-footer">
          <i class="fas fa-info-circle"></i> You can edit these suggestions before applying
        </div>
      </div>
    `;
  } catch (error) {
    console.error("❌ Error getting AI suggestions:", error);

    const suggestionContainer = document.getElementById(`aiSuggestion-${docId}`);
    if (suggestionContainer) {
      suggestionContainer.innerHTML = `
        <div class="ai-suggestions-error">
          <i class="fas fa-exclamation-triangle"></i> AI analysis unavailable: ${error.message}
          <div style="font-size: 12px; margin-top: 6px;">Please manually analyze the complaint.</div>
        </div>
      `;
    }
  }
}

function applyAISuggestion(inputId, suggestion) {
  const textarea = document.getElementById(inputId);
  if (textarea) {
    let cleanSuggestion = suggestion
      .replace(/\*\*[^*]+:\*\*/g, "")
      .replace(/^\s*[-•]\s*/gm, "• ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    textarea.value = cleanSuggestion;
    textarea.style.backgroundColor = "rgba(40, 167, 69, 0.15)";
    setTimeout(() => (textarea.style.backgroundColor = ""), 2000);
    textarea.focus();

    const button = event?.target?.closest(".apply-btn");
    if (button) {
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-check-circle"></i> Applied!';
      setTimeout(() => (button.innerHTML = originalText), 2000);
    }
  } else {
    console.error("❌ Textarea not found:", inputId);
    alert("Unable to apply suggestion. Please copy manually.");
  }
}

// Make functions globally available
window.getAISuggestionsForComplaint = getAISuggestionsForComplaint;
window.applyAISuggestion = applyAISuggestion;
window.generateRcaCapaSuggestions = generateRcaCapaSuggestions;

console.log("✅ AI RCA/CAPA suggestions module loaded (direct OpenAI)");
