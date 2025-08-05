async function generateRcaCapaSuggestions(messages) {
  const prompt = `
You are an AI assistant helping with **RCA (Root Cause Analysis)** and **CAPA (Corrective and Preventive Actions)**.

Given the following user feedbacks, complaints, and surveys, generate a structured analysis in this format:

**ROOT CAUSES:**
- Root cause 1
- Root cause 2

**CORRECTIVE ACTIONS (Short-Term):**
- Action 1
- Action 2

**PREVENTIVE ACTIONS (Long-Term):**
- Action 1
- Action 2

Feedbacks:
${messages.join(" | ")}
  `.trim();

  try {
    const response = await fetch("https://ai-backend-df9i.onrender.com/api/ai-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [prompt]
      })
    });

    const result = await response.json();
    const summary = result?.choices?.[0]?.message?.content;

    if (!summary) return "No RCA/CAPA generated.";

    // Display RCA/CAPA (you can customize this)
    const container = document.getElementById("rcaCapaOutput");
    if (container) container.innerText = summary;

    return summary;
  } catch (err) {
    console.error("❌ RCA/CAPA AI Error:", err);
    return "Failed to generate RCA/CAPA suggestions.";
  }
}

async function getAISuggestionsForComplaint(message, docId) {
  try {
    const suggestionContainer = document.getElementById(`aiSuggestion-${docId}`);
    if (!suggestionContainer) {
      console.error(`Container aiSuggestion-${docId} not found`);
      return;
    }

    console.log("🔍 Starting AI suggestion for message:", message);

    // Show loading state
    suggestionContainer.innerHTML = `
      <div class="loading">
        <i class="fas fa-robot fa-spin"></i> 
        <span>Analyzing complaint...</span>
      </div>
    `;

    // Try multiple API endpoints and approaches
    let response;
    let data;
    
    // First, try the specific RCA/CAPA endpoint
    try {
      console.log("🚀 Trying ai-rca-capa endpoint...");
      response = await fetch('https://ai-backend-df9i.onrender.com/api/ai-rca-capa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      console.log("📡 RCA/CAPA Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`RCA/CAPA API error: ${response.status} ${response.statusText}`);
      }

      data = await response.json();
      console.log("✅ RCA/CAPA Response data:", data);
      
    } catch (rcaError) {
      console.warn("⚠️ RCA/CAPA endpoint failed, trying ai-summary endpoint...", rcaError);
      
      // Fallback to ai-summary endpoint with specific prompt
      try {
        const prompt = `Analyze this customer complaint and provide:

**ROOT CAUSE ANALYSIS:**
[Identify the underlying cause of this issue]

**CORRECTIVE ACTION:**
[Immediate steps to resolve this specific complaint]

**PREVENTIVE ACTION:**
[Long-term measures to prevent similar complaints]

Complaint: "${message}"

Please be concise and practical.`;

        response = await fetch('https://ai-backend-df9i.onrender.com/api/ai-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            messages: [prompt]
          })
        });

        console.log("📡 AI-Summary Response status:", response.status);
        
        if (!response.ok) {
          throw new Error(`AI-Summary API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log("✅ AI-Summary Response data:", result);
        
        const content = result?.choices?.[0]?.message?.content || result?.content || result?.summary;
        
        if (!content) {
          throw new Error("No content in AI response");
        }

        // Parse the structured response
        const rcaMatch = content.match(/\*\*ROOT CAUSE ANALYSIS:\*\*([\s\S]*?)(?=\*\*CORRECTIVE ACTION:\*\*|$)/i);
        const capaMatch = content.match(/\*\*CORRECTIVE ACTION:\*\*([\s\S]*?)(?=\*\*PREVENTIVE ACTION:\*\*|$)/i);
        const preventiveMatch = content.match(/\*\*PREVENTIVE ACTION:\*\*([\s\S]*?)$/i);

        data = {
          rca: rcaMatch ? rcaMatch[1].trim() : content.split('\n')[0] || "No RCA available",
          capa: capaMatch ? capaMatch[1].trim() : content.split('\n')[1] || "No CAPA available",
          preventive: preventiveMatch ? preventiveMatch[1].trim() : "No preventive actions available"
        };
        
      } catch (summaryError) {
        console.error("❌ Both endpoints failed:", summaryError);
        throw summaryError;
      }
    }

    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error("Invalid response format from AI service");
    }

    // Ensure we have at least basic suggestions
    const rca = data.rca || data.rootCause || "Unable to determine specific root cause. Please investigate further.";
    const capa = data.capa || data.correctiveAction || "Please implement appropriate corrective measures.";
    
    console.log("📋 Final processed data:", { rca, capa });
    
    // Update the UI with suggestions
    suggestionContainer.innerHTML = `
      <div class="ai-suggestions">
        <div class="suggestion-section">
          <h5><i class="fas fa-search"></i> Root Cause Analysis</h5>
          <p class="suggestion-text">${rca}</p>
          <button onclick="applyAISuggestion('rcaInput', \`${rca.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="apply-btn">
            <i class="fas fa-check"></i> Apply RCA
          </button>
        </div>
        
        <div class="suggestion-section">
          <h5><i class="fas fa-tools"></i> Corrective & Preventive Action</h5>
          <p class="suggestion-text">${capa}</p>
          <button onclick="applyAISuggestion('capaInput', \`${capa.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`)" class="apply-btn">
            <i class="fas fa-check"></i> Apply CAPA
          </button>
        </div>
      </div>
    `;

    console.log("✅ AI suggestions updated successfully");
    
  } catch (error) {
    console.error('❌ AI suggestion error:', error);
    
    const suggestionContainer = document.getElementById(`aiSuggestion-${docId}`);
    if (suggestionContainer) {
      suggestionContainer.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-circle"></i>
          <div class="error-details">
            <strong>Failed to get AI suggestions</strong>
            <p>Error: ${error.message}</p>
            <button onclick="getAISuggestionsForComplaint('${message.replace(/'/g, "\\'")}', '${docId}')" class="retry-btn">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>
        </div>
      `;
    }
  }
}

// Enhanced apply function with better escaping
function applyAISuggestion(inputId, suggestion) {
  console.log("🔧 Applying suggestion to:", inputId, "Content:", suggestion);
  
  const textarea = document.getElementById(inputId);
  if (textarea) {
    textarea.value = suggestion;
    textarea.focus();
    
    // Visual feedback
    textarea.style.backgroundColor = '#e8f5e8';
    setTimeout(() => {
      textarea.style.backgroundColor = '';
    }, 1500);
    
    console.log("✅ Suggestion applied successfully");
  } else {
    console.error("❌ Textarea not found:", inputId);
  }
}

// Test function to check API connectivity
async function testAPIConnection() {
  try {
    console.log("🔧 Testing API connection...");
    
    const response = await fetch('https://ai-backend-df9i.onrender.com/api/ai-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: ["Test message"]
      })
    });
    
    console.log("📡 Test response status:", response.status);
    console.log("📡 Test response headers:", response.headers);
    
    const data = await response.json();
    console.log("📋 Test response data:", data);
    
    return response.ok;
  } catch (error) {
    console.error("❌ API test failed:", error);
    return false;
  }
}

// Call this function in browser console to test: testAPIConnection()
