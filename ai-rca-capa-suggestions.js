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
