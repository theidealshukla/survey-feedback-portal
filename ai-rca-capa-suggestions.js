async function generateRcaCapaSuggestions(complaintMessage) {
  const prompt = `
You are an expert business analyst specializing in Root Cause Analysis (RCA) and Corrective and Preventive Actions (CAPA).

Analyze this customer complaint and provide structured recommendations:

**COMPLAINT:** "${complaintMessage}"

Please provide your analysis in this exact format:

**ROOT CAUSE ANALYSIS:**
- [Identify the underlying cause of this specific issue]
- [Consider systemic factors that may have contributed]

**CORRECTIVE ACTIONS (Immediate fixes):**
- [Specific actions to resolve this customer's issue]
- [Steps to prevent immediate recurrence]

**PREVENTIVE ACTIONS (Long-term improvements):**
- [Process improvements to prevent similar issues]
- [Training or system changes needed]

Keep responses concise, actionable, and specific to the complaint provided.
  `.trim();

  try {
    console.log("🤖 Sending complaint to AI for RCA/CAPA analysis:", complaintMessage);
    
    const response = await fetch("https://ai-backend-df9i.onrender.com/api/ai-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [prompt]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No AI response received");
    }

    console.log("✅ AI RCA/CAPA response received:", aiResponse);
    return aiResponse;

  } catch (err) {
    console.error("❌ RCA/CAPA AI Error:", err);
    return `**ROOT CAUSE ANALYSIS:**
- Unable to generate automated analysis due to technical issues
- Manual investigation required to determine root cause

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

    console.log("🔍 Starting AI suggestion for complaint message:", message);

    // Show loading state
    suggestionContainer.innerHTML = `
      <div class="loading" style="text-align: center; padding: 10px;">
        <i class="fas fa-robot fa-spin" style="color: #007bff;"></i> 
        <span style="margin-left: 8px; font-size: 13px; color: #666;">Analyzing complaint and generating RCA/CAPA suggestions...</span>
      </div>
    `;

    // Get AI suggestions based on the complaint message
    const aiResponse = await generateRcaCapaSuggestions(message);
    
    console.log("📋 Processing AI response for UI display");
    
    // Parse the AI response to extract RCA and CAPA sections
    const rcaMatch = aiResponse.match(/\*\*ROOT CAUSE ANALYSIS:\*\*([\s\S]*?)(?=\*\*CORRECTIVE ACTIONS|$)/i);
    const correctiveMatch = aiResponse.match(/\*\*CORRECTIVE ACTIONS[^:]*:\*\*([\s\S]*?)(?=\*\*PREVENTIVE ACTIONS|$)/i);
    const preventiveMatch = aiResponse.match(/\*\*PREVENTIVE ACTIONS[^:]*:\*\*([\s\S]*?)$/i);
    
    const rcaSuggestion = rcaMatch ? rcaMatch[1].trim() : "Unable to generate RCA suggestions";
    const correctiveSuggestion = correctiveMatch ? correctiveMatch[1].trim() : "Unable to generate corrective action suggestions";
    const preventiveSuggestion = preventiveMatch ? preventiveMatch[1].trim() : "Unable to generate preventive action suggestions";
    
    // Combine corrective and preventive actions for CAPA
    const capaSuggestion = `CORRECTIVE ACTIONS:\n${correctiveSuggestion}\n\nPREVENTIVE ACTIONS:\n${preventiveSuggestion}`;
    
    console.log("🔧 Extracted suggestions:", {
      rca: rcaSuggestion,
      capa: capaSuggestion
    });
    
    // Update the UI with AI suggestions
    suggestionContainer.innerHTML = `
      <div class="ai-suggestions" style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 15px; margin: 10px 0;">
        <h4 style="color: #007bff; margin-bottom: 15px; font-size: 14px;">
          <i class="fas fa-robot"></i> AI-Generated Suggestions
        </h4>
        
        <div style="margin-bottom: 15px;">
          <strong style="color: #dc3545; font-size: 13px;">📋 Root Cause Analysis:</strong>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 12px; line-height: 1.4; border-left: 3px solid #dc3545;">
            ${rcaSuggestion.replace(/^-\s*/gm, '• ')}
          </div>
          <button onclick="applyAISuggestion('rcaInput', \`${rcaSuggestion.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" 
                  class="apply-btn" style="margin-top: 8px; padding: 4px 10px; font-size: 11px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer;">
            Apply to RCA
          </button>
        </div>
        
        <div>
          <strong style="color: #28a745; font-size: 13px;">🔧 Corrective & Preventive Actions:</strong>
          <div style="background: white; padding: 10px; border-radius: 4px; margin-top: 5px; font-size: 12px; line-height: 1.4; border-left: 3px solid #28a745;">
            ${capaSuggestion.replace(/^-\s*/gm, '• ').replace(/\n/g, '<br>')}
          </div>
          <button onclick="applyAISuggestion('capaInput', \`${capaSuggestion.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" 
                  class="apply-btn" style="margin-top: 8px; padding: 4px 10px; font-size: 11px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer;">
            Apply to CAPA
          </button>
        </div>
        
        <div style="margin-top: 15px; font-size: 11px; color: #6c757d; text-align: center;">
          <i class="fas fa-info-circle"></i> You can edit these suggestions before applying
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error("❌ Error getting AI suggestions:", error);
    
    const suggestionContainer = document.getElementById(`aiSuggestion-${docId}`);
    if (suggestionContainer) {
      suggestionContainer.innerHTML = `
        <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 10px 0;">
          <div style="color: #856404; font-size: 13px;">
            <i class="fas fa-exclamation-triangle"></i> AI analysis temporarily unavailable
          </div>
          <div style="font-size: 12px; color: #6c757d; margin-top: 8px;">
            Please manually analyze the complaint: "${message}"
          </div>
        </div>
      `;
    }
  }
}

// Enhanced apply function with better handling
function applyAISuggestion(inputId, suggestion) {
  console.log("🔧 Applying AI suggestion to:", inputId);
  
  const textarea = document.getElementById(inputId);
  if (textarea) {
    // Clean up the suggestion text
    let cleanSuggestion = suggestion
      .replace(/\*\*[^*]+:\*\*/g, '') // Remove markdown headers
      .replace(/^\s*[-•]\s*/gm, '• ') // Normalize bullet points
      .replace(/\n\s*\n/g, '\n') // Remove extra line breaks
      .trim();
    
    textarea.value = cleanSuggestion;
    
    // Visual feedback
    textarea.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
      textarea.style.backgroundColor = '';
    }, 2000);
    
    // Focus on the textarea
    textarea.focus();
    
    console.log("✅ AI suggestion applied successfully");
    
    // Show confirmation
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '✓ Applied';
    button.style.backgroundColor = '#28a745';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
    
  } else {
    console.error("❌ Textarea not found:", inputId);
    alert("Unable to apply suggestion. Please copy manually.");
  }
}

// Test function for debugging
async function testAISuggestions(testMessage = "The website was down for 2 hours and I couldn't complete my order") {
  try {
    console.log("🧪 Testing AI suggestions with message:", testMessage);
    const response = await generateRcaCapaSuggestions(testMessage);
    console.log("🧪 Test response:", response);
    return response;
  } catch (error) {
    console.error("🧪 Test failed:", error);
    return null;
  }
}

// Make functions globally available
window.getAISuggestionsForComplaint = getAISuggestionsForComplaint;
window.applyAISuggestion = applyAISuggestion;
window.testAISuggestions = testAISuggestions;

console.log("🤖 AI RCA/CAPA suggestions module loaded successfully");
