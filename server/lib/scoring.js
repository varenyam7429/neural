import dotenv from "dotenv";
dotenv.config();

function parseJSONSafely(text, fallback) {
  try {
    const rawText = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();
    return JSON.parse(rawText);
  } catch (err) {
    console.error("AI JSON Parse Error:", err);
    return fallback;
  }
}

export async function analyzeAnswer({ answer, question, role, transcriptSoFar = [], rubric = null, pressureScore = 50, responseSeconds = 0 }) {
  const metaContext = rubric ? `
[Recruiter Guidance for this Question]
- Ideal Framework: ${rubric.ideal_answer_framework || "N/A"}
- Expected Points: ${(rubric.expectedPoints || []).join(', ')}
- Example Strong Answer: "${rubric.strong_answer || "N/A"}"
` : "";

  const prompt = `
You are an elite interviewer evaluating an answer for a ${role} role.

Question: ${question}
${metaContext}

Candidate's Answer (${responseSeconds} seconds):
"${answer}"

Current Pressure Score: ${pressureScore} (out of 100). Higher pressure means the candidate is being grilled more intensely. Do not penalize unless they completely fold.

Return ONLY valid JSON matching this exact structure:
{
  "answerQuality": number (0 to 100),
  "structure": number (0 to 100),
  "specificity": number (0 to 100),
  "confidence": number (0 to 100),
  "presence": number (0 to 100),
  "roleFit": number (0 to 100),
  "pressureHandling": number (0 to 100),
  "overall": number (0 to 100),
  "recruiterPerception": "string summary",
  "hiringRisk": "Low" | "Moderate" | "High",
  "weaknesses": ["string array"],
  "improvement": "A clear actionable tip for improvement",
  "rewrite": "A stronger, perfect way the candidate could have answered.",
  "followUp": "A direct follow-up challenge probing the weakest part of their answer. Keep it under 20 words."
}
Be sharp, honest, and do not use generic fluff.
  `;

  const fallbackData = {
    answerQuality: 60, structure: 60, specificity: 50, confidence: 60, presence: 60, roleFit: 60, pressureHandling: 40, overall: 55,
    recruiterPerception: "Answer captured via emergency fallback.",
    hiringRisk: "Moderate",
    weaknesses: ["Lacked specific metrics and clarity."],
    improvement: "Use the STAR method rigidly.",
    rewrite: "I would approach this by defining constraints, measuring baselines, and implementing X.",
    followUp: "Can you elaborate on exactly what you did, rather than the team's effort?"
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    const parsed = parseJSONSafely(rawText, fallbackData);
    
    // Bind responseSeconds into analysis for the UI
    parsed.responseSeconds = responseSeconds;

    return {
      analysis: parsed,
      followUp: parsed.followUp
    };
  } catch (error) {
    console.error("OpenRouter fetch failed:", error.message);
    return {
      analysis: { ...fallbackData, responseSeconds },
      followUp: fallbackData.followUp
    };
  }
}

export async function summarizeSession(session) {
  const transcriptText = (session.transcript || []).map((t, i) => `
Q${i + 1}: ${t.question}
A${i + 1}: ${t.answer}
Score: ${t.analysis?.overall || 0}/100
`).join('\n');

  const prompt = `
You are an evaluating committee reviewing a complete interview loop for a ${session.role}.

Transcript:
${transcriptText}

Provide an overall final verdict and thematic summary.
Return ONLY valid JSON matching this exact structure:
{
  "overallReadiness": number (0-100),
  "finalDecision": "Hire" | "No Hire" | "Borderline",
  "topStrength": "One powerful sentence about their best trait",
  "mainWeakness": "One critical sentence about their worst trait",
  "repeatedIssue": "A bad habit they kept repeating (or 'None')",
  "bestAnswerSummary": "A short recap of the single best point they made across all rounds",
  "recruiterImpression": "A harsh, honest 2-sentence final hiring recommendation.",
  "recommendedFocus": "A topic to focus on next time."
}
`;

  const fallbackSummary = {
    overallReadiness: 65,
    finalDecision: "Borderline",
    topStrength: "Completed the interview loop properly.",
    mainWeakness: "Did not consistently display mastery of details.",
    repeatedIssue: "Missing impact metrics",
    bestAnswerSummary: "They managed to describe their role adequately in the first answer.",
    recruiterImpression: "Borderline. Needs to be much sharper under pressure.",
    recommendedFocus: "Use the STAR framework explicitly."
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    return parseJSONSafely(rawText, fallbackSummary);
  } catch (error) {
    console.error("OpenRouter fetch failed:", error.message);
    return fallbackSummary;
  }
}
