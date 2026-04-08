import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";

// Legacy simple string questions
import { roleQuestions } from "./src/data/interviewQuestions.js";
// Structured full-context questions
import { structuredHRQuestions } from "./src/data/structuredHRQuestions.js";
import { structuredSWEQuestions } from "./src/data/structuredSWEQuestions.js";
import { structuredPMQuestions } from "./src/data/structuredPMQuestions.js";
import { structuredDAQuestions } from "./src/data/structuredDAQuestions.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("InterviewMirror AI Stateful API running");
});

// Internal State Machine Memory
const activeSessions = new Map();

// Auto-cleanup stale sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.createdAt > 3600000) { // 1 hour TTL
      activeSessions.delete(id);
    }
  }
}, 3600000);

function getPoolForRole(role) {
  let structuredPool = [];
  if (role === "Software Engineer") structuredPool = structuredSWEQuestions;
  else if (role === "Product Manager") structuredPool = structuredPMQuestions;
  else if (role === "Data Analyst") structuredPool = structuredDAQuestions;
  else structuredPool = structuredHRQuestions; // Fallback / HR
  
  const legacyData = roleQuestions[role] || roleQuestions["HR / General"];
  let legacyPool = [];
  if (legacyData.technical && legacyData.behavioral) {
     legacyPool = [...legacyData.technical, ...legacyData.behavioral];
  } else {
     legacyPool = legacyData.behavioral || legacyData.technical || [];
  }

  // Combine both pools
  return [...legacyPool, ...structuredPool];
}

app.post("/api/start-session", async (req, res) => {
  const { role, type, difficulty, maxRounds = 3 } = req.body;
  const sessionId = crypto.randomUUID();
  
  let pool = getPoolForRole(role);

  // Filter pool by difficulty if it's a structured object (fallback to all if no matches)
  if (difficulty) {
    const filteredPool = pool.filter(q => typeof q === "string" || q.difficulty === difficulty);
    if (filteredPool.length > 0) pool = filteredPool;
  }
  
  const firstQuestionObj = pool[Math.floor(Math.random() * pool.length)];
  const firstQuestion = typeof firstQuestionObj === 'string' ? firstQuestionObj : firstQuestionObj.question;

  activeSessions.set(sessionId, {
    sessionId,
    role,
    type,
    difficulty,
    maxRounds,
    currentRound: 1,
    history: [],
    transcriptPhase: [],
    usedQuestions: [firstQuestion],
    currentQuestionMeta: typeof firstQuestionObj === 'object' ? firstQuestionObj : null,
    createdAt: Date.now()
  });

  res.json({
    sessionId,
    firstQuestion,
    category: typeof firstQuestionObj === 'object' ? firstQuestionObj.category : "technical_problem_solving",
    questionMeta: typeof firstQuestionObj === 'object' ? firstQuestionObj : null
  });
});

app.post("/api/submit-answer", async (req, res) => {
  try {
    const { sessionId, question, answer, skippedFollowUp, presenceMetrics } = req.body;
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found or expired" });
    }

    session.transcriptPhase.push({ speaker: "Interviewer", text: question });
    
    let answerText = answer;
    if (skippedFollowUp) {
      answerText = "[Candidate skipped the follow-up question. Penalize resilience heavily.]";
    }
    session.transcriptPhase.push({ speaker: "Candidate", text: answerText || "[No answer provided]" });

    const transcriptText = session.transcriptPhase.map(t => `${t.speaker}: ${t.text}`).join('\n');

    let metaContext = "";
    if (session.currentQuestionMeta) {
      metaContext = `
[Recruiter Guidance for this Question]
- Ideal Answer Framework: ${session.currentQuestionMeta.ideal_answer_framework || "N/A"}
- Traits Evaluated: ${(session.currentQuestionMeta.traits_evaluated || []).join(', ')}
- Example Strong Answer: "${session.currentQuestionMeta.strong_answer || "N/A"}"
- Typical Weaknesses to Watch For: ${(session.currentQuestionMeta.feedback_average || []).join(', ')}
`;
    }

    const prompt = `
You are an elite recruiter.

Evaluate the following interview transcript.
${metaContext}

Return ONLY valid JSON in this exact format:
{
  "analysis": {
    "answerQuality": number,
    "structure": number,
    "specificity": number,
    "confidence": number,
    "presence": number,
    "roleFit": number,
    "pressureHandling": number,
    "recruiterPerception": "string",
    "hiringRisk": "Low" | "Moderate" | "High",
    "weaknesses": ["string"],
    "improvement": "string",
    "rewrite": "string"
  },
  "nextAction": "followup" | "next_question" | "summary",
  "followUpQuestion": "string"
}

Rules for nextAction:
- Return "summary" if the interview round limit has been reached (Current Round is ${session.currentRound}, Max Rounds is ${session.maxRounds}).
- Otherwise, Return "followup" if the answer still has useful pressure-testing value or if the candidate completely skipped the question.
- Your "followUpQuestion" MUST directly probe one of the weaknesses found.
- Return "next_question" ONLY if the answer is already interview-strong and does not meaningfully benefit from additional probing. DO NOT generate the next core question, just return "next_question" and the backend will handle it.

Rules for Analysis:
- Score from 0 to 100 for all numeric fields.
- Be incredibly sharp, honest, and useful. Not fake motivational fluff.
- Pressure Handling = How well the candidate responded after being challenged. High score if they stayed specific. Low score if they skipped, became vague, or repetitive.

Role: ${session.role}
Transcript:
${transcriptText}

Presence Metrics:
${JSON.stringify(presenceMetrics || {}, null, 2)}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "InterviewMirror AI",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.warn("OpenRouter fetch failed or timed out:", fetchErr.message);
      response = { json: async () => ({}) }; // Produce empty data to force fallback
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    const cleanJsonText = rawText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch {
      parsed = {
        analysis: {
          answerQuality: 70, structure: 65, specificity: 50, confidence: 60, presence: 70,
          roleFit: 60, pressureHandling: 40,
          recruiterPerception: skippedFollowUp ? "Candidate avoided the follow-up challenge." : "Answer lacked structural depth.",
          hiringRisk: "Moderate",
          weaknesses: skippedFollowUp ? ["Avoidance behavior under pressure"] : ["Too brief", "No metric impact"], 
          improvement: "Add specific details directly attacking the core of the question.", 
          rewrite: "I achieved X by doing Y."
        },
        nextAction: "followup",
        followUpQuestion: "Can you elaborate precisely on what I just asked?"
      };
    }

    if (parsed.nextAction === "next_question" && session.currentRound >= session.maxRounds) {
      parsed.nextAction = "summary";
    }

    if (!parsed.analysis) {
      parsed.analysis = {
          answerQuality: 70, structure: 65, specificity: 50, confidence: 60, presence: 70,
          roleFit: 60, pressureHandling: 50,
          recruiterPerception: "Answer lacked structural depth.", hiringRisk: "Moderate",
          weaknesses: ["Too brief", "No metric impact"], improvement: "Add details.", rewrite: "I achieved X by doing Y."
      };
    }

    // Normalize nextAction
    const validActions = ["followup", "next_question", "summary"];
    if (parsed.nextAction === "follow_up") parsed.nextAction = "followup";
    if (parsed.nextAction === "next-question") parsed.nextAction = "next_question";
    
    if (!validActions.includes(parsed.nextAction)) {
      parsed.nextAction = "followup";
      if (!parsed.followUpQuestion) parsed.followUpQuestion = "Can you expand on that answer with more specific details?";
    }

    // Incorporate presence into analysis
    if (parsed.analysis) {
       parsed.analysis.presence = presenceMetrics?.presenceScore ?? parsed.analysis.presence ?? 70;
       
       parsed.analysis.overall = Math.round(
         (parsed.analysis.answerQuality || 0) * 0.20 +
         (parsed.analysis.structure || 0) * 0.15 +
         (parsed.analysis.specificity || 0) * 0.20 +
         (parsed.analysis.confidence || 0) * 0.10 +
         (parsed.analysis.presence || 0) * 0.10 +
         (parsed.analysis.roleFit || 0) * 0.15 +
         (parsed.analysis.pressureHandling || 0) * 0.10
       );
    }

    if (parsed.nextAction === "next_question") {
      let pool = getPoolForRole(session.role);
      
      if (session.difficulty) {
        const filteredPool = pool.filter(q => typeof q === "string" || q.difficulty === session.difficulty);
        if (filteredPool.length > 0) pool = filteredPool;
      }

      const availableQuestions = pool.filter(q => {
        const qStr = typeof q === 'string' ? q : q.question;
        return !session.usedQuestions.includes(qStr);
      });

      if (availableQuestions.length > 0) {
        const nextQObj = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        parsed.nextQuestion = typeof nextQObj === 'string' ? nextQObj : nextQObj.question;
        session.currentQuestionMeta = typeof nextQObj === 'object' ? nextQObj : null;
      } else {
        const fallbackObj = pool[Math.floor(Math.random() * pool.length)]; 
        parsed.nextQuestion = typeof fallbackObj === 'string' ? fallbackObj : fallbackObj.question;
        session.currentQuestionMeta = typeof fallbackObj === 'object' ? fallbackObj : null;
      }
      
      parsed.nextQuestionMeta = session.currentQuestionMeta;
      session.usedQuestions.push(parsed.nextQuestion);
    }

    if (parsed.nextAction !== "followup") {
       session.history.push({
         round: session.currentRound,
         transcript: [...session.transcriptPhase],
         results: parsed.analysis
       });
       session.currentRound++;
       session.transcriptPhase = [];
    }
    
    parsed.round = session.currentRound;

    res.json(parsed);
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.post("/api/end-session", async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const sessionHistoryText = session.history.map((run) => {
      const transcriptStr = run.transcript.map(t => `${t.speaker}: ${t.text}`).join('\n');
      return `Round ${run.round}:\n${transcriptStr}\nResult Score: ${run.results.overall}\n---\n`;
    }).join('\n');

    const prompt = `
You are an evaluating hiring committee finishing a full session.

Evaluate the following session history across ${session.history.length} rounds.

Return ONLY valid JSON in this exact format:
{
  "overallReadiness": number,
  "finalDecision": "Hire" | "No Hire" | "Borderline",
  "topStrength": "...",
  "mainWeakness": "...",
  "repeatedIssue": "...",
  "recruiterImpression": "...",
  "recommendedFocus": "...",
  "bestAnswerSummary": "..."
}

Rules:
- overallReadiness is 0-100 indicating hire probability.
- Look for repeating issues.
- Be extremely blunt.

Session History:
${sessionHistoryText}
`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "InterviewMirror AI",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [{ role: "user", content: prompt }],
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.warn("OpenRouter end-session fetch failed or timed out:", fetchErr.message);
      response = { json: async () => ({}) }; // Produce empty data to force fallback
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    const cleanJsonText = rawText.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch {
      parsed = {
        overallReadiness: 65, finalDecision: "Borderline", topStrength: "Remained calm",
        mainWeakness: "Lacked technical details", repeatedIssue: "Kept giving high-level summaries when asked for specifics",
        recruiterImpression: "Passable, but needs to prove execution depth.", recommendedFocus: "Drill down into tradeoffs.",
        bestAnswerSummary: "The candidate answered the initial problem well but struggled on details."
      };
    }

    // Optional: Keep session in memory if needed for export later, or delete it
    // activeSessions.delete(sessionId); 

    res.json(parsed);
  } catch (error) {
    console.error("End session error:", error);
    res.status(500).json({ error: "Session wrapper failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});