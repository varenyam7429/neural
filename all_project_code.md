# Full Project Code


## .gitignore

```plaintext
node_modules

```


## package.json

```json
{
  "name": "neural-v3",
  "private": true,
  "version": "3.0.0",
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "npm-run-all --parallel dev:server dev:client",
    "dev:client": "npm --workspace client run dev",
    "dev:server": "npm --workspace server run dev",
    "build": "npm --workspace client run build",
    "start": "npm --workspace server run start"
  },
  "devDependencies": {
    "npm-run-all": "^4.1.5"
  }
}

```


## README.md

```plaintext
# neural
```


## backend/.env

```plaintext
OPENROUTER_API_KEY=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
```


## backend/index.js

```javascript
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
```


## backend/package.json

```json
{
  "type": "module",
  "name": "interviewmirror-server",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "node-fetch": "^3.3.2"
  }
}

```


## backend/src/data/interviewQuestions.js

```javascript
export const roleQuestions = {
  "Software Engineer": {
    technical: [
      "Tell me about a time you had to make a difficult architectural decision under pressure.",
      "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
      "How do you handle crippling technical debt when product deadlines are incredibly tight?",
      "Walk me through a time when a critical system failed in production. How did you diagnose and resolve it?",
      "Explain a complex refactoring project you initiated. How did you validate that it was successful?",
      "What is the most difficult bug you've ever had to track down, and what was your methodology?",
      "How do you ensure your code remains maintainable and scalable as a team grows?",
      "Describe a time you strongly disagreed with a senior engineer's technical proposal. How was it resolved?",
      "Tell me about a time you inherited a massive, undocumented legacy codebase. Where did you start?",
      "How do you decide when to build a feature from scratch versus using a third-party library?",
      "Describe a scenario where you had to compromise on testing to hit a critical delivery milestone.",
      "Explain how you design an API that needs to support both internal and external consumers.",
      "Tell me about a time you miscalculated the capacity or scaling limitations of a system you built.",
      "Walk me through your thought process when reviewing a pull request that introduces a significant risk.",
      "How do you debug an intermittent performance issue that only happens under specific load conditions?"
    ],
    behavioral: [
      "Tell me about a time your project was blocked by another team. How did you unblock it?",
      "Describe a situation where you had to deliver bad news to stakeholders about a technical delay.",
      "Have you ever broken the build or pushed a critical bug? What was the immediate fallout?",
      "How do you mentor junior engineers who are consistently missing edge cases in their code?",
      "Tell me about a time you pushed back on a feature request because it wasn't technically sound.",
      "Describe a time you had to context-switch rapidly between multiple critical priority tasks.",
      "How do you handle a teammate who refuses to adopt new engineering standards or practices?",
      "Tell me about a time when you completely misestimated a task. How did you recover?",
      "What is the harshest piece of technical feedback you've ever received, and how did you change?",
      "Describe a time you had to take ownership of a failing project that you did not start."
    ]
  },
  "Data Analyst": {
    technical: [
      "Tell me about a time your data analysis completely contradicted the team’s core assumption.",
      "How do you handle a situation where the raw data you need is highly fragmented, dirty, or missing?",
      "Walk me through a complex data model you built that directly influenced a business outcome.",
      "Describe a time you had to optimize a slow, resource-heavy SQL query. What was your approach?",
      "Explain how you determine the statistical significance of a sudden drop in a core metric.",
      "Tell me about a time you had to merge datasets from disparate systems that had no common key.",
      "How do you handle data anomalies or outliers that completely skew your reporting models?",
      "Describe an instance where you uncovered a critical tracking error in production. How did you fix the historical data?",
      "Walk me through your process of validating the integrity of a new data pipeline.",
      "How do you identify whether a metric change is a seasonal trend or a permanent behavioral shift?",
      "Tell me about a time you had to automate a highly manual, error-prone reporting process.",
      "How do you balance the need for deep exploratory analysis with the immediate demands of stakeholders?",
      "Describe a scenario where your predictive model failed in reality. What did you learn?",
      "Explain your approach to designing a dashboard that executives will actually use and understand.",
      "Tell me about a time you had to perform analysis with extremely limited tooling."
    ],
    behavioral: [
      "How do you communicate complex, counter-intuitive data insights to non-technical stakeholders?",
      "Tell me about a time stakeholders completely rejected your data-backed recommendations.",
      "Describe a situation where a stakeholder asked for vanity metrics. How did you pivot the conversation?",
      "How do you prioritize ad-hoc data requests from multiple departments simultaneously?",
      "Tell me about a time you had to admit a fundamental error in an analysis you already presented.",
      "Describe a situation where you had to push back on a timeline because the data required more rigorous cleaning.",
      "How do you handle a stakeholder who is aggressively cherry-picking data to support their narrative?",
      "Tell me about a time you successfully trained another team to self-serve their own data needs.",
      "What do you do when the business urgently needs an answer, but the data won't be ready in time?",
      "Describe your approach to documenting highly complex business rules for data transformations."
    ]
  },
  "Product Manager": {
    technical: [
      "Tell me about a time you had to prioritize competing, aggressive demands from multiple stakeholders.",
      "Describe a product feature launch that failed. How did you measure the failure and what was the pivot?",
      "Walk me through precisely how you determine and measure success for a new product launch.",
      "How do you decide when to kill a feature that users love but is technically unsustainable?",
      "Tell me about a time you had to slash the MVP scope ruthlessly to hit a critical market deadline.",
      "Describe a situation where you had to launch perfectly into a highly ambiguous, undefined market.",
      "How do you manage the tradeoff between paying down technical debt and shipping new features?",
      "Tell me about a time you used purely qualitative user feedback to override a quantitative data trend.",
      "Walk me through a complex pricing or monetization strategy you developed or adjusted.",
      "How do you ensure alignment between engineering, design, and marketing on a delayed product?",
      "Tell me about a time a critical dependency blocked your launch. How did you creatively bypass it?",
      "Describe a scenario where you deliberately launched a broken or imperfect feature to test a hypothesis.",
      "How do you differentiate your roadmap between table-stakes features and true market differentiators?",
      "Tell me about a time you had to redefine the target persona for an existing product.",
      "Walk me through your approach to conducting a brutally honest post-mortem after a launch."
    ],
    behavioral: [
      "Tell me about a time you had to influence a senior executive without having formal authority.",
      "Describe a situation where your engineering team told you a feature was impossible. How did you proceed?",
      "How do you handle a dominating stakeholder who demands a feature that does not align with your vision?",
      "Tell me about a time you lost an argument regarding the product roadmap.",
      "Describe an instance where you had to rapidly pivot the team's entire focus mid-sprint.",
      "How do you manage a situation where sales strongly over-promises a feature to land a massive client?",
      "Tell me about a time you had to resolve a deep conflict between design and engineering.",
      "What do you do when a highly vocal minority of users absolutely hates a new redesign?",
      "Describe your framework for communicating a painful roadmap delay to key customers.",
      "Tell me about a time you let your personal bias negatively influence a product decision."
    ]
  },
  "HR / General": {
    behavioral: [
      "Walk me through the most significant professional failure of your career and what it changed about you.",
      "Tell me about a difficult interpersonal conflict you had to navigate with a highly defensive colleague.",
      "Describe a time you had to rapidly adapt to a massive organizational or strategic shift.",
      "How do you handle a situation where you are overwhelmed, lack resources, and deadlines are non-negotiable?",
      "Tell me about a time you had to enforce a company policy that you strongly disagreed with.",
      "Describe a scenario where you identified a toxic element in your team's culture. What did you do?",
      "How do you build trust with a newly formed team that is highly resistant to your leadership?",
      "Tell me about a time you received completely unfair or inaccurate performance feedback.",
      "Describe a time you had to let go of a highly capable, but culturally detrimental, team member.",
      "How do you navigate a situation where your direct manager is the primary bottleneck to your success?",
      "Tell me about a time you successfully managed a severe crisis that threatened the company's reputation.",
      "Describe an instance where you had to make a high-stakes decision with only 50% of the information you needed.",
      "How do you handle a high-performing employee who is openly looking for other opportunities?",
      "Tell me about a time you took a massive calculated risk that ultimately did not pay off.",
      "Describe your approach to delivering highly critical, uncomfortable feedback to someone more senior than you.",
      "How do you effectively onboard a skeptical employee into a disorganized, chaotic team environment?",
      "Tell me about a time you successfully mediated a dispute between two highly valuable executives.",
      "Describe a situation where you had to champion diversity and inclusion in an environment that didn't value it.",
      "Walk me through your process of completely rebuilding a broken operational process.",
      "Why should we trust you to execute on the things you say you can do in this interview?"
    ]
  }
};

```


## backend/src/data/structuredDAQuestions.js

```javascript
export const structuredDAQuestions = [
  {
    "id": "DA001",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Tell me about a time your data analysis completely contradicted the team’s core assumption.",
    "average_answer": "I found data that showed our new feature wasn't working. I told the team and we stopped working on it.",
    "strong_answer": "Marketing assumed a massive spike in Q3 signups was due to a new ad campaign. My cohort analysis showed that while top-of-funnel grew, D7 retention for those users was near zero. Furthermore, the traffic origin was mostly automated bot networks. I didn't just send a chart; I built a presentation showing the ROI of the ad spend was deeply negative. It was a tough meeting, but I pre-aligned with the head of growth so I had support in the room. We paused the campaign and saved $40k/month.",
    "feedback_average": ["No depth on the analysis method", "No stakeholder management", "Passive communication"],
    "feedback_strong": ["Specific analysis named", "Showed courage in communication", "Managed stakeholders effectively", "Clear business impact"],
    "improved_answer": "I used cohort retention analysis to disprove a celebrated growth spike, identifying bot traffic. I carefully built a case, gained an executive ally beforehand, and delivered the hard news safely, saving significant ad spend.",
    "follow_up_questions": ["How do you handle a stakeholder who simply refuses to believe your data?", "What steps did you take to ensure your bot-traffic hypothesis was bulletproof?"],
    "traits_evaluated": ["analytical rigor", "courage", "stakeholder management"],
    "ideal_answer_framework": "The Assumption → The Analysis Method → The Counter-finding → Communication Strategy → Business Impact"
  },
  {
    "id": "DA002",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "How do you handle data anomalies or outliers that completely skew your reporting models?",
    "average_answer": "I usually just delete the outliers from the dataset so the average looks normal.",
    "strong_answer": "I never silently delete outliers. First, I identify the cause. Is it a tracking bug, fraud, or a legitimate whale user? If it's a tracking error, I filter it out but leave a documented CTE or comment in the SQL explaining the exclusion. If it's a legitimate edge case, like a massive enterprise client skewing overall revenue, I segment the reporting. I present the median instead of the mean, and show two views: 'Including Enterprise' and 'Excluding Enterprise' so the business understands the true distribution.",
    "feedback_average": ["Dangerous data practices", "No investigation", "Loses valuable business context"],
    "feedback_strong": ["Investigates root cause", "Uses medians appropriately", "Provides segmented context"],
    "improved_answer": "I investigate the root cause first. If it's an error, I document the exclusion. If it's legitimate, I segment the user base and switch from means to medians to provide an accurate business narrative.",
    "follow_up_questions": ["Can you give an example of an outlier that turned out to be a massive business opportunity?", "How do you automate outlier detection in a daily dashboard?"],
    "traits_evaluated": ["statistical integrity", "curiosity", "business acumen"],
    "ideal_answer_framework": "Root Cause Investigation → Statistical Adjustment (Median/Segmentation) → Transparent Documentation → Dual Reporting"
  },
  {
    "id": "DA003",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Describe a time you had to optimize a slow, resource-heavy SQL query. What was your approach?",
    "average_answer": "I had a query that took 10 minutes. I added an index and it ran faster.",
    "strong_answer": "A daily financial rollup query was timing out after 15 minutes, blocking morning reports. I ran EXPLAIN PLAN and found it was doing a full table scan on a 50M row table because of a function wrapped around a date column in the WHERE clause (e.g., DATE(created_at) = '2023-10-01'). I rewrote the condition to use a bounding range (created_at >= '2023-10-01' AND created_at < '2023-10-02') to hit the index, and replaced a massive subquery with a CTE to materialize temporary results. Execution dropped to 45 seconds.",
    "feedback_average": ["No debugging methodology", "No specific SQL concepts used", "Vague outcome"],
    "feedback_strong": ["Used EXPLAIN", "Identified sargable vs non-sargable conditions", "Used CTEs", "Clear performance win"],
    "improved_answer": "I used EXPLAIN PLAN to find bottlenecks, rewrote non-sargable WHERE clauses to utilize indexing, and factored out repeated subqueries into CTEs to drastically reduce execution time.",
    "follow_up_questions": ["What do you do if you optimize a query as much as possible but it's still too slow?", "How do you balance readability with performance when writing SQL?"],
    "traits_evaluated": ["sql proficiency", "performance tuning", "technical depth"],
    "ideal_answer_framework": "Identify Bottleneck (EXPLAIN) → Specific Optimization Technique → Structural Refactor → Measured Result"
  },
  {
    "id": "DA004",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "Describe an instance where you uncovered a critical tracking error in production. How did you fix the historical data?",
    "average_answer": "I noticed tracking was broken, so I told engineering. We couldn't fix the old data, so we just started tracking properly from that day on.",
    "strong_answer": "I found a bug where Android purchases weren't firing the 'checkout_complete' event, meaning our revenue dashboard under-reported by 30%. After collaborating with engineering to ship a hotfix for future events, I tackled the historical gap. I couldn't inject frontend events, so I wrote a Python script to backfill a proxy event table by joining raw Stripe success webhooks with our user session logs based on timestamps. I documented the proxy method clearly on the main dashboard so stakeholders understood the methodology.",
    "feedback_average": ["Gave up on historical data", "No cross-functional collaboration", "No proxy solving"],
    "feedback_strong": ["Cross-team collaboration", "Creative proxy joining", "Maintains trust via transparency"],
    "improved_answer": "I halted the bleeding with engineering, then creatively repaired the historical baseline by joining external payment system logs with internal session data, documenting the proxy solution for stakeholders.",
    "follow_up_questions": ["How did you rebuild trust with stakeholders who realized the dashboard had been wrong for months?", "At what point do you decide historical data is corrupted beyond repair?"],
    "traits_evaluated": ["data engineering", "problem solving", "stakeholder trust"],
    "ideal_answer_framework": "Identify Issue → Stop the Bleeding → Proxy/Backfill Historical → Transparent Communication"
  },
  {
    "id": "DA005",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "How do you communicate complex, counter-intuitive data insights to non-technical stakeholders?",
    "average_answer": "I try to use simple words and make a nice chart so they understand.",
    "strong_answer": "I focus on the business decision, not the math. I had to explain Simpson's Paradox to a sales team who thought conversion rates were up everywhere, when in fact, high-converting channels were shrinking. Instead of explaining the paradox statistically, I built a waterfall chart showing exactly how many dollars we lost due to channel mix shift. I always start with 'The Bottom Line,' support it with one visual, and keep the deep statistical methodology in an appendix.",
    "feedback_average": ["Too vague", "No framework for communication", "Lacks situational empathy"],
    "feedback_strong": ["Specific complex scenario", "Translates math into money", "Excellent presentation structuring (Bottom Line First)"],
    "improved_answer": "I abstract the statistics into business impact (usually dollars or time). I use the 'Bottom Line First' framework, provide a single intuitive visual like a waterfall chart, and bury the technical methodology in the appendix.",
    "follow_up_questions": ["Give an example of a visualization that failed to communicate your point.", "How do you prepare for a presentation where you know the audience will be hostile to the data?"],
    "traits_evaluated": ["communication", "business translation", "empathy"],
    "ideal_answer_framework": "The Complex Concept → Translation to Business Metric → Visualization Choice → Presentation Structure"
  },
  {
    "id": "DA006",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Tell me about a time stakeholders completely rejected your data-backed recommendations.",
    "average_answer": "I showed the executive team that we should kill a feature, but they wanted to keep it. I just accepted it because they are the bosses.",
    "strong_answer": "I presented an analysis showing our freemium tier had a negative LTV-to-CAC ratio and recommended ending it. The CEO rejected it, citing brand awareness. I realized I hadn't incorporated 'marketing value'. I went back, gathered organic referral data from freemium users, and reran the model. The freemium tier was still a loss leader, but not as severely. We compromised: we kept the tier but gated the most expensive compute features. I learned to always understand the stakeholder's unmeasured incentives.",
    "feedback_average": ["Resigned immediately", "No attempt to understand the 'why'", "No compromise"],
    "feedback_strong": ["Incorporated new context", "Iterated on the model", "Found a middle ground", "Learned about unspoken incentives"],
    "improved_answer": "When rejected, I dug deeper to understand the unspoken business incentives (like brand), incorporated those into my model, and returned with a compromised recommendation that satisfied both math and strategy.",
    "follow_up_questions": ["How do you differentiate between a stubborn stakeholder and a flawed analysis?", "What do you do if a stakeholder asks you to massage the data to support their preconceived idea?"],
    "traits_evaluated": ["resilience", "commercial awareness", "negotiation"],
    "ideal_answer_framework": "The Rejection → Uncovering Missing Context → Iterating the Model → Re-negotiating a Solution"
  },
  {
    "id": "DA007",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "How do you identify whether a metric change is a seasonal trend or a permanent behavioral shift?",
    "average_answer": "I look at last year's data and see if it looks similar.",
    "strong_answer": "I use a combination of Year-over-Year (YoY) benchmarking and cohort analysis. When our e-commerce engagement dropped in August, looking YoY showed August was always slow. However, I didn't stop there. I isolated the newest cohort of users acquired in July, and saw their retention curve was 15% steeper than the July cohort from the previous year. The overall volume drop was seasonal, but the specific retention degradation was a behavioral shift caused by a recent UI update. Separating aggregate trends from cohort behavior is critical.",
    "feedback_average": ["Too simplistic", "Misses internal composition changes", "Vague methodology"],
    "feedback_strong": ["Separation of aggregate from cohort", "Clear methodology", "Identifies hidden shifts within expected trends"],
    "improved_answer": "I don't just look at aggregate Year-over-Year drops; I isolate specific user cohorts to ensure an expected seasonal drop isn't masking a dangerous permanent behavioral shift in new users.",
    "follow_up_questions": ["What statistical methods do you use to smooth out highly volatile daily metrics?", "How do you explain 'cohort analysis' to a non-technical manager?"],
    "traits_evaluated": ["analytical depth", "cohort analysis", "nuance"],
    "ideal_answer_framework": "Initial YoY Check → Cohort Isolation → Identifying the Hidden Shift → Conclusion"
  },
  {
    "id": "DA008",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Describe your approach to designing a dashboard that executives will actually use and understand.",
    "average_answer": "I ask them what metrics they want and put them all on one page with clear labels.",
    "strong_answer": "Executive dashboards fail when they answer 'What' but not 'So what?'. I follow a 3-part hierarchy. Top row: 3-5 macro KPIs with green/red variance against targets. Middle row: The primary drivers of those KPIs (e.g., if Revenue is red, is it Volume or Pricing?). Bottom section: A dynamic text box where I write a weekly 3-bullet summary interpreting the data. If an exec only has 10 seconds, they read the summary. If they have 1 minute, they look at the colors. I never include exploratory tables on an exec dashboard.",
    "feedback_average": ["Too passive (order taking)", "No UX/UI philosophy", "Lacks business synthesis"],
    "feedback_strong": ["Clear visual hierarchy", "Focuses on variance and targets", "Includes narrative synthesis", "Understands executive time constraints"],
    "improved_answer": "I build with a strict 'What/Why/Narrative' hierarchy. Top-line variance, secondary drivers, and most importantly, a written summary synthesising the 'So What' for time-poor executives.",
    "follow_up_questions": ["How do you handle feature-creep when everyone wants their specific metric on the main dashboard?", "What tooling do you prefer for narrative-driven dashboards?"],
    "traits_evaluated": ["data visualization", "executive presence", "product sense for data"],
    "ideal_answer_framework": "The Flaw in Normal Dashboards → Visual Hierarchy → Inclusion of Narrative Syntheses → Boundary Setting"
  }
];

```


## backend/src/data/structuredHRQuestions.js

```javascript
export const structuredHRQuestions = [
  {
    "id": "IM001",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Tell me about yourself.",
    "average_answer": "I am a final-year engineering student interested in software development and problem-solving. I have worked on a few academic and personal projects and I enjoy learning new technologies.",
    "strong_answer": "I am a final-year engineering student with a strong interest in software development, especially building practical digital products. Over time, I have worked on projects involving web development and problem-solving, which helped me strengthen both my technical and communication skills. I enjoy solving real-world problems through technology, which is why I’m excited about opportunities like this.",
    "feedback_average": ["Decent introduction", "Needs more impact", "Could include one achievement"],
    "feedback_strong": ["Clear structure", "Professional tone", "Relevant positioning"],
    "improved_answer": "I am a final-year engineering student passionate about building useful software solutions. Through projects and hands-on learning, I have developed technical skills, problem-solving ability, and a strong interest in applying technology to real-world challenges.",
    "follow_up_questions": ["What project are you most proud of?", "What are your career goals?"],
    "traits_evaluated": ["clarity", "confidence", "relevance", "structure"],
    "ideal_answer_framework": "Present + Skills + Evidence + Fit"
  },
  {
    "id": "IM002",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Why should we hire you?",
    "average_answer": "I am hardworking, a quick learner, and I can contribute to the company with my skills.",
    "strong_answer": "You should hire me because I bring a combination of technical capability, adaptability, and a willingness to learn quickly. I take ownership of my work, I’m comfortable solving problems, and I’m motivated to contribute meaningfully while growing in a professional environment.",
    "feedback_average": ["Common answer", "Needs proof", "Too generic"],
    "feedback_strong": ["Value-oriented", "Balanced confidence", "Good professional framing"],
    "improved_answer": "I believe I would be a strong fit because I combine problem-solving ability, adaptability, and consistent execution. I can contribute with both technical effort and a learning mindset, which helps me add value while improving quickly.",
    "follow_up_questions": ["What specific value can you bring?", "Can you give an example of ownership?"],
    "traits_evaluated": ["confidence", "impact", "relevance"],
    "ideal_answer_framework": "Strength + Evidence + Value"
  },
  {
    "id": "IM003",
    "category": "HR",
    "difficulty": "Easy",
    "question": "What are your strengths?",
    "average_answer": "My strengths are problem-solving, adaptability, and hard work.",
    "strong_answer": "My key strengths are problem-solving, adaptability, and consistency. I’m comfortable learning new tools and approaches when needed, and I stay reliable in execution, which helps me perform well in both individual and team-based work.",
    "feedback_average": ["Good points", "Needs examples", "Slightly generic"],
    "feedback_strong": ["Specific", "Professional", "Well explained"],
    "improved_answer": "I would say my biggest strengths are problem-solving, adaptability, and consistency. These help me approach challenges calmly, learn quickly, and stay dependable in execution.",
    "follow_up_questions": ["Can you give an example of one strength?", "How has adaptability helped you?"],
    "traits_evaluated": ["clarity", "specificity", "confidence"],
    "ideal_answer_framework": "Strength + Explanation + Example"
  },
  {
    "id": "IM004",
    "category": "HR",
    "difficulty": "Medium",
    "question": "What are your weaknesses?",
    "average_answer": "Sometimes I overthink my work and spend extra time on details.",
    "strong_answer": "One weakness I’ve identified is that I can sometimes spend too much time trying to perfect a task. While attention to detail is useful, I realized it can affect speed, so I’ve been improving by setting time limits and prioritizing progress along with quality.",
    "feedback_average": ["Safe answer", "Needs action plan"],
    "feedback_strong": ["Self-aware", "Mature", "Shows improvement mindset"],
    "improved_answer": "A weakness I’ve been working on is over-focusing on perfection in some tasks. I’ve improved this by becoming more conscious of deadlines and prioritizing what matters most first.",
    "follow_up_questions": ["How are you improving this weakness?", "Has this ever affected a project?"],
    "traits_evaluated": ["self-awareness", "honesty", "maturity"],
    "ideal_answer_framework": "Weakness + Reflection + Improvement"
  },
  {
    "id": "IM005",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Where do you see yourself in 5 years?",
    "average_answer": "I want to be in a good position in the company and improve my skills.",
    "strong_answer": "In five years, I see myself as a skilled professional who has built strong domain expertise and contributed meaningfully to impactful projects. I also hope to take on greater responsibility and continue growing both technically and professionally.",
    "feedback_average": ["Acceptable", "Needs direction", "Too broad"],
    "feedback_strong": ["Ambitious but realistic", "Growth-oriented"],
    "improved_answer": "In five years, I want to be someone who has developed strong expertise, delivered meaningful work, and grown into a more responsible and dependable professional.",
    "follow_up_questions": ["What kind of skills do you want to build?", "Do you want leadership responsibilities?"],
    "traits_evaluated": ["vision", "clarity", "professional maturity"],
    "ideal_answer_framework": "Future Goal + Growth + Alignment"
  },
  {
    "id": "IM006",
    "category": "HR",
    "difficulty": "Medium",
    "question": "Why do you want to work here?",
    "average_answer": "I want to work here because your company provides good opportunities and growth.",
    "strong_answer": "I want to work here because this role offers a strong opportunity to apply my current skills while continuing to learn in a professional environment. I also value the kind of impactful and growth-oriented work your company is known for, which aligns with what I’m looking for early in my career.",
    "feedback_average": ["Good intent", "Needs personalization"],
    "feedback_strong": ["Shows alignment", "Professional and role-focused"],
    "improved_answer": "I’m interested in this opportunity because it seems like a place where I can both contribute and grow. I value learning, meaningful work, and environments where strong execution is appreciated.",
    "follow_up_questions": ["What do you know about our company?", "Why this role specifically?"],
    "traits_evaluated": ["motivation", "research", "relevance"],
    "ideal_answer_framework": "Company Fit + Role Fit + Motivation"
  },
  {
    "id": "IM007",
    "category": "HR",
    "difficulty": "Easy",
    "question": "What motivates you?",
    "average_answer": "I am motivated by learning and success.",
    "strong_answer": "I’m motivated by growth, problem-solving, and the feeling of making meaningful progress. I enjoy situations where I can learn, improve, and contribute to something that creates real value.",
    "feedback_average": ["Clear but generic", "Needs personality"],
    "feedback_strong": ["Good self-awareness", "Professional and authentic"],
    "improved_answer": "What motivates me most is growth through meaningful work. I enjoy learning, solving challenges, and seeing the results of consistent effort.",
    "follow_up_questions": ["What demotivates you?", "Can you give an example of meaningful work?"],
    "traits_evaluated": ["self-awareness", "authenticity", "clarity"],
    "ideal_answer_framework": "Motivator + Why + Work Relevance"
  },
  {
    "id": "IM008",
    "category": "HR",
    "difficulty": "Medium",
    "question": "Why did you choose your field?",
    "average_answer": "I chose this field because I was interested in technology from a young age.",
    "strong_answer": "I chose this field because it sits at the intersection of logical problem-solving and creative building. I enjoy diving into complex systems, figuring out how they work, and improving them, which makes this work engaging for me on a daily basis.",
    "feedback_average": ["A bit cliché", "Needs professional connection"],
    "feedback_strong": ["Genuine", "Highlights relevant work traits"],
    "improved_answer": "I chose this field because it allows me to combine analytical problem-solving with creative execution. I enjoy the process of breaking down complex problems and building efficient solutions.",
    "follow_up_questions": ["Can you give an example of a complex system you improved?", "What do you find most challenging about this field?"],
    "traits_evaluated": ["motivation", "passion", "alignment"],
    "ideal_answer_framework": "Origin + Core Interest + Value Alignment"
  }
];

```


## backend/src/data/structuredPMQuestions.js

```javascript
export const structuredPMQuestions = [
  {
    "id": "PM001",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Tell me about a time you had to prioritize competing, aggressive demands from multiple stakeholders.",
    "average_answer": "I had sales asking for one feature and marketing asking for another. I talked to both, put them in a spreadsheet, and prioritized based on impact.",
    "strong_answer": "Sales needed a custom integration for a massive client, while Support needed an internal tool fix to reduce ticket volume. Both escalated to the C-suite. I built a quick RICE matrix but mapped it explicitly to our OKR of reducing churn. I showed both teams that the Support tool fix saved 300 dev hours per quarter, allowing us to build the Sales integration the following month without halting core product work. Making the tradeoff quantitative de-escalated the emotional tension.",
    "feedback_average": ["No framework used", "No resolution outcome", "Stakeholders handled passively"],
    "feedback_strong": ["Clear framework (RICE)", "Tied to company OKRs", "Data de-escalated emotion"],
    "improved_answer": "I quantified the ROI of both requests against our core OKR, showed both teams the math, and found a sequencing compromise that satisfied the business goal rather than the loudest voice.",
    "follow_up_questions": ["What do you do if a stakeholder rejects your quantitative model?", "Have you ever made a prioritization decision you later regretted?"],
    "traits_evaluated": ["framework thinking", "stakeholder management", "strategic alignment"],
    "ideal_answer_framework": "Conflict Setup → Framework Applied → Alignment to OKRs → Communication Strategy → Outcome"
  },
  {
    "id": "PM002",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Describe a product feature launch that failed. How did you measure the failure and what was the pivot?",
    "average_answer": "We launched a new dashboard but users didn't like it. So we asked them what they wanted and changed it.",
    "strong_answer": "We launched a 'smart recommendations' feed expected to increase daily engagement by 15%. After 2 weeks, metrics showed a 2% drop in core workflow completion. I immediately ran a Mixpanel funnel analysis and saw users dropping off at the new feed. I paused the rollout, conducted 5 user interviews, and realized the feed caused cognitive overload. We pivoted the feed into an opt-in weekly digest email instead. Engagement recovered and the digest saw a 40% open rate.",
    "feedback_average": ["No quantitative measurement", "Vague failure reason", "No distinct pivot strategy"],
    "feedback_strong": ["Specific metrics named", "Fast identification", "Clear hypothesis testing", "Data-backed pivot"],
    "improved_answer": "I defined failure quantitatively, identified the drop-off funnel, validated the root cause with user interviews, stopped the rollout, and successfully pivoted the delivery mechanism.",
    "follow_up_questions": ["How do you differentiate between an adoption curve and a failed feature?", "How did you explain the failure to management?"],
    "traits_evaluated": ["data analysis", "adaptability", "accountability"],
    "ideal_answer_framework": "Hypothesis → Measurable Failure → Root Cause Diagnosis → Pivot → Outcome"
  },
  {
    "id": "PM003",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Walk me through precisely how you determine and measure success for a new product launch.",
    "average_answer": "I look at user adoption and see if people are actually using the feature.",
    "strong_answer": "I define success across three dimensions before writing a single line of code: Primary Metric (e.g., Conversion Rate), Secondary Metric (e.g., Time on Page), and a Counter Metric (e.g., Support Ticket Volume). I establish a baseline, set a conservative and stretch target, and instrument the tracking in Amplitude. After launch, I measure Day 1, Day 7, and Day 30 retention curves against those targets.",
    "feedback_average": ["No mention of counter metrics", "No baseline comparison", "No timelines"],
    "feedback_strong": ["Three-tiered metric approach", "Mentions counter metrics", "Time-bound measurement"],
    "improved_answer": "I establish a Primary metric, a Secondary metric, and a Counter metric beforehand. I log baselines, set targets, ensure instrumentation, and review at specific time intervals (D1, D7, D30).",
    "follow_up_questions": ["Can you give an example of a counter metric that saved a launch?", "What do you do if you hit your primary metric but the counter metric explodes?"],
    "traits_evaluated": ["analytical rigor", "product strategy", "metric design"],
    "ideal_answer_framework": "Metric Trio (Primary/Secondary/Counter) + Baseline + Instrumentation + Checkpoints"
  },
  {
    "id": "PM004",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "How do you decide when to kill a feature that users love but is technically unsustainable?",
    "average_answer": "If it breaks too much, I just turn it off and send an email to the users.",
    "strong_answer": "I experienced this with a legacy data export tool that 5% of highly vocal users loved, but caused 30% of our database load. First, I analyzed those users' core job-to-be-done. I realized they just needed a weekly CSV, not real-time query access. I proposed an asynchronous report generator as a replacement. I provided a 60-day sunset notice for the old tool, offered white-glove migration for the top 10 enterprise users, and shut it down. Load dropped 30% with zero churn.",
    "feedback_average": ["Abrupt", "Ignores user empathy", "No migration path"],
    "feedback_strong": ["Understands 'Job-to-be-done'", "Data-driven", "Managed the sunset gracefully"],
    "improved_answer": "I balance the technical cost against the business value, find alternative ways to solve the core user need, announce early, provide a migration path, and then sunset.",
    "follow_up_questions": ["What if a top paying customer threatens to churn if you kill the feature?", "Do you ever let engineering kill a feature without PM approval?"],
    "traits_evaluated": ["pragmatism", "user empathy", "hard decisions"],
    "ideal_answer_framework": "Cost/Benefit Analysis → Understand Core Need → Build Alternative → Sunset Plan → Outcome"
  },
  {
    "id": "PM005",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Tell me about a time you used purely qualitative user feedback to override a quantitative data trend.",
    "average_answer": "The data said a feature was doing well, but users told me they hated it, so we changed it.",
    "strong_answer": "Our A/B test for a mandatory onboarding flow showed a 20% increase in profile completions (a huge positive). However, I sat in on 5 user testing sessions, and observed profound frustration — users were clicking through rapidly just to 'get it over with' and entering fake data. The quantitative data looked like success; the qualitative data revealed toxic engagement. I overrode the test, made the flow skippable, and our 30-day retention increased by 8% even though Day 1 completion dropped.",
    "feedback_average": ["No nuance", "Vague data point", "No business outcome"],
    "feedback_strong": ["Excellent observation skills", "Understands 'toxic engagement'", "Proves instinct with long-term retention data"],
    "improved_answer": "I spotted 'toxic engagement' where quantitative metrics looked green but qualitative observation showed extreme user frustration. I trusted the user pain, pivoted, and improved long-term retention.",
    "follow_up_questions": ["How do you convince a data-driven executive to trust your qualitative finding?", "When is qualitative data dangerous to trust?"],
    "traits_evaluated": ["product sense", "user empathy", "metric skepticism"],
    "ideal_answer_framework": "Deceptive Metric + Qualitative Discovery + The Realizations + The Override Decision + Long-term Result"
  },
  {
    "id": "PM006",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Walk me through your approach to conducting a brutally honest post-mortem after a launch.",
    "average_answer": "I call a meeting, ask what went wrong, and write down notes for next time.",
    "strong_answer": "I enforce a blameless culture. I send a pre-read survey asking for 1 thing that went well and 2 that failed. During the meeting, we use the '5 Whys' technique for the biggest failure. For example, when a launch was delayed by 2 weeks, we traced it from 'design wasn't ready' down to 'PM didn't provide edge-case requirements before dev started'. I owned that failure publicly. The outcome of a post-mortem must be an automated or process change, not just a promise to 'do better'.",
    "feedback_average": ["No structure", "Places blame", "No actionable outcome"],
    "feedback_strong": ["Blameless culture", "Specific root-cause technique", "Sets actionable outcomes"],
    "improved_answer": "I use a blameless '5 Whys' structure, encourage pre-read data collection, own my portion of failures publicly, and mandate that outputs are process changes, not just promises.",
    "follow_up_questions": ["How do you handle an engineer who refuses to participate blamelessly?", "Can you give an example of a process change that came from a post-mortem?"],
    "traits_evaluated": ["leadership", "process improvement", "humility"],
    "ideal_answer_framework": "Blameless Setup + Pre-work + Framework (5 Whys) + Ownership + Concrete Process Output"
  },
  {
    "id": "PM007",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "How do you manage a situation where sales strongly over-promises a feature to land a massive client?",
    "average_answer": "I tell sales they can't do that and inform the client it won't be built.",
    "strong_answer": "First, I de-escalate. I meet with the Sales Director to understand the exact contract language. Then I talk to the client directly to understand their core underlying need — they didn't actually need real-time sync, they just needed a daily 8AM report. I negotiated with the client to deliver the daily report in 2 weeks, rather than throwing engineering into a 3-month fire drill. Finally, I instituted a formal 'deal desk' process with Sales to review technical commitments over $50k.",
    "feedback_average": ["Antagonistic to sales", "Inflexible", "Burns the client relationship"],
    "feedback_strong": ["Commercial awareness", "Finds the 'job to be done'", "Creates systemic prevention"],
    "improved_answer": "I intercept the requirement directly with the client to find the true underlying need, renegotiate a simpler technical solution, and establish a process with Sales to prevent future occurrences.",
    "follow_up_questions": ["What happens if the client refuses to budge on the complex feature?", "How do you maintain a good relationship with Sales while telling them no?"],
    "traits_evaluated": ["negotiation", "commercial awareness", "problem solving"],
    "ideal_answer_framework": "De-escalate → Uncover True Need → Negotiate Simplified Solution → Preventative Process"
  },
  {
    "id": "PM008",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Describe a situation where your engineering team told you a feature was impossible. How did you proceed?",
    "average_answer": "I asked them to try harder or compromised on what we could build.",
    "strong_answer": "Engineering told me real-time collaborative editing was impossible within our quarterly timeline. I scheduled a white-boarding session and asked, 'What part is impossible?' We realized conflict resolution was the timeline killer. I proposed a tradeoff: what if we implement field-level locking instead of true simultaneous typing? The user gets collision protection (the core need), and engineering said they could build that in 3 weeks. It was a massive success.",
    "feedback_average": ["No discovery of 'why'", "No creative negotiation", "Weak leadership"],
    "feedback_strong": ["Breaks down 'impossible'", "Partners with engineering", "Negotiates technical scope"],
    "improved_answer": "I drill down into exactly *which component* of the feature makes it impossible, identify the timeline killer, and propose a degraded scope that still solves the core user need.",
    "follow_up_questions": ["What if you can't find a degraded scope that works?", "How do you build trust with an engineering lead who defaults to 'impossible'?"],
    "traits_evaluated": ["technical communication", "scoping", "collaboration"],
    "ideal_answer_framework": "Dissect the Barrier → Identify the True Need → Propose Technical Compromise → Outcome"
  }
];

```


## backend/src/data/structuredSWEQuestions.js

```javascript
export const structuredSWEQuestions = [
  {
    "id": "SWE001",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
    "average_answer": "I once had to choose between a microservices and monolith approach. I went with microservices because it's more scalable.",
    "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team.",
    "feedback_average": ["Generic choice", "No pressure context", "Missing tradeoff reasoning"],
    "feedback_strong": ["Time-bound pressure shown", "Data-driven decision", "Documents outcome and tradeoffs"],
    "improved_answer": "Under deadline pressure, I evaluated two options, ran quick experiments, chose the lower-risk path based on data, and clearly communicated the tradeoffs and future plan to the team.",
    "follow_up_questions": ["What would you have done differently with more time?", "How did you validate the decision worked?"],
    "traits_evaluated": ["technical judgment", "pressure handling", "communication"],
    "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson"
  },
  {
    "id": "SWE002",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
    "average_answer": "I chose speed over perfection once to meet a deadline.",
    "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on.",
    "feedback_average": ["Too vague", "No category of tradeoff named", "Missing justification"],
    "feedback_strong": ["Clear tradeoff named", "Documented the debt", "Team-aware"],
    "improved_answer": "I explicitly chose delivery speed over scalability with a documented plan to refactor. I surfaced it as known debt immediately.",
    "follow_up_questions": ["Did you ever pay off that debt?", "How did the team react to the known compromise?"],
    "traits_evaluated": ["technical depth", "ownership", "communication"],
    "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan"
  },
  {
    "id": "SWE003",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Walk me through a time when a critical system failed in production. How did you diagnose and resolve it?",
    "average_answer": "Our server went down once. I restarted it and then found the bug in the logs.",
    "strong_answer": "Our payment processing degraded silently during peak traffic. I noticed via alert that success rates dropped 12%. I pulled logs, identified repeated DB timeout errors on a specific query, traced it to a missing index introduced in a recent migration, added the index via a hot-patch, and authored a post-mortem with a checklist to catch similar issues in CI. Downtime was under 8 minutes.",
    "feedback_average": ["No diagnosis process shown", "No measurable impact", "No prevention step"],
    "feedback_strong": ["Structured diagnosis", "Measurable impact", "Root cause + prevention"],
    "improved_answer": "I diagnosed using alerts + logs, found the root cause (missing index), patched it in under 8 minutes, then wrote a post-mortem with a clear prevention checklist.",
    "follow_up_questions": ["How did you prevent the same issue from recurring?", "How did you communicate the incident to stakeholders?"],
    "traits_evaluated": ["debugging", "calmness under pressure", "accountability"],
    "ideal_answer_framework": "Detection → Diagnosis → Fix → Prevention → Communication"
  },
  {
    "id": "SWE004",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
    "average_answer": "I write clean code and add comments.",
    "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound.",
    "feedback_average": ["Too surface-level", "Not team-scale", "No systematic approach"],
    "feedback_strong": ["Multi-layered strategy", "Team-aware", "Proactive, not reactive"],
    "improved_answer": "PR standards, ADRs, and explicit convention documentation — applied consistently so any new engineer can contribute confidently without tribal knowledge.",
    "follow_up_questions": ["How do you enforce standards without becoming a bottleneck?", "What happens when someone ignores your standards?"],
    "traits_evaluated": ["technical leadership", "scalability thinking", "team awareness"],
    "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management"
  },
  {
    "id": "SWE005",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about the most difficult bug you've ever tracked down. What was your methodology?",
    "average_answer": "I once debugged a race condition. I added logs and eventually found it.",
    "strong_answer": "A user-reported bug caused intermittent data duplication in our order system. Reproduction rate was ~3%, impossible to reproduce locally. I added structured logging to capture thread IDs and timestamps, replicated it in staging under load using JMeter, identified it as a race condition in our optimistic lock, and fixed it by switching to a pessimistic lock pattern with a clear explanation in the commit.",
    "feedback_average": ["No reproduction strategy", "No isolation technique", "No outcome/impact"],
    "feedback_strong": ["Systematic methodology", "Tools named", "Root cause + fix + documentation"],
    "improved_answer": "I isolate intermittent bugs with structured logging and load simulation, form a hypothesis, validate in staging, then fix with a clear commit explanation.",
    "follow_up_questions": ["How did you know the fix actually worked?", "Have you ever needed to fix a bug without being able to reproduce it?"],
    "traits_evaluated": ["debugging systematically", "persistence", "technical depth"],
    "ideal_answer_framework": "Reproduce → Isolate → Hypothesize → Validate Fix → Document"
  },
  {
    "id": "SWE006",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you decide when to build a feature from scratch versus using a third-party library?",
    "average_answer": "I check if there's a good library first. If not, I build it.",
    "strong_answer": "I evaluate on four axes: maintenance burden, security risk, customization needs, and licensing constraints. If a library covers 90%+ of what we need, has active maintenance, and doesn't introduce a critical dependency risk — I use it. If it's in a trust-critical area like auth or payments, I default to well-audited libraries. If the need is highly specific, I build.",
    "feedback_average": ["Too casual", "No framework given", "Missing risk analysis"],
    "feedback_strong": ["Clear evaluation criteria", "Risk-aware", "Domain-specific thinking"],
    "improved_answer": "I evaluate libraries on maintenance activity, security posture, customization ceiling, and licensing. Build-vs-buy changes by domain.",
    "follow_up_questions": ["When have you regretted using a library?", "How do you handle a dependency that becomes abandoned?"],
    "traits_evaluated": ["judgment", "risk thinking", "pragmatism"],
    "ideal_answer_framework": "Evaluation Criteria + Domain Risk + Decision + Example"
  },
  {
    "id": "SWE007",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Explain how you design an API that needs to support both internal and external consumers.",
    "average_answer": "I make a REST API and document it well.",
    "strong_answer": "I separate contracts from implementation. External APIs are versioned (e.g., /v1/), more conservatively designed with strict backward compatibility guarantees, rate limiting, and detailed error codes. Internal APIs are more permissive but documented via OpenAPI or similar. I also enforce consumer-driven contract testing so internal changes can't silently break external consumers.",
    "feedback_average": ["No versioning strategy", "No consumer differentiation", "No stability guarantees"],
    "feedback_strong": ["Separate contracts", "Versioning strategy", "Testing methodology"],
    "improved_answer": "External APIs are versioned, stable-contract-first, with rate limits. Internal APIs share the same implementation but with relaxed constraints and contract tests guarding shared boundaries.",
    "follow_up_questions": ["How do you deprecate an API version?", "What's the hardest API versioning problem you've faced?"],
    "traits_evaluated": ["API design", "consumer empathy", "maintainability"],
    "ideal_answer_framework": "External vs Internal Contract + Versioning + Consumer Tests + Error Design"
  },
  {
    "id": "SWE008",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Tell me about a time your project was blocked by another team. How did you unblock it?",
    "average_answer": "I messaged them and asked them to prioritize our request.",
    "strong_answer": "Our backend release was blocked on an auth dependency from Platform team. Instead of waiting, I met with their lead, understood their backlog constraints, offered to write the specification myself so they just needed to review and merge, and agreed on a 3-day turnaround. We also added a feature flag so we could develop in parallel. This approach turned a potential 2-week block into a 4-day one.",
    "feedback_average": ["Passive approach", "No creative solution", "No resolution timeline"],
    "feedback_strong": ["Proactive ownership", "Cross-team empathy", "Parallel workstream created"],
    "improved_answer": "I proactively reduced the other team's burden by doing prep work myself, proposed a parallel track, and aligned on a concrete timeline — turning a blocker into a minor delay.",
    "follow_up_questions": ["How do you avoid getting blocked by the same team again?", "How do you handle it when a team simply can't prioritize you?"],
    "traits_evaluated": ["cross-team collaboration", "ownership", "creative problem solving"],
    "ideal_answer_framework": "Blocker Identified → Empathy → Creative Unblock → Parallel Track → Outcome"
  },
  {
    "id": "SWE009",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Describe a time you had to take ownership of a failing project that you didn't start.",
    "average_answer": "I took over a project and fixed it. It was messy but I managed.",
    "strong_answer": "I inherited a 6-month-behind project with no documentation and failing CI. Week 1, I did a full codebase audit, interviewed the original engineers, and created a brutally honest status report. Week 2, I scoped a realistic recovery plan — cut scope by 40%, stabilized the test suite, and established weekly stakeholder syncs. We shipped 8 weeks later, 20% over original timeline, with proper documentation in place.",
    "feedback_average": ["No diagnosis process", "No scope/tradeoff discussion", "No outcome metric"],
    "feedback_strong": ["Structured takeover", "Scope trade", "Outcome with numbers"],
    "improved_answer": "I diagnosed the root state, created a transparent status report, renegotiated scope with stakeholders, stabilized infra, and shipped — prioritizing honest communication throughout.",
    "follow_up_questions": ["How did you deal with morale on a failing project?", "What would you never do again in that situation?"],
    "traits_evaluated": ["ownership", "leadership", "communication"],
    "ideal_answer_framework": "Audit → Honest Assessment → Scoped Recovery Plan → Communication Rhythm → Outcome"
  },
  {
    "id": "SWE010",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "How do you debug an intermittent performance issue that only happens under specific load conditions?",
    "average_answer": "I add logging and try to reproduce it locally.",
    "strong_answer": "Intermittent perf issues require systematic narrowing. I start by defining the observable symptom precisely — latency spike? Memory climb? CPU burst? Then I replicate the load condition in staging using tooling like k6 or Locust. I add distributed tracing spans to pinpoint the slow path, then profile at the component level. I form hypotheses based on prior patterns (N+1 queries, lock contention, GC pressure) and instrument specifically.",
    "feedback_average": ["Local-only reproduction is insufficient", "No tooling named", "No systematic hypothesis generation"],
    "feedback_strong": ["Precise symptom definition", "Load tooling named", "Hypothesis-driven approach"],
    "improved_answer": "Define symptom precisely → replicate load in staging → add distributed traces → profile at component level → form and test specific hypotheses.",
    "follow_up_questions": ["How do you know when you've fixed a load-only performance issue?", "What's your go-to first signal when a perf issue is reported?"],
    "traits_evaluated": ["debugging methodology", "tooling knowledge", "systematic thinking"],
    "ideal_answer_framework": "Define Symptom → Replicate → Instrument → Profile → Hypothesize → Validate"
  },
  {
    "id": "SWE011",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "What is the harshest piece of technical feedback you've ever received, and how did you change?",
    "average_answer": "Someone told me my code was hard to read. I started writing cleaner code.",
    "strong_answer": "A senior engineer told me my PRs were 'too large to meaningfully review — you're treating reviews as a formality.' That stung, but they were right. I started decomposing every feature into atomic commits, each independently reviewable with a clear description. My review cycle time dropped by 60% and I noticed teammates actually engaging more deeply with my PRs.",
    "feedback_average": ["Feedback not specific enough", "No behavioral change shown", "No measurable impact"],
    "feedback_strong": ["Specific harsh feedback", "Real behavior change", "Measurable result"],
    "improved_answer": "I received harsh, valid feedback, sat with it, made a specific behavioral change, and tracked the result — it became a habit.",
    "follow_up_questions": ["How do you distinguish harsh feedback that's valid vs. unfair?", "Have you ever given similarly harsh feedback to someone else?"],
    "traits_evaluated": ["growth mindset", "self-awareness", "professionalism"],
    "ideal_answer_framework": "Feedback (specific) + Initial Reaction + Behavioral Change + Measurable Outcome"
  },
  {
    "id": "SWE012",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Tell me about a time you completely misestimated a task. How did you recover?",
    "average_answer": "I underestimated a feature. I worked overtime to finish it.",
    "strong_answer": "I estimated a data migration at 3 days. At day 2.5, I was 30% done — severely underestimated the edge cases in the legacy data format. I immediately flagged to my manager, scoped a minimal viable migration to protect the deadline, deferred 4 edge cases with clear tickets and monitoring in place, and delivered the core on time. I then wrote a migration estimation checklist I still use.",
    "feedback_average": ["No proactive communication", "No partial delivery strategy", "No post-mortem"],
    "feedback_strong": ["Early escalation", "Scope negotiation", "Prevention artifact created"],
    "improved_answer": "When I realized the error early, I escalated immediately, negotiated a reduced deliverable, hit the core deadline, and turned the failure into a reusable estimation checklist.",
    "follow_up_questions": ["What would your estimation process look like now?", "How do you handle a teammate who consistently underestimates?"],
    "traits_evaluated": ["accountability", "planning", "communication"],
    "ideal_answer_framework": "Realize Early → Escalate → Reduce Scope Pragmatically → Deliver Core → Improve Process"
  },
  {
    "id": "SWE013",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about a time you inherited a massive, undocumented legacy codebase. Where did you start?",
    "average_answer": "I read through the code and asked people questions.",
    "strong_answer": "I started by running the tests that existed to understand what the system guaranteed. Then I traced the most frequently hit endpoints using logs. I built a dependency map by hand for the top 10 modules. Then I interviewed the two people with the most git blame and documented the implicit rules they held in their heads. Only then did I write code — and every PR I made added documentation as a first-class deliverable.",
    "feedback_average": ["No structured approach", "No documentation goal", "Too reactive"],
    "feedback_strong": ["Tests first", "Behavioral tracing", "Knowledge extraction from humans", "Documentation as deliverable"],
    "improved_answer": "Run tests → trace live traffic → map dependencies → extract tribal knowledge → document everything I touch.",
    "follow_up_questions": ["How long before you felt confident contributing?", "How did you handle parts of the code no one understood?"],
    "traits_evaluated": ["adaptability", "structured thinking", "knowledge management"],
    "ideal_answer_framework": "Tests → Trace → Map → Interview → Document Everything"
  },
  {
    "id": "SWE014",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you mentor junior engineers who are consistently missing edge cases in their code?",
    "average_answer": "I review their code carefully and give them feedback.",
    "strong_answer": "I shift the mindset rather than just flagging the bug. I pair with them on a specific feature, walk through my edge-case thought process out loud, and ask 'what happens if X is null? What if this is called twice?' Then I give them an exercise: take their last PR and write a list of every assumption it makes. Most engineers who do this correctly never repeat the same class of miss. I also add tests for the cases they missed so it becomes self-documenting.",
    "feedback_average": ["Reactive not formative", "No teaching methodology", "No long-term change"],
    "feedback_strong": ["Transfers thought process, not just answers", "Exercise-based learning", "Tests as documentation"],
    "improved_answer": "I teach the edge-case mindset via live pairing and exercises, not just flagging bugs — so the behavior changes, not just the one file.",
    "follow_up_questions": ["What do you do if a junior doesn't improve after your coaching?", "How do you balance mentoring with your own delivery?"],
    "traits_evaluated": ["mentorship", "communication", "patience"],
    "ideal_answer_framework": "Mindset Shift + Live Modeling + Exercise + Tests as Documentation"
  },
  {
    "id": "SWE015",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Walk me through your thought process when reviewing a pull request that introduces a significant risk.",
    "average_answer": "I check if the code looks right and leave comments on anything that seems wrong.",
    "strong_answer": "I start by reading the PR description and ticket to understand the intent, not just the diff. Then I review by category: correctness, security surface area, performance impact, test coverage, and rollback strategy. For risky PRs, I specifically ask: 'What's the blast radius if this breaks?' and 'Is there a feature flag?' I leave inline comments for small things and a top-level comment with my overall risk assessment and blockers vs. suggestions clearly separated.",
    "feedback_average": ["Only checks correctness", "No risk taxonomy", "No structured feedback format"],
    "feedback_strong": ["Intent-first reading", "Multi-axis risk review", "Structured feedback format", "Blast radius thinking"],
    "improved_answer": "I review intent first, then check correctness, security, perf, tests, and rollback strategy — separating blockers from suggestions and always naming the blast radius.",
    "follow_up_questions": ["How do you handle a disagreement with an author who pushes back on your review?", "When is a PR too risky to approve?"],
    "traits_evaluated": ["technical judgment", "code quality ownership", "communication"],
    "ideal_answer_framework": "Intent → Multi-Axis Review → Blast Radius → Structured Feedback (Blockers vs. Suggestions)"
  }
];

```


## client/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Neural Interviewer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Manrope:wght@500;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```


## client/package.json

```json
{
  "name": "neural-v3-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.34",
    "framer-motion": "^11.9.0",
    "lucide-react": "^0.368.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.27",
    "postcss": "^8.5.9",
    "tailwindcss": "^3.4.19",
    "vite": "^5.4.1"
  }
}

```


## client/postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```


## client/tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

```


## client/vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});

```


## client/src/App.jsx

```javascript
import { useEffect, useMemo, useState } from 'react';
import SetupPage from './pages/SetupPage.jsx';
import InterviewPage from './pages/InterviewPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import { createSession, endSession, fetchSession, submitAnswer } from './services/api.js';
import { loadLocalHistory, saveLocalHistory } from './lib/storage.js';

const initialDraft = {
  candidateName: 'Candidate',
  role: 'software-engineer',
  interviewMode: 'behavioral + technical',
  difficulty: 'medium',
  persona: 'calm-senior-interviewer',
  pressureMode: 'balanced',
  resumeText: '',
  jdText: ''
};

export default function App() {
  const [phase, setPhase] = useState('setup');
  const [draft, setDraft] = useState(initialDraft);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [localHistory, setLocalHistory] = useState(() => loadLocalHistory());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    saveLocalHistory(localHistory);
  }, [localHistory]);

  const transcript = session?.transcript || [];
  const latestAnalysis = transcript.at(-1)?.analysis || null;

  const summaryForDashboard = useMemo(() => {
    return session?.summary || localHistory.find((item) => item.id === session?.id)?.summary || null;
  }, [session, localHistory]);

  async function handleSelectHistory(item) {
    if (!item?.id) return;
    setBusy(true);
    setError('');
    try {
      const refreshedSession = await fetchSession(item.id);
      setSession(refreshedSession);
      setPhase('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to load session history');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartSession() {
    setBusy(true);
    setError('');
    try {
      const response = await createSession(draft);
      setSession(response.session);
      setCurrentQuestion(response.firstQuestion);
      setPhase('interview');
    } catch (err) {
      setError(err.message || 'Failed to start interview');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitAnswer(answer, responseSeconds) {
    if (!session?.id) return;
    setBusy(true);
    setError('');
    try {
      const result = await submitAnswer({ sessionId: session.id, answer, responseSeconds });
      const refreshedSession = await fetchSession(session.id);
      setSession(refreshedSession);
      setCurrentQuestion(result.nextQuestion);
      return result;
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function handleEndSession() {
    if (!session?.id) return;
    setBusy(true);
    setError('');
    try {
      const summary = await endSession(session.id);
      const refreshedSession = await fetchSession(session.id);
      setSession(refreshedSession);
      const record = {
        id: refreshedSession.id,
        createdAt: refreshedSession.createdAt,
        role: refreshedSession.role,
        interviewMode: refreshedSession.interviewMode,
        difficulty: refreshedSession.difficulty,
        summary
      };
      setLocalHistory((prev) => [record, ...prev.filter((item) => item.id !== record.id)]);
      setPhase('dashboard');
    } catch (err) {
      setError(err.message || 'Failed to end interview');
    } finally {
      setBusy(false);
    }
  }

  function handleRestart() {
    setSession(null);
    setCurrentQuestion('');
    setPhase('setup');
  }

  return (
    <div className="app-shell relative font-['Inter']">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.1),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.1),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.1),transparent_25%)] pointer-events-none z-[-1]" />
      
      <header className="topbar">
        <div>
          <p className="eyebrow text-cyan-300">Neural Interviewer AI</p>
          <h1 className="font-['Outfit'] font-black text-white">Full-Stack Simulation Engine</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => setPhase('setup')}>Setup</button>
          <button className="ghost-button" onClick={() => setPhase('dashboard')}>Dashboard</button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      {phase === 'setup' && (
        <SetupPage draft={draft} setDraft={setDraft} onStart={handleStartSession} localHistory={localHistory} busy={busy} />
      )}

      {phase === 'interview' && session && (
        <InterviewPage
          draft={draft}
          session={session}
          currentQuestion={currentQuestion}
          latestAnalysis={latestAnalysis}
          transcript={transcript}
          busy={busy}
          onSubmitAnswer={handleSubmitAnswer}
          onEndSession={handleEndSession}
        />
      )}

      {phase === 'dashboard' && (
        <DashboardPage session={session} summary={summaryForDashboard} history={localHistory} onRestart={handleRestart} onSelectHistory={handleSelectHistory} />
      )}
    </div>
  );
}

```


## client/src/main.jsx

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

```


## client/src/components/AnalysisPanel.jsx

```javascript
import { useState } from 'react';
import MetricCard from './MetricCard.jsx';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';

export default function AnalysisPanel({ analysis, questionMeta }) {
  const [showExpert, setShowExpert] = useState(false);

  if (!analysis) {
    return (
      <section className="panel border-cyan-500/10">
        <div className="panel-header">
           <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> Live AI Telemetry</h3>
        </div>
        <p className="muted text-sm">Answer a question to unlock neural scorecards, evidence, and coaching.</p>
        
        {/* Shimmer state matching our v2 aesthetic */}
        <div className="mt-4 space-y-3">
           <div className="h-10 bg-white/5 rounded-xl animate-pulse"></div>
           <div className="h-20 bg-white/5 rounded-xl animate-pulse"></div>
        </div>
      </section>
    );
  }

  const { metrics, strengths, weaknesses, improvements, evidence, missingPoints, rewrite } = analysis;

  return (
    <section className="panel border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.05)]">
      <div className="panel-header">
        <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> AI Evaluation</h3>
      </div>
      
      <div className="metric-grid compact mb-5">
        <MetricCard label="Overall" value={`${metrics?.overall || 0}/10`} tone="highlight text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
        <MetricCard label="Confidence" value={`${metrics?.confidence || 0}/10`} tone="border-white/10" />
        <MetricCard label="Structure" value={`${metrics?.structure || 0}/10`} tone="border-white/10" />
        <MetricCard label="Specificity" value={`${metrics?.specificity || 0}/10`} tone="border-white/10" />
      </div>

      {questionMeta && (
         <div className="mb-5 rounded-xl border border-violet-500/30 overflow-hidden bg-black/40 text-sm">
            <button 
               onClick={() => setShowExpert(!showExpert)} 
               className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition"
            >
               <span className="font-bold text-violet-300 flex items-center gap-2">Expert Database Insight</span>
               {showExpert ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            
            {showExpert && (
               <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                  <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Framework</div>
                     <div className="p-2 bg-white/5 rounded border border-white/10 font-mono text-cyan-300 text-xs">
                        {questionMeta.ideal_answer_framework}
                     </div>
                  </div>
                  <div>
                     <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Testing For</div>
                     <div className="flex flex-wrap gap-1.5">
                        {questionMeta.keywords && questionMeta.keywords.map((k, i) => (
                           <span key={i} className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{k}</span>
                        ))}
                     </div>
                  </div>
               </div>
            )}
         </div>
      )}

      <div className="two-col-list mb-5 text-sm">
        <div>
          <h4 className="flex items-center gap-1 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Strengths</h4>
          <ul className="text-slate-300 space-y-1 mt-2">{(strengths||[]).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h4 className="flex items-center gap-1 text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Weaknesses</h4>
          <ul className="text-slate-300 space-y-1 mt-2">{(weaknesses||[]).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      
      {missingPoints?.length > 0 && (
         <div className="stack-list mb-5 text-sm">
           <h4 className="text-amber-400 mb-2">Critical Misses</h4>
           <ul className="text-slate-300 space-y-1">
              {missingPoints.map((item) => <li key={item}>{item}</li>)}
           </ul>
         </div>
      )}

      {rewrite && (
         <div className="rounded-xl border border-white/5 bg-white/5 p-4 mt-4 shadow-inner">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Perfect Answer Example</div>
            <p className="text-sm text-cyan-100 italic leading-relaxed">"{rewrite}"</p>
         </div>
      )}
    </section>
  );
}

```


## client/src/components/AnswerComposer.jsx

```javascript
import { Mic, Square, CornerDownLeft, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function AnswerComposer({ transcript, isListening, onStartListening, onStopListening, onSubmit, onClear, busy, remainingSeconds }) {
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState('');

  const activeText = manualMode ? manualText : transcript;

  function handleSubmit() {
    if (!activeText.trim()) return;
    onSubmit(activeText);
    if (manualMode) setManualText('');
  }

  return (
    <section className="panel p-0 overflow-hidden flex flex-col h-72 border-cyan-500/30">
      <div className="flex bg-black/40 border-b border-white/5 border-t-0 p-2">
         <button className={`px-4 py-2 text-sm font-semibold rounded-lg flex-1 ${!manualMode ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'}`} onClick={() => setManualMode(false)}>Speech Mode</button>
         <button className={`px-4 py-2 text-sm font-semibold rounded-lg flex-1 ${manualMode ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'}`} onClick={() => setManualMode(true)}>Text Mode (Debug)</button>
      </div>

      <div className="flex-1 relative bg-black/20 p-4 font-mono text-sm overflow-y-auto">
         {activeText ? (
            <p className="text-slate-200 leading-relaxed">{activeText}</p>
         ) : (
            <p className="text-slate-600 italic mt-8 text-center">{manualMode ? "Type your response here..." : "Turn on the mic and speak your response..."}</p>
         )}
         
         {!manualMode && isListening && (
            <div className="absolute bottom-4 right-4 flex items-center gap-2 text-cyan-400 text-xs animate-pulse bg-cyan-900/40 px-3 py-1 rounded-full border border-cyan-500/30">
               <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
               capturing voice
            </div>
         )}
      </div>

      <div className="p-4 bg-black/40 border-t border-white/10 flex items-center gap-3">
         {!manualMode ? (
            isListening ? (
               <button className="glow-btn bg-rose-600 border-rose-400 shadow-[0_0_15px_rgba(225,29,72,0.4)] grow" onClick={onStopListening}>
                 <Square size={16} /> Stop Recording
               </button>
            ) : (
               <button className="glow-btn grow" onClick={onStartListening} disabled={busy || remainingSeconds === 0}>
                 <Mic size={16} /> Start Recording
               </button>
            )
         ) : (
            <div className="flex-1 flex gap-2">
               <input type="text" className="input-field py-2" placeholder="Force text response..." value={manualText} onChange={e => setManualText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
         )}
         
         <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 transition shrink-0" onClick={onClear} title="Clear">
            <XCircle size={18} />
         </button>
         
         <button className="glow-btn px-6 shrink-0 border-emerald-400 bg-emerald-600 shadow-[0_0_15px_rgba(52,211,153,0.3)] disabled:opacity-50" onClick={handleSubmit} disabled={busy || !activeText.trim()}>
            {busy ? 'Evaluating...' : <><CornerDownLeft size={16} /> Submit</>}
         </button>
      </div>
    </section>
  );
}

```


## client/src/components/InterviewerStage.jsx

```javascript
import { useMemo } from 'react';

export default function InterviewerStage({ interviewer, persona, currentQuestion, followUpText, pressureScore, mood, isSpeaking }) {
  const avatarVisuals = useMemo(() => {
     if (persona === 'strict-panelist') return { color: '#f43f5e', shadow: 'rgba(244,63,94,0.4)', form: 'rounded-sm' };
     if (persona === 'startup-founder') return { color: '#f59e0b', shadow: 'rgba(245,158,11,0.4)', form: 'rounded-[2rem]' };
     if (persona === 'friendly-recruiter') return { color: '#10b981', shadow: 'rgba(16,185,129,0.4)', form: 'rounded-[3rem]' };
     return { color: '#22d3ee', shadow: 'rgba(34,211,238,0.4)', form: 'rounded-full' };
  }, [persona]);

  const activeColor = mood === 'listening' ? '#a855f7' : avatarVisuals.color;
  const activeShadow = mood === 'listening' ? 'rgba(168,85,247,0.5)' : avatarVisuals.shadow;

  return (
    <section className="flex flex-col items-center justify-center p-8 bg-black/20 border border-white/5 rounded-2xl relative min-h-[250px]">
      <div className="absolute top-4 left-4">
         <div className="text-xs font-bold uppercase tracking-widest text-slate-400">{interviewer?.title || 'Interviewer'}</div>
         <div className="text-sm font-medium text-white">{interviewer?.name || 'AI System'}</div>
      </div>
      
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
         <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pressure Level</div>
         <div className="flex gap-1 h-3">
             {[...Array(10)].map((_, i) => (
                <div 
                   key={i} 
                   className="w-1.5 rounded-full transition-colors" 
                   style={{ backgroundColor: (pressureScore / 10) > i ? (i > 7 ? '#f43f5e' : i > 4 ? '#f59e0b' : '#10b981') : 'rgba(255,255,255,0.1)' }}
                ></div>
             ))}
         </div>
      </div>

      <div className="relative mt-4">
        {isSpeaking && (
           <div className={`absolute inset-[-20px] rounded-full animate-ping opacity-30`} style={{ backgroundColor: activeColor }} />
        )}
        <div 
           className={`w-32 h-32 flex items-center justify-center border-2 border-black overflow-hidden transition-all duration-700 ${avatarVisuals.form} ${isSpeaking ? 'scale-105' : 'scale-100'}`}
           style={{ 
              boxShadow: `0 0 ${isSpeaking ? '40px' : '15px'} ${activeShadow}`,
              background: `linear-gradient(135deg, ${activeColor}22, ${activeColor}66)`
           }}
        >
           <div className="w-16 h-16 rounded-full border border-white/30" style={{ backgroundColor: activeColor, opacity: mood === 'listening' ? 0.3 : 1 }}></div>
        </div>
      </div>
    </section>
  );
}

```


## client/src/components/MetricCard.jsx

```javascript
export default function MetricCard({ label, value, tone }) {
  return (
    <div className={`metric-card ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">{label}</p>
      <p className="font-['Outfit'] font-black text-2xl md:text-3xl">{value}</p>
    </div>
  );
}

```


## client/src/components/PresencePanel.jsx

```javascript
import { Eye, Focus, Smile, Camera } from 'lucide-react';
import MetricCard from './MetricCard.jsx';

export default function PresencePanel({ videoRef, metrics }) {
  return (
    <section className="panel border-purple-500/20">
      <div className="panel-header mb-3">
         <h3 className="flex items-center gap-2"><Camera size={18} className="text-purple-400" /> Physical Presence</h3>
      </div>
      
      {!metrics.cameraReady ? (
         <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-200 text-sm flex items-center justify-center mb-4">
            Camera starting... Give it 5 seconds.
         </div>
      ) : !metrics.faceVisible ? (
         <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm font-semibold flex items-center justify-center mb-4 animate-pulse uppercase tracking-wide">
            Face Lost. Re-center.
         </div>
      ) : null}

      <div className="relative rounded-xl overflow-hidden aspect-video bg-black/60 border border-white/5 shadow-inner mb-4">
        <video 
          ref={videoRef} 
          className={`w-full h-full object-cover transition-opacity duration-300 ${!metrics.faceVisible ? 'opacity-30 blur-sm' : 'opacity-80'}`} 
          muted 
          playsInline 
        />
        {metrics.faceVisible && (
           <div className="absolute inset-0 border border-emerald-500/40 rounded-xl pointer-events-none" />
        )}
      </div>

      <div className="metric-grid compact text-sm">
        <MetricCard label="Eye Contact" value={`${metrics.eyeContact}%`} tone={metrics.eyeContact > 70 ? 'text-emerald-400 border-white/10' : 'text-amber-400 border-white/10'} />
        <MetricCard label="Attention" value={`${metrics.attention}%`} tone="text-slate-200 border-white/10" />
        <MetricCard label="Micro-Smile" value={`${metrics.smile}%`} tone="text-purple-300 border-white/10" />
      </div>
    </section>
  );
}

```


## client/src/components/QuestionCard.jsx

```javascript
import { Volume2, Square, Clock } from 'lucide-react';

export default function QuestionCard({ question, persona, onSpeak, onStop, pressureScore, remainingSeconds, mood }) {
  // Compute color purely based on the live dynamic pressure score mapped safely between 0% and 100%
  const urgencyObj = {
     color: pressureScore > 75 ? 'text-rose-400' : pressureScore > 50 ? 'text-amber-400' : 'text-emerald-400',
     bg: pressureScore > 75 ? 'bg-rose-500/10 border-rose-500/30' : pressureScore > 50 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'
  };

  return (
    <section className={`panel relative overflow-hidden flex flex-col items-center text-center p-8 transition-colors duration-1000 ${urgencyObj.bg}`}>
       <div className="absolute top-0 w-full h-1 bg-white/5">
          <div className="h-full bg-cyan-500/50" style={{ width: `${(remainingSeconds / 90) * 100}%`, transition: 'width 1s linear' }} />
       </div>

       <div className="flex items-center gap-4 mb-6 mt-2">
          {mood === 'listening' ? null : (
             <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition" onClick={() => onSpeak(question)} title="Replay AI Voice">
                 <Volume2 size={18} />
             </button>
          )}
          <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition" onClick={onStop} title="Stop Audio">
              <Square size={18} />
          </button>
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 ${urgencyObj.color} bg-black/40 flex items-center gap-1.5`}>
             <Clock size={12} /> Live Question
          </div>
       </div>

      <h2 className="text-2xl md:text-3xl font-normal leading-relaxed text-slate-100 max-w-2xl">
         "{question}"
      </h2>
    </section>
  );
}

```


## client/src/components/TranscriptPanel.jsx

```javascript
import { BookOpen } from 'lucide-react';

export default function TranscriptPanel({ transcript }) {
  if (!transcript || transcript.length === 0) {
     return null;
  }

  return (
    <section className="panel flex-1 flex flex-col h-full max-h-[400px]">
      <div className="panel-header mb-2 shrink-0">
         <h3 className="flex items-center gap-2"><BookOpen size={18} className="text-slate-400" /> Log</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-sm leading-relaxed scrollbar-hide">
        {transcript.map((item, i) => (
          <div key={i} className="pb-3 border-b border-white/5 last:border-0 last:pb-0">
             <div className="text-[10px] font-bold text-slate-500 mb-1">Q{i + 1} ({item.responseSeconds}s) • {item.analysis?.metrics?.overall||0}/10</div>
             <div className="text-slate-300 font-medium mb-1 line-clamp-1 opacity-60">"{(item.question || '').substring(0, 50)}..."</div>
             <div className="text-slate-400 font-mono text-xs p-2 bg-black/40 rounded border border-white/5">"{item.answer}"</div>
          </div>
        ))}
      </div>
    </section>
  );
}

```


## client/src/hooks/usePresence.js

```javascript
import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

export function usePresence() {
  const videoRef = useRef(null);
  const [metrics, setMetrics] = useState({
    cameraReady: false,
    eyeContact: 0,
    posture: 0,
    attention: 0,
    smile: 0,
    faceVisible: false
  });

  const faceLandmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // Moving averages
  const smoothedRef = useRef({ eyeContact: 0, attention: 0, smile: 0 });

  useEffect(() => {
    let stream;
    
    async function initializeVision() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
        );
        faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });

        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setMetrics(prev => ({ ...prev, cameraReady: true, faceVisible: true }));
        predictFrame();
        
      } catch (err) {
        console.error("Vision Init Error:", err);
        setMetrics(prev => ({ ...prev, cameraReady: false, faceVisible: false }));
      }
    }

    function predictFrame() {
       if (!videoRef.current || !faceLandmarkerRef.current) return;
       
       let startTimeMs = performance.now();
       if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
          lastVideoTimeRef.current = videoRef.current.currentTime;
          
          try {
            const results = faceLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
            
            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
               const shapes = results.faceBlendshapes[0].categories;
               
               // Eye Contact roughly maps to looking forward (not looking away)
               const eyeLookOutVal = shapes.find(c => c.categoryName === 'eyeLookOutLeft')?.score || 0;
               const eyeLookInVal = shapes.find(c => c.categoryName === 'eyeLookInRight')?.score || 0;
               const rawEye = Math.max(0, 100 - ((eyeLookOutVal + eyeLookInVal)*200));

               // Smile
               const smileVal = shapes.find(c => c.categoryName === 'mouthSmileLeft')?.score || 0;
               const rawSmile = smileVal * 100;
               
               // Posture/Attention (rough proxy via presence)
               const rawAtt = 70 + (Math.random()*15); // Fallback for complex head-pose math absent here

               // Smooth them
               smoothedRef.current.eyeContact = smoothedRef.current.eyeContact * 0.8 + rawEye * 0.2;
               smoothedRef.current.smile = smoothedRef.current.smile * 0.8 + rawSmile * 0.2;
               smoothedRef.current.attention = smoothedRef.current.attention * 0.9 + rawAtt * 0.1;

               setMetrics({
                  cameraReady: true,
                  faceVisible: true,
                  eyeContact: Math.round(smoothedRef.current.eyeContact),
                  posture: Math.round(smoothedRef.current.attention), // Proxy
                  attention: Math.round(smoothedRef.current.attention),
                  smile: Math.round(smoothedRef.current.smile)
               });
            } else {
               setMetrics(prev => ({ ...prev, faceVisible: false }));
            }
          } catch (e) {
             // frame drop
          }
       }
       
       animationRef.current = requestAnimationFrame(predictFrame);
    }

    initializeVision();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  return { videoRef, metrics };
}

```


## client/src/hooks/useSpeech.js

```javascript
import { useEffect, useRef, useState } from 'react';

export function useSpeech(personaId) {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let interimTrans = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscriptRef.current += event.results[i][0].transcript;
          else interimTrans += event.results[i][0].transcript;
        }
        setTranscript(finalTranscriptRef.current + interimTrans);
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = (e) => {
         console.warn("Speech error:", e.error);
         setIsListening(false);
      };
    }
  }, []);

  const speak = (text) => {
    if (!text) return;
    synthRef.current.cancel();
    
    // Quick heuristic voice selection
    const voices = synthRef.current.getVoices();
    let selectedVoice = voices.find(v => v.lang.includes('en-GB')) || voices.find(v => v.lang.includes('en'));
    let rate = 1;
    let pitch = 1;
    
    if (personaId === 'friendly-recruiter') { pitch = 1.2; rate = 1.05; }
    if (personaId === 'strict-panelist') { pitch = 0.8; rate = 1.1; }
    if (personaId === 'startup-founder') { pitch = 1; rate = 1.2; }

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => synthRef.current.cancel();

  const startListening = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
    try {
       recognitionRef.current?.start();
       setIsListening(true);
    } catch(e) {} // already started
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const resetTranscript = () => {
    setTranscript('');
    finalTranscriptRef.current = '';
  };

  return { transcript, isListening, isSpeaking, speak, stopSpeaking, startListening, stopListening, resetTranscript };
}

```


## client/src/lib/storage.js

```javascript
const STORAGE_KEY = 'neural_v3_history';

export function loadLocalHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveLocalHistory(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

```


## client/src/pages/DashboardPage.jsx

```javascript
import { useMemo } from 'react';
import { Target, TrendingUp, History, Copy } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';

export default function DashboardPage({ session, summary, history, onRestart, onSelectHistory }) {
  if (!session && !summary && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
          <Target size={32} className="text-cyan-400" />
        </div>
        <h2 className="text-2xl mb-2 text-white">No interviews yet</h2>
        <p className="muted mb-8">Start your first simulation to generate your AI hiring package and analytics.</p>
        <button className="glow-btn px-8" onClick={onRestart}>Start Interview Setup</button>
      </div>
    );
  }

  const radarData = useMemo(() => {
    if (!summary?.averageMetrics) return [];
    return [
      { subject: 'Overall', A: summary.averageMetrics.overall * 10, fullMark: 100 },
      { subject: 'Relevance', A: summary.averageMetrics.relevance * 10, fullMark: 100 },
      { subject: 'Structure', A: summary.averageMetrics.structure * 10, fullMark: 100 },
      { subject: 'Specificity', A: summary.averageMetrics.specificity * 10, fullMark: 100 },
      { subject: 'Confidence', A: summary.averageMetrics.confidence * 10, fullMark: 100 }
    ];
  }, [summary]);

  const lineData = useMemo(() => {
    if (!session?.transcript) return [];
    return session.transcript.map((t, i) => ({
      name: `Q${i+1}`,
      score: (t.analysis?.metrics?.overall || 0) * 10,
      pressure: t.pressureScoreBefore || 50
    }));
  }, [session]);

  const copyToClipboard = () => {
    if (!summary) return;
    const txt = `Hire Recommendation: ${summary.recommendation}\nScore: ${summary.averageMetrics?.overall}/10\nStrengths: ${summary.strengths?.join(', ')}`;
    navigator.clipboard.writeText(txt);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white">Interview Dashboard</h1>
          <p className="muted">Analytics and hiring recommendations based on AI evaluation.</p>
        </div>
        <button className="glow-btn" onClick={onRestart}>New Simulation</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 flex flex-col gap-6">
          <section className="panel min-h-[300px]">
            <div className="panel-header">
              <h3 className="flex items-center gap-2"><TrendingUp size={18} className="text-purple-400" /> Performance Timeline</h3>
            </div>
            {lineData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="pressure" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">Not enough data points yet.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3 className="text-emerald-400">Hiring Packet</h3>
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition" onClick={copyToClipboard}>
                <Copy size={16} className="text-slate-300" />
              </button>
            </div>
            {summary ? (
              <div className="space-y-6">
                <div>
                  <div className="eyebrow text-slate-400">Final Verdict</div>
                  <p className="text-lg font-medium text-white">{summary.recommendation}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-emerald-400 text-sm mb-2 uppercase tracking-wide">Strengths</h4>
                    <ul className="stack-list text-sm">{(summary.strengths||[]).map(s => <li key={s}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-rose-400 text-sm mb-2 uppercase tracking-wide">Red Flags</h4>
                    <ul className="stack-list text-sm">{(summary.weaknesses||[]).map(w => <li key={w}>{w}</li>)}</ul>
                  </div>
                  <div>
                     <h4 className="text-amber-400 text-sm mb-2 uppercase tracking-wide">Missing Traits</h4>
                     <ul className="stack-list text-sm">{(summary.missingThemes||[]).map(m => <li key={m}>{m}</li>)}</ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">A session summary will appear here when an interview concludes.</div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="panel">
            <div className="panel-header">
              <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> Trait Radar</h3>
            </div>
            {radarData.length > 0 ? (
              <div className="h-56 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name="Candidate" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500">Not enough data points yet.</div>
            )}
            {summary && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                    <div className="text-2xl font-black text-cyan-300 mb-1">{summary.averageMetrics?.overall}/10</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Total Score</div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                    <div className="text-2xl font-black text-white mb-1">{summary.averageMetrics?.structure}/10</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Structure</div>
                 </div>
              </div>
            )}
          </section>

          <section className="panel flex-1">
            <div className="panel-header border-none pb-0">
               <h3 className="flex items-center gap-2"><History size={18} className="text-slate-400" /> Past Submissions</h3>
            </div>
            <div className="mt-4 space-y-3">
               {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No history yet.</p>
               ) : history.slice(0, 3).map((item, i) => (
                  <div key={i} onClick={() => onSelectHistory?.(item)} className="p-3 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition flex items-center justify-between">
                     <div>
                        <div className="font-medium text-sm text-white capitalize">{item.role.replace('-', ' ')}</div>
                        <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</div>
                     </div>
                     <div className="font-black text-cyan-300">
                        {item.summary?.averageMetrics?.overall}/10
                     </div>
                  </div>
               ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

```


## client/src/pages/InterviewPage.jsx

```javascript
import { useEffect, useMemo, useState } from 'react';
import QuestionCard from '../components/QuestionCard.jsx';
import AnswerComposer from '../components/AnswerComposer.jsx';
import AnalysisPanel from '../components/AnalysisPanel.jsx';
import PresencePanel from '../components/PresencePanel.jsx';
import TranscriptPanel from '../components/TranscriptPanel.jsx';
import InterviewerStage from '../components/InterviewerStage.jsx';
import { useSpeech } from '../hooks/useSpeech.js';
import { usePresence } from '../hooks/usePresence.js';

const ANSWER_TIME = 90;

export default function InterviewPage({ draft, session, currentQuestion, latestAnalysis, transcript, onSubmitAnswer, onEndSession, busy }) {
  const { transcript: speechTranscript, isListening, isSpeaking, speak, stopSpeaking, startListening, stopListening, resetTranscript } = useSpeech(draft.persona);
  const { videoRef, metrics } = usePresence();
  const [followUpText, setFollowUpText] = useState('');
  const [mood, setMood] = useState('neutral');
  const [remainingSeconds, setRemainingSeconds] = useState(ANSWER_TIME);
  const [startedAt, setStartedAt] = useState(Date.now());

  useEffect(() => {
    if (currentQuestion) {
      setFollowUpText('');
      setMood('neutral');
      setRemainingSeconds(ANSWER_TIME);
      setStartedAt(Date.now());
      speak(`${session?.interviewer?.intro || `Hello ${draft.candidateName}.`} ${currentQuestion}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isListening) setMood('listening');
    else if (!isSpeaking && mood === 'listening') setMood('neutral');
  }, [isListening, isSpeaking, mood]);

  async function handleSubmit(answer) {
    const responseSeconds = Math.max(5, Math.round((Date.now() - startedAt) / 1000));
    const result = await onSubmitAnswer(answer, responseSeconds);
    setMood(result.interviewerMood || 'neutral');
    if (result.followUp) {
      setFollowUpText(result.followUp);
      speak(result.followUp);
    }
  }

  const pressureScore = useMemo(() => session?.pressureScore || 50, [session]);
  const latestMeta = transcript.at(-1)?.questionMeta || null;

  return (
    <main className="layout interview-immersive">
      <section className="immersive-main">
        <InterviewerStage
          interviewer={session?.interviewer}
          persona={draft.persona}
          currentQuestion={currentQuestion}
          followUpText={followUpText}
          pressureScore={pressureScore}
          mood={mood}
          isSpeaking={isSpeaking}
        />

        <QuestionCard
          question={currentQuestion}
          persona={draft.persona}
          onSpeak={speak}
          onStop={stopSpeaking}
          pressureScore={pressureScore}
          remainingSeconds={remainingSeconds}
          mood={mood}
        />

        {followUpText ? (
          <section className="panel accent-panel border-rose-500/30 bg-rose-500/5">
            <div className="panel-header"><h3 className="text-rose-400">Pressure follow-up</h3></div>
            <p className="text-lg">{followUpText}</p>
          </section>
        ) : null}

        <AnswerComposer
          transcript={speechTranscript}
          isListening={isListening}
          onStartListening={startListening}
          onStopListening={stopListening}
          onSubmit={handleSubmit}
          onClear={resetTranscript}
          busy={busy}
          remainingSeconds={remainingSeconds}
        />

        <button className="danger-button" onClick={onEndSession}>End interview & view dashboard</button>
      </section>

      <section className="immersive-side">
        <PresencePanel videoRef={videoRef} metrics={metrics} />
        <AnalysisPanel analysis={latestAnalysis} questionMeta={latestMeta} />
        <TranscriptPanel transcript={transcript} />
      </section>
    </main>
  );
}

```


## client/src/pages/SetupPage.jsx

```javascript
import { Bot, Settings2 } from 'lucide-react';

export default function SetupPage({ draft, setDraft, onStart, busy }) {
  const personas = [
    { id: 'calm-senior-interviewer', label: 'Senior Interviewer (Calm, Detail-oriented)' },
    { id: 'friendly-recruiter', label: 'Talent Partner (Warm, Encouraging)' },
    { id: 'strict-panelist', label: 'Technical Panelist (Sharp, Direct)' },
    { id: 'startup-founder', label: 'Startup Founder (Fast, Outcome-focused)' }
  ];

  return (
    <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-8">
        <h2 className="text-3xl mb-3 text-white">Configure Your Engine</h2>
        <p className="muted text-lg max-w-lg mx-auto">Set up the parameters for the AI simulation. The persona and difficulty will instantly shift the pressure score logic dynamically via the session Engine.</p>
      </div>

      <section className="panel mb-6">
        <div className="panel-header">
           <h3 className="flex items-center gap-2"><Settings2 size={18} className="text-purple-400"/> Session Parameters</h3>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Candidate Name</label>
              <input 
                type="text" 
                className="input-field" 
                value={draft.candidateName} 
                onChange={e => setDraft({...draft, candidateName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Target Role</label>
              <select 
                className="select-field" 
                value={draft.role} 
                onChange={e => setDraft({...draft, role: e.target.value})}
              >
                <option value="software-engineer">Software Engineer</option>
                <option value="product-manager">Product Manager</option>
                <option value="data-analyst">Data Analyst</option>
                <option value="hr-general">HR / General</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Difficulty Base</label>
              <select className="select-field" value={draft.difficulty} onChange={e => setDraft({...draft, difficulty: e.target.value})}>
                <option value="easy">Easy / Entry-level</option>
                <option value="medium">Medium / Mid-level</option>
                <option value="hard">Hard / Senior</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Pressure Mode</label>
              <select className="select-field" value={draft.pressureMode} onChange={e => setDraft({...draft, pressureMode: e.target.value})}>
                <option value="balanced">Balanced</option>
                <option value="high-pressure">High Pressure (Stress Test)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="panel mb-8">
         <div className="panel-header">
            <h3 className="flex items-center gap-2"><Bot size={18} className="text-cyan-400"/> AI Persona Select</h3>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {personas.map(p => (
               <button 
                 key={p.id}
                 onClick={() => setDraft({...draft, persona: p.id})}
                 className={`p-4 rounded-xl border text-left transition-all ${draft.persona === p.id ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5'}`}
               >
                  <div className={`font-bold mb-1 ${draft.persona === p.id ? 'text-cyan-300' : 'text-slate-200'}`}>
                     {p.label.split(' (')[0]}
                  </div>
                  <div className="text-xs text-slate-400">
                     ({p.label.split('(')[1]}
                  </div>
               </button>
            ))}
         </div>
      </section>

      <button className="glow-btn w-full py-4 text-lg" onClick={onStart} disabled={busy}>
        {busy ? 'Booting Engine...' : 'Initialize Simulation'}
      </button>
    </div>
  );
}

```


## client/src/services/api.js

```javascript
const BASE_URL = '/api/interview';

async function fetcher(endpoint, options = {}) {
  const res = await window.fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  if (!res.ok) {
    const errObj = await res.json().catch(() => ({}));
    throw new Error(errObj.error || `API Error: ${res.status}`);
  }
  return res.json();
}

export function createSession(payload) {
  return fetcher('/start', { method: 'POST', body: JSON.stringify(payload) });
}

export function fetchSession(sessionId) {
  return fetcher(`/sessions/${sessionId}`);
}

export function submitAnswer(payload) {
  return fetcher('/answer', { method: 'POST', body: JSON.stringify(payload) });
}

export function endSession(sessionId) {
  return fetcher('/end', { method: 'POST', body: JSON.stringify({ sessionId }) });
}

```


## client/src/styles/global.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-950 text-slate-100 font-sans antialiased overflow-x-hidden;
    margin: 0;
  }
}

@layer components {
  /* Layouts */
  .app-shell {
    @apply min-h-screen flex flex-col pt-16 px-4 md:px-8 pb-10 max-w-7xl mx-auto;
  }
  .layout {
    @apply flex-1 flex flex-col lg:flex-row gap-6 mt-6;
  }
  .topbar {
    @apply fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-50;
  }
  .topbar-actions {
    @apply flex items-center gap-3;
  }
  .immersive-main {
    @apply flex-1 flex flex-col gap-6 max-w-3xl xl:max-w-4xl w-full mx-auto;
  }
  .immersive-side {
    @apply w-full lg:w-80 xl:w-96 flex flex-col gap-6 shrink-0;
  }
  .panel {
    @apply bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-2xl;
  }
  .panel-header {
    @apply flex items-center justify-between mb-4 pb-3 border-b border-white/10;
  }
  .panel-header h3 {
    @apply font-['Outfit'] font-bold tracking-wide text-white;
  }

  /* Typography */
  h1, h2, h3, h4 { @apply font-['Outfit'] font-bold; }
  h1 { @apply text-2xl md:text-3xl; }
  .eyebrow { @apply text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-70; }
  .muted { @apply text-slate-400 leading-relaxed; }

  /* Buttons & Inputs */
  .glow-btn {
    @apply relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all overflow-hidden bg-cyan-600 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_0_25px_rgba(34,211,238,0.6)] active:translate-y-0;
  }
  .ghost-button {
    @apply px-4 py-2 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors;
  }
  .danger-button {
    @apply w-full py-3 rounded-xl font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors;
  }
  .input-field {
    @apply w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors;
  }
  .select-field {
    @apply w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors appearance-none cursor-pointer;
  }

  /* Cards */
  .metric-card {
    @apply p-4 rounded-xl border bg-black/20 flex flex-col items-center justify-center text-center;
  }
  .metric-grid {
    @apply grid grid-cols-2 md:grid-cols-4 gap-3;
  }
  .metric-grid.compact {
    @apply grid-cols-2 gap-2;
  }

  /* Lists */
  .two-col-list { @apply grid grid-cols-1 md:grid-cols-2 gap-6; }
  .stack-list ul { @apply space-y-3; }
  .two-col-list li, .stack-list li {
    @apply relative pl-5 before:absolute before:left-0 before:top-2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-white/20;
  }
}

```


## interviewmirror-client/.gitignore

```plaintext
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

```


## interviewmirror-client/eslint.config.js

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])

```


## interviewmirror-client/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>interviewmirror-client</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

```


## interviewmirror-client/package.json

```json
{
  "name": "interviewmirror-client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@mediapipe/tasks-vision": "^0.10.34",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.7.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@eslint/js": "^9.39.4",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.4.27",
    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.4.0",
    "postcss": "^8.5.8",
    "tailwindcss": "^3.4.17",
    "vite": "^8.0.1"
  }
}

```


## interviewmirror-client/postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```


## interviewmirror-client/README.md

```plaintext
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

```


## interviewmirror-client/tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
```


## interviewmirror-client/vite.config.js

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})

```


## interviewmirror-client/src/App.css

```css
/* Custom Utilities for InterviewMirror AI */

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glow-btn {
  position: relative;
  overflow: hidden;
}

.glow-btn::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transform: skewX(-20deg);
  transition: all 0.5s ease;
}

.glow-btn:hover::before {
  left: 150%;
}

/* Skeleton Loading Animation */
@keyframes shimmer {
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
}

.skeleton-text {
  background: linear-gradient(to right, #ffffff0a 4%, #ffffff15 25%, #ffffff0a 36%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite linear;
}

/* Base scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

```


## interviewmirror-client/src/App.jsx

```javascript
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Bot, ShieldCheck, Sparkles, ArrowRight, Loader2, RefreshCw, CheckCircle, Settings, X, ChevronRight } from "lucide-react";

import useFaceTracking from "./hooks/useFaceTracking";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { STAGES } from "./hooks/useInterviewFlow";
import useInterviewController from "./hooks/useInterviewController";

import { PresencePanel } from "./components/PresencePanel";
import { RecruiterScorecard } from "./components/RecruiterScorecard";
import { InterviewFlow as InterviewStage } from "./components/InterviewFlow";
import { FollowUpStage } from "./components/FollowUpStage";
import { SessionSummary } from "./components/SessionSummary";
import { InterviewerAvatar } from "./components/InterviewerAvatar";

const interviewerProfiles = {
  "Software Engineer": { name: "Mira", title: "Senior Technical Interviewer", intro: "Hi, I’m Mira. Let's do a couple rounds of technical questions. Focus on clarity, tradeoffs, and impact." },
  "Product Manager": { name: "Ava", title: "Lead Product Interviewer", intro: "Hi, I’m Ava. We will go through a few product scenarios." },
  "Data Analyst": { name: "Arin", title: "Senior Analytics Interviewer", intro: "Hi, I’m Arin. I’ll assess how clearly you think, structure insights, and communicate over these rounds." },
  "HR / General": { name: "Nexa", title: "Behavioral Interview Coach", intro: "Hi, I’m Nexa. Let's walk through a few behavioral scenarios together." },
};

const roleOptions = ["Software Engineer", "Product Manager", "Data Analyst", "HR / General"];
const difficultyOptions = ["Easy", "Medium", "Hard"];
const roundOptions = [1, 2, 3, 4, 5];

export default function App() {
  return (
    <div className="min-h-screen bg-[#060816] text-white overflow-x-hidden relative font-['Inter']">
      <BackgroundGlow />
      <Navbar />
      <Hero />
      <DemoSection />
    </div>
  );
}

function BackgroundGlow() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(34,211,238,0.15),transparent_22%),radial-gradient(circle_at_85%_10%,rgba(168,85,247,0.18),transparent_25%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.14),transparent_25%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:42px_42px] opacity-10 pointer-events-none" />
    </>
  );
}

function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-10 max-w-7xl mx-auto px-4 pt-6"
    >
      <div className="rounded-2xl glass-panel px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.3)]">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight font-['Outfit']">InterviewMirror AI</h1>
            <p className="text-xs text-slate-300">Interview Performance Intelligence</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-3 text-sm text-slate-300">
          <ShieldCheck size={16} className="text-emerald-300" />
          Privacy-first • Voice • Vision • AI
        </div>
      </div>
    </motion.nav>
  );
}

function Hero() {
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 pt-20 pb-14 text-center">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 mb-6">
          <Sparkles size={15} /> AI-Powered Interview Session Engine
        </div>
        <h2 className="text-4xl md:text-6xl font-[900] leading-tight max-w-5xl mx-auto font-['Outfit']">
          Pass the pressure test.
          <br />
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 bg-clip-text text-transparent">
            Survive the complete loop.
          </span>
        </h2>
        <p className="mt-6 text-lg text-slate-300 max-w-3xl mx-auto leading-8 font-light">
          Simulate an unbroken interview lifecycle. Face multiple rounds, handle challenging follow-ups dynamically chosen by AI, and receive a comprehensive recruiter packet.
        </p>
      </motion.div>
    </section>
  );
}

function DemoSection() {
  const [role, setRole] = useState("Software Engineer");
  const [difficulty, setDifficulty] = useState("Medium");
  const [rounds, setRounds] = useState(3);
  
  const interviewer = interviewerProfiles[role];
  
  const {
    stage,
    currentRound,
    maxRounds,
    results,
    nextActionDetails,
    summary: overallSessionSummary,
    question: currentQuestion,
    questionMeta,
    answer: currentAnswer,
    setAnswer: setCurrentAnswer,
    isProcessing,
    interviewerStatus,
    setIsListening,
    startSession,
    submitAnswer,
    skipFollowUp,
    retryFollowUp,
    nextRound,
    triggerSummary,
    resetInterview,
    speakText
  } = useInterviewController({ interviewerIntro: interviewer.intro });

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const presenceMetrics = useFaceTracking(videoRef);
  const { isListening, startListening, stopListening } = useSpeechRecognition();

  // Sync listening state to controller for avatar
  useEffect(() => {
    setIsListening(isListening);
  }, [isListening, setIsListening]);

  useEffect(() => {
    return () => {
      stopCamera();
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStartSession = async () => {
    await startSession({ role, type: "Technical", difficulty, rounds });
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      stopCamera();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
  };

  const baseAnswerRef = useRef("");
  const handleStartMic = () => {
    baseAnswerRef.current = currentAnswer;
    startListening((text) => setCurrentAnswer((baseAnswerRef.current ? baseAnswerRef.current + " " : "") + text));
  };


  return (
    <section id="demo" className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
      <div className="grid xl:grid-cols-[380px_1fr] gap-8">
        
        {/* Left Sidebar */}
        <motion.aside initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
          <div className="rounded-3xl glass-panel p-5 shadow-[0_0_50px_rgba(0,0,0,0.2)] relative h-fit flex flex-col">
            {stage !== STAGES.IDLE && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden rounded-t-3xl">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-700 glow-btn" 
                  style={{ width: `${(Math.min(currentRound, maxRounds) / maxRounds) * 100}%` }} 
                />
              </div>
            )}

            <div className="mt-1">
              <InterviewerAvatar
                name={interviewer.name}
                title={interviewer.title}
                status={interviewerStatus}
                avatarUrl="/ai-avatar.png"
              />
            </div>

            {stage !== STAGES.IDLE && (
              <div className="mt-5 rounded-xl bg-black/20 border border-white/5 py-3 px-4 flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Session Tracker</span>
                <span className="font-bold text-cyan-300 tracking-wider">Round {Math.min(currentRound, maxRounds)} / {maxRounds}</span>
              </div>
            )}

            <AnimatePresence>
              {stage === STAGES.IDLE && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold tracking-widest uppercase">
                      <Settings size={14} /> Configuration
                    </div>
                    
                    <div>
                      <label className="text-sm text-slate-300 block mb-1">Interview Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                      >
                        {roleOptions.map((item) => (
                          <option key={item} value={item} className="bg-[#0b1020]">{item}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-slate-300 block mb-1">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                        >
                          {difficultyOptions.map((item) => (
                            <option key={item} value={item} className="bg-[#0b1020]">{item}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 block mb-1">Rounds</label>
                        <select
                          value={rounds}
                          onChange={(e) => setRounds(parseInt(e.target.value))}
                          className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-cyan-400/40 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23cbd5e1%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-[right_1rem_center] bg-no-repeat"
                        >
                          {roundOptions.map((item) => (
                            <option key={item} value={item} className="bg-[#0b1020]">{item} {item === 1 ? 'Round' : 'Rounds'}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={handleStartSession}
                      disabled={isProcessing}
                      className="w-full rounded-2xl px-4 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold tracking-wide hover:opacity-95 transition glow-btn shadow-[0_0_35px_rgba(59,130,246,0.25)] flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      {isProcessing ? <Loader2 className="animate-spin" size={18} /> : "Initialize Loop"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <PresencePanel
            videoRef={videoRef}
            cameraOn={cameraOn}
            toggleCamera={toggleCamera}
            isListening={isListening}
            startListening={handleStartMic}
            stopListening={stopListening}
            presenceMetrics={presenceMetrics}
          />
        </motion.aside>

        {/* Right Main Content */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {stage === STAGES.IDLE && (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex flex-col items-center justify-center mb-6 shadow-inset">
                  <Bot size={36} className="text-slate-500" />
                </div>
                <h3 className="text-3xl font-[800] mb-3 font-['Outfit']">Ready to Start</h3>
                <p className="text-slate-400 max-w-md leading-relaxed text-sm">Configure your parameters on the left and click "Initialize Loop" to generate a stateful simulation. The AI engine will dynamically assess responses in real-time.</p>
              </motion.div>
            )}

            {stage === STAGES.INTRO && (
              <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-cyan-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Connecting Context Engine</h3>
                <p className="text-slate-400 max-w-md text-sm">Synchronizing profiles and fetching structured evaluation frameworks...</p>
              </motion.div>
            )}

            {stage === STAGES.QUESTION && (
              <InterviewStage
                key="question"
                question={currentQuestion}
                questionMeta={questionMeta}
                interviewer={interviewer}
                speakText={speakText}
                answer={currentAnswer}
                setAnswer={setCurrentAnswer}
                onSubmit={() => submitAnswer({ presenceMetrics })}
              />
            )}

            {stage === STAGES.ROUTING && (
              <motion.div key="routing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-violet-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Analyzing Node...</h3>
                <p className="text-slate-400 max-w-md text-sm">Deploying decision matrix to route towards challenge follow-ups or next-round advancement.</p>
              </motion.div>
            )}

            {stage === STAGES.FOLLOWUP && (
              <FollowUpStage
                key="followup"
                followUpQuestion={nextActionDetails.followUpQuestion}
                questionMeta={questionMeta}
                speakText={speakText}
                answer={currentAnswer}
                setAnswer={setCurrentAnswer}
                onSubmit={() => submitAnswer({ presenceMetrics })}
                onSkip={() => skipFollowUp({ presenceMetrics })}
                onRetry={retryFollowUp}
              />
            )}

            {stage === STAGES.ANALYSIS && !results && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="flex gap-2 justify-center mb-6">
                   <div className="w-1.5 h-12 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></div>
                   <div className="w-1.5 h-16 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_150ms]"></div>
                   <div className="w-1.5 h-10 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite_300ms]"></div>
                </div>
                <h3 className="text-2xl font-bold mb-2">Grading Transcript...</h3>
                <p className="text-slate-400 max-w-md text-sm">Extracting competencies, identifying structural gaps, and mapping against ideal frameworks.</p>
              </motion.div>
            )}

            {stage === STAGES.ANALYSIS && results && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <RecruiterScorecard results={results} questionMeta={questionMeta} />
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={() => (nextActionDetails.nextAction === "summary" ? triggerSummary() : nextRound())}
                    disabled={isProcessing}
                    className="rounded-2xl px-8 py-4 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold hover:opacity-95 transition glow-btn shadow-[0_0_35px_rgba(59,130,246,0.3)] flex justify-center items-center gap-2 disabled:opacity-50 group"
                  >
                    <span className="relative z-10 flex gap-2 items-center tracking-wide">
                      {isProcessing ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : nextActionDetails.nextAction === "summary" ? (
                        <>Generate Final Packet <CheckCircle size={18} /></>
                      ) : (
                        <>Advance to Round {currentRound + 1} <ChevronRight size={18} /></>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            )}

            {stage === STAGES.SUMMARY && !overallSessionSummary && (
              <motion.div key="summary-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="rounded-3xl glass-panel p-10 text-center flex flex-col items-center justify-center min-h-[500px]">
                <Loader2 size={48} className="animate-spin text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Synthesizing Final Packet</h3>
                <p className="text-slate-400 max-w-md text-sm">Calculating multi-round aggregate metrics to arrive at a final hiring decision.</p>
              </motion.div>
            )}

            {stage === STAGES.SUMMARY && overallSessionSummary && (
              <motion.div key="summary-done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SessionSummary summary={overallSessionSummary} />
                <div className="mt-8 flex gap-4 justify-end">
                  <button
                    onClick={resetInterview}
                    className="rounded-2xl px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <RefreshCw size={16} /> Return to Config
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
```


## interviewmirror-client/src/index.css

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
  background: #060816;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

button,
select,
textarea {
  font: inherit;
}
```


## interviewmirror-client/src/main.jsx

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```


## interviewmirror-client/src/components/FollowUpStage.jsx

```javascript
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquareText, Volume2, BarChart3, RefreshCw, FastForward, Clock } from "lucide-react";

export function FollowUpStage({
  followUpQuestion,
  questionMeta,
  speakText,
  answer,
  setAnswer,
  onSubmit,
  onSkip, 
  onRetry, 
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const words = followUpQuestion ? followUpQuestion.split(" ") : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18 }}
      className="flex flex-col gap-6"
    >
      <div className="rounded-3xl border border-violet-500/20 bg-violet-500/5 backdrop-blur-xl p-6 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 shrink-0">
          <div className="rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold px-3 py-1.5 uppercase tracking-widest border border-violet-500/30 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></div> Active Pressure Test
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-violet-300 font-semibold tracking-wide uppercase mb-3 pr-40">
          <MessageSquareText size={16} />
          Challenge Follow-up
        </div>
        
        <div className="rounded-2xl border border-violet-400/20 bg-black/40 p-6 mb-5 min-h-[100px]">
          <p className="text-xl text-slate-100 leading-relaxed font-medium">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="inline-block mr-1.5"
              >
                {word}
              </motion.span>
            ))}
            {!followUpQuestion && "Thinking of a follow-up..."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-between items-center">
          <button
            onClick={() => speakText(followUpQuestion)}
            className="rounded-xl px-4 py-2 bg-white/8 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-medium"
          >
            <Volume2 size={16} />
            Read Aloud
          </button>
          
          {questionMeta && questionMeta.traits_evaluated && (
             <div className="flex items-center gap-2 text-xs text-slate-400">
                Testing: 
                <span className="flex gap-1.5">
                  {questionMeta.traits_evaluated.map((trait, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-black/40 border border-white/5">{trait}</span>
                  ))}
                </span>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl glass-panel p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold font-['Outfit']">Your Rebuttal</h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <div className="flex items-center gap-1.5 w-16"><Clock size={12} className="text-violet-400" /> {formatTime(seconds)}</div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="w-16 text-right"><span className={answer.length > 200 ? "text-emerald-400" : ""}>{answer.length}</span> chars</div>
          </div>
        </div>
        
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Stay specific, calm, and coherent under pressure..."
          className="w-full min-h-[160px] rounded-2xl bg-black/50 border border-white/10 px-5 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-violet-400/40 resize-none text-[15px] leading-relaxed transition-all shadow-inner"
        />
        
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className="rounded-2xl px-4 py-2.5 bg-black/40 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm text-slate-300 font-medium"
            >
              <RefreshCw size={14} />
              Reset Answer
            </button>
            <button
              onClick={onSkip}
              className="rounded-2xl px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition flex items-center gap-2 text-sm text-rose-300 font-medium"
            >
              <FastForward size={14} />
              Bypass Follow-up
            </button>
          </div>

          <button
            onClick={onSubmit}
            disabled={!answer.trim()}
            className="rounded-2xl px-6 py-3 bg-gradient-to-r from-violet-600 to-emerald-500 font-bold tracking-wide hover:opacity-95 transition flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 glow-btn"
          >
            <BarChart3 size={18} /> Grade Response
          </button>
        </div>
      </div>
    </motion.section>
  );
}

```


## interviewmirror-client/src/components/InterviewerAvatar.jsx

```javascript
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";

const statusStyles = {
  Speaking: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]",
  Listening: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
  Thinking: "bg-violet-500/15 text-violet-300 border-violet-400/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]",
  Waiting: "bg-slate-500/15 text-slate-300 border-slate-300/20",
};

export function InterviewerAvatar({ 
  name, 
  title, 
  status, 
  avatarUrl,
  embedUrl,
  mode = "image" // "embed" | "image" | "fallback"
}) {
  const [imgError, setImgError] = useState(false);

  // Determine actual render mode based on fallbacks
  let renderMode = mode;
  if (renderMode === "embed" && !embedUrl) renderMode = "image";
  if (renderMode === "image" && (!avatarUrl || imgError)) renderMode = "fallback";

  return (
    <div className="relative group overflow-hidden rounded-2xl border border-white/10 bg-[#060816] shadow-xl">
      {/* Animated Glow Border */}
      <motion.div
        className="absolute inset-0 z-0 rounded-2xl pointer-events-none"
        animate={
          status === "Speaking" ? { boxShadow: "inset 0 0 50px rgba(34, 211, 238, 0.4)" } :
          status === "Thinking" ? { boxShadow: "inset 0 0 30px rgba(168, 85, 247, 0.2)" } :
          status === "Listening" ? { boxShadow: "inset 0 0 30px rgba(16, 185, 129, 0.2)" } :
          { boxShadow: "inset 0 0 0px rgba(0,0,0,0)" }
        }
        transition={{ duration: 1.5, repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
      />

      <div className="relative z-10 w-full h-[240px] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0b1020] to-[#040610]">
        {/* Background Ambient Glow */}
        {status === "Speaking" && (
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-cyan-400/20 blur-3xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        
        {renderMode === "embed" ? (
          <motion.div 
             className="absolute inset-0 w-full h-full opacity-90 pointer-events-none"
             animate={status === "Speaking" ? { scale: 1.03 } : { scale: 1 }}
             transition={{ duration: 3, ease: "easeInOut", repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
          >
            <iframe
              src={embedUrl}
              title={`${name} Avatar Embed`}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture; autoplay"
            />
          </motion.div>
        ) : renderMode === "image" ? (
          <motion.img
            src={avatarUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover object-top opacity-90"
            animate={status === "Speaking" ? { scale: 1.05 } : { scale: 1 }}
            transition={{ duration: 3, ease: "easeInOut", repeat: status === "Speaking" ? Infinity : 0, repeatType: "reverse" }}
            onError={() => setImgError(true)}
          />
        ) : (
          <motion.div
            animate={status === "Speaking" ? { scale: [1, 1.05, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="h-24 w-24 rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-400/30 border border-white/10 flex items-center justify-center backdrop-blur-md"
          >
            <Bot size={40} className="text-cyan-400/80" />
          </motion.div>
        )}
        
        {/* Dark gradient overlay for text readability at the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#060816] via-[#060816]/50 to-transparent pointer-events-none" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex items-end justify-between pointer-events-none">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            {name}
            {status === "Speaking" && (
              <span className="flex gap-[3px] items-center ml-1">
                <span className="w-1 h-2.5 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1 h-4 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1 h-3 bg-cyan-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]" style={{ animationDelay: '300ms' }}></span>
              </span>
            )}
            {status === "Listening" && (
              <span className="flex gap-[3px] items-center ml-1 opacity-70">
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
                <span className="w-1 h-2 bg-emerald-400 rounded-full"></span>
              </span>
            )}
          </h2>
          <p className="text-xs font-medium text-slate-300 mt-1">{title}</p>
        </div>

        <div className={`px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-wider font-bold transition-colors duration-300 ${statusStyles[status] || statusStyles.Waiting}`}>
          {status}
        </div>
      </div>
    </div>
  );
}

```


## interviewmirror-client/src/components/InterviewFlow.jsx

```javascript
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, Volume2, ArrowRight, Clock, Target, CheckCircle2 } from "lucide-react";

export function InterviewFlow({
  question,
  questionMeta,
  interviewer,
  speakText,
  answer,
  setAnswer,
  onSubmit, 
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const words = question ? question.split(" ") : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -18 }}
      className="flex flex-col gap-6"
    >
      <div className="rounded-3xl glass-panel p-6 shadow-[0_0_50px_rgba(0,0,0,0.18)]">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-2 text-sm text-cyan-300 font-semibold tracking-wide uppercase">
             <MessageSquareText size={16} />
             Core Domain Challenge
           </div>
           {questionMeta && questionMeta.difficulty && (
              <div className={`text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full border ${questionMeta.difficulty === 'Hard' ? 'text-rose-400 border-rose-400/30 bg-rose-400/10' : questionMeta.difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10'}`}>
                 {questionMeta.difficulty}
              </div>
           )}
        </div>
        
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6 mb-5 min-h-[100px]">
          <p className="text-xl text-slate-100 leading-relaxed font-medium">
            {words.map((word, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="inline-block mr-1.5"
              >
                {word}
              </motion.span>
            ))}
            {!question && "Generating question..."}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <button
            onClick={() => speakText(question || interviewer.intro)}
            className="rounded-xl px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center gap-2 text-sm font-medium"
          >
            <Volume2 size={16} />
            Read Aloud
          </button>
          
          {questionMeta && questionMeta.ideal_answer_framework && (
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <Target size={14} className="text-violet-400" />
                <span>Framework Hint: <strong className="text-slate-200 font-medium">{questionMeta.ideal_answer_framework.split(' + ')[0]}...</strong></span>
             </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl glass-panel p-6 relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold font-['Outfit']">Your Response</h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-400 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
             <div className="flex items-center gap-1.5 w-16"><Clock size={12} className="text-cyan-400" /> {formatTime(seconds)}</div>
             <div className="w-px h-3 bg-white/20"></div>
             <div className="w-16 text-right"><span className={answer.length > 500 ? "text-emerald-400" : ""}>{answer.length}</span> chars</div>
          </div>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Speak naturally using the mic, or type your answer here..."
          className="w-full min-h-[180px] rounded-2xl bg-black/40 border border-white/10 px-5 py-4 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-cyan-400/40 resize-none text-[15px] leading-relaxed transition-all shadow-inner"
        />
        <div className="mt-5 flex justify-end">
          <button
            onClick={onSubmit}
            disabled={!answer.trim()}
            className="rounded-2xl px-6 py-3.5 bg-gradient-to-r from-violet-600 to-cyan-500 font-bold tracking-wide hover:opacity-95 transition flex items-center gap-2 disabled:opacity-50 glow-btn"
          >
            Submit Answer <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.section>
  );
}

```


## interviewmirror-client/src/components/PresencePanel.jsx

```javascript
import React from "react";
import { User, Video, VideoOff, Mic, MicOff, Eye, Activity, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PresencePanel({
  videoRef,
  cameraOn,
  toggleCamera,
  isListening,
  startListening,
  stopListening,
  presenceMetrics,
}) {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="rounded-3xl glass-panel p-4 shrink-0 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-300 font-bold uppercase tracking-widest">
            <User size={16} />
            Focus Telemetry
          </div>
          <div
            className={`h-2.5 w-2.5 rounded-full ${cameraOn ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" : "bg-slate-500"}`}
          />
        </div>

        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0b1020] aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2 bg-black/40">
              <Video size={34} className="mb-2 opacity-50" />
              <span className="text-sm font-medium">Camera disabled</span>
            </div>
          )}
          
          <AnimatePresence>
            {cameraOn && !presenceMetrics?.faceDetected && (
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/20 backdrop-blur-[2px] text-rose-300 gap-2 border border-rose-500/30"
               >
                 <AlertTriangle size={34} className="animate-pulse" />
                 <span className="text-sm font-bold uppercase tracking-widest bg-black/40 px-3 py-1 rounded">Face lost</span>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={toggleCamera}
            className={`rounded-2xl px-4 py-3 border transition flex items-center justify-center gap-2 text-sm font-semibold ${
              cameraOn
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {cameraOn ? <VideoOff size={16} /> : <Video size={16} />}
            {cameraOn ? "Stop Cam" : "Start Cam"}
          </button>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`rounded-2xl px-4 py-3 border transition flex items-center justify-center gap-2 text-sm font-semibold ${
              isListening
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening ? "Listening..." : "Start Mic"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {cameraOn && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl glass-panel p-4 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              {/* Presence Score */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <Eye size={14} className="text-cyan-400 mb-2 group-hover:scale-110 transition" />
                <div className={`text-xl font-black font-mono ${presenceMetrics?.presenceScore < 60 ? 'text-rose-400' : 'text-slate-100'}`}>
                   {presenceMetrics?.presenceScore || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Score</div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <motion.div 
                     animate={{ width: `${presenceMetrics?.presenceScore || 0}%` }}
                     className={`h-full ${presenceMetrics?.presenceScore < 60 ? 'bg-rose-400' : 'bg-cyan-400'}`}
                  />
                </div>
              </div>

              {/* Centered % */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                <Activity size={14} className="text-violet-400 mb-2 group-hover:scale-110 transition" />
                <div className={`text-xl font-black font-mono ${presenceMetrics?.centeredPercent < 50 ? 'text-yellow-400' : 'text-slate-100'}`}>
                    {presenceMetrics?.centeredPercent || 0}%
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Centered</div>
                
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <motion.div 
                     animate={{ width: `${presenceMetrics?.centeredPercent || 0}%` }}
                     className="h-full bg-violet-400"
                  />
                </div>
              </div>
              
              {/* Blink Rate */}
              <div className="rounded-2xl bg-black/40 border border-white/5 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="flex items-center justify-center gap-1 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[ping_2s_infinite]"></div>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-[ping_2s_infinite_1s]"></div>
                </div>
                <div className="text-xl font-black font-mono text-slate-100">
                    {presenceMetrics?.blinkRate || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Blinks/m</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

```


## interviewmirror-client/src/components/RecruiterScorecard.jsx

```javascript
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Star, CheckCircle, AlertTriangle, Crosshair, Sparkles, Activity, ChevronDown, ChevronUp, Target } from "lucide-react";

const getScoreColor = (score) => {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-cyan-400";
  if (score >= 55) return "text-yellow-400";
  return "text-rose-400";
};

const getRiskColor = (risk) => {
  if (risk === "Low") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (risk === "Moderate") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
};

export function RecruiterScorecard({ results, questionMeta }) {
  const [showIdeal, setShowIdeal] = useState(false);

  if (!results) {
    return (
      <div className="mt-8 rounded-3xl glass-panel p-8 shadow-xl">
        <div className="w-full h-8 skeleton-text rounded mb-6 opacity-20"></div>
        <div className="w-full h-24 skeleton-text rounded mb-6 opacity-10"></div>
        <div className="grid grid-cols-3 gap-6">
           <div className="h-32 skeleton-text rounded opacity-10"></div>
           <div className="h-32 skeleton-text rounded opacity-10"></div>
           <div className="h-32 skeleton-text rounded opacity-10"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-3xl glass-panel shadow-[0_0_60px_rgba(0,0,0,0.4)] overflow-hidden"
    >
      <div className="border-b border-white/5 bg-white/[0.02] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="text-violet-400" size={24} />
          <h2 className="text-xl font-bold tracking-tight text-white font-['Outfit']">Round Scorecard</h2>
        </div>
        <div className={`px-4 py-1.5 flex items-center gap-2 rounded-full border text-sm font-bold tracking-wide uppercase ${getRiskColor(results.hiringRisk)}`}>
          {results.hiringRisk === "High" ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          Risk: {results.hiringRisk}
        </div>
      </div>

      <div className="p-6">
        <div className="mb-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="text-xs font-bold uppercase tracking-widest text-rose-400 mb-2 relative z-10">Recruiter Perception</div>
          <p className="text-lg text-rose-100 font-medium leading-relaxed relative z-10">
            "{results.recruiterPerception}"
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Crosshair size={14} className="text-cyan-400" /> Content
            </h3>
            <MetricRow label="Quality" score={results.answerQuality} />
            <MetricRow label="Structure" score={results.structure} />
            <MetricRow label="Specificity" score={results.specificity} />
            <MetricRow label="Role Fit" score={results.roleFit} />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Sparkles size={14} className="text-violet-400" /> Delivery
            </h3>
            <MetricRow label="Confidence" score={results.confidence} />
            <MetricRow label="Presence" score={results.presence} />
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2 border-b border-white/5 pb-2">
              <Activity size={14} className="text-emerald-400" /> Resilience
            </h3>
            <MetricRow label="Pressure Handing" score={results.pressureHandling} />
            <div className="pt-2">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-center shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,211,238,0.1)_50%,transparent_75%)] bg-[length:100%_100%] animate-[shimmer_2s_infinite]"></div>
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  transition={{ type: "spring", delay: 0.5 }}
                  className="text-4xl font-black text-cyan-400 mb-1 font-['Outfit'] relative z-10"
                >
                  {results.overall}
                </motion.div>
                <div className="text-[10px] text-cyan-200/80 uppercase tracking-widest font-bold relative z-10">Overall Score</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-inner">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-400" size={18} /> Critical Weaknesses
            </h4>
            <ul className="space-y-3">
              {(results.weaknesses || []).map((w, i) => (
                <li key={i} className="flex gap-3 text-slate-300 text-sm leading-relaxed">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-yellow-500/50 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/5 bg-black/20 p-5 shadow-inner flex flex-col gap-5">
            <div>
              <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                <Star className="text-cyan-400" size={18} /> Evaluator Advice
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">{results.improvement}</p>
            </div>
            {results.rewrite && (
              <div className="rounded-xl border border-white/5 bg-white/5 p-4 mt-auto">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Rewrite Example</div>
                <p className="text-sm text-cyan-100 italic leading-relaxed">"{results.rewrite}"</p>
              </div>
            )}
          </div>
        </div>

        {/* IDEAL ANSWER EXPERT PANEL */}
        {questionMeta && (
          <div className="mt-6 rounded-2xl border border-violet-500/30 overflow-hidden bg-black/40">
             <button 
                onClick={() => setShowIdeal(!showIdeal)} 
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition"
             >
                <div className="flex items-center gap-3">
                   <Target size={18} className="text-violet-400" />
                   <span className="font-bold text-white">Ideal Answer Framework & Traits</span>
                   <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30">Expert Database</span>
                </div>
                {showIdeal ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
             </button>
             
             <AnimatePresence>
                {showIdeal && (
                  <motion.div 
                     initial={{ height: 0, opacity: 0 }} 
                     animate={{ height: "auto", opacity: 1 }} 
                     exit={{ height: 0, opacity: 0 }}
                     className="px-5 pb-5 pt-2 border-t border-white/5 space-y-5"
                  >
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Structure Framework</div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-sm font-mono text-cyan-300 font-medium">
                           {questionMeta.ideal_answer_framework}
                        </div>
                     </div>
                     <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Targeted Traits</div>
                        <div className="flex flex-wrap gap-2">
                           {questionMeta.traits_evaluated && questionMeta.traits_evaluated.map((trait, i) => (
                             <span key={i} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{trait}</span>
                           ))}
                        </div>
                     </div>
                     {questionMeta.strong_answer && (
                       <div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">A++ Example Response</div>
                          <div className="p-4 bg-violet-500/5 rounded-xl border border-violet-500/10 text-sm text-slate-300 leading-relaxed italic relative">
                             <div className="absolute top-0 left-0 w-1 h-full bg-violet-500/50 rounded-tl-xl rounded-bl-xl"></div>
                             "{questionMeta.strong_answer}"
                          </div>
                       </div>
                     )}
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        )}

      </div>
    </motion.section>
  );
}

function MetricRow({ label, score }) {
  const safeScore = score || 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-300 font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-1.5 rounded-full bg-black/60 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${safeScore}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className={`h-full rounded-full ${safeScore >= 85 ? "bg-emerald-400" : safeScore >= 70 ? "bg-cyan-400" : safeScore >= 55 ? "bg-yellow-400" : "bg-rose-400"}`}
          />
        </div>
        <span className={`text-sm font-bold font-mono w-7 text-right ${getScoreColor(safeScore)}`}>
          {safeScore}
        </span>
      </div>
    </div>
  );
}

```


## interviewmirror-client/src/components/SessionSummary.jsx

```javascript
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Flag, Trophy, Target, AlertTriangle, Crosshair, Star, AlertCircle, FileText, Copy, Check } from "lucide-react";

const getDecisionColor = (decision) => {
  if (decision === "Hire") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.3)]";
  if (decision === "Borderline") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
  return "bg-rose-500/10 text-rose-400 border-rose-500/20";
};

// Simple pseudo-confetti array just using CSS
const ConfettiItem = ({ delay, left, color }) => (
  <div 
    className={`absolute w-3 h-3 rounded-sm ${color} animate-[confetti_3s_ease-out_forwards]`}
    style={{ left: `${left}%`, top: '-5%', animationDelay: `${delay}s`, opacity: 0 }}
  />
);

export function SessionSummary({ summary }) {
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (summary?.finalDecision === "Hire") {
      setShowConfetti(true);
    }
  }, [summary]);

  if (!summary) return null;

  const handleCopy = () => {
    const text = `
INTERVIEWMIRROR AI SESSION PACKET
Decision: ${summary.finalDecision}
Readiness Score: ${summary.overallReadiness}/100

-- RECRUITER IMPRESSION --
"${summary.recruiterImpression}"

-- KEY THEMES --
Best Answer: ${summary.bestAnswerSummary}
Top Strength: ${summary.topStrength}
Main Weakness: ${summary.mainWeakness}
Repeated Issue: ${summary.repeatedIssue}
Focus Area: ${summary.recommendedFocus}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confettiColors = ['bg-emerald-400', 'bg-cyan-400', 'bg-violet-400', 'bg-yellow-400'];

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mt-8 rounded-3xl glass-panel shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden relative"
    >
      {/* CSS animation for confetti injected here just for ease */}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(1000px) rotate(720deg); opacity: 0; }
        }
      `}</style>
      
      {showConfetti && Array.from({ length: 40 }).map((_, i) => (
         <ConfettiItem 
            key={i} 
            delay={Math.random() * 1.5} 
            left={Math.random() * 100} 
            color={confettiColors[Math.floor(Math.random() * confettiColors.length)]} 
         />
      ))}

      {/* Header Banner */}
      <div className="border-b border-white/5 bg-gradient-to-r from-violet-500/10 via-black to-cyan-500/10 px-8 py-12 text-center flex flex-col items-center relative z-10">
        <button 
          onClick={handleCopy}
          className="absolute top-4 right-4 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition text-slate-300"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />} 
          {copied ? "Copied!" : "Copy Report"}
        </button>

        <div className="h-20 w-20 rounded-full bg-black/40 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(34,211,238,0.2)]">
          <Flag size={34} className="text-cyan-400" />
        </div>
        <h2 className="text-3xl font-[900] tracking-tight text-white mb-4 font-['Outfit']">Interview Concluded</h2>
        <div className={`px-8 py-2.5 flex items-center gap-2 rounded-full border text-xl font-black tracking-widest uppercase mb-6 ${getDecisionColor(summary.finalDecision)}`}>
          Verdict: {summary.finalDecision || "Unknown"}
        </div>
        <p className="text-slate-200 max-w-xl mx-auto rounded-xl bg-black/40 p-5 border border-white/5 text-sm leading-relaxed italic relative">
          <span className="absolute -top-3 -left-2 text-4xl text-slate-600 font-serif">"</span>
          {summary.recruiterImpression}
          <span className="absolute -bottom-6 -right-2 text-4xl text-slate-600 font-serif">"</span>
        </p>
      </div>

      <div className="p-8 relative z-10 bg-[#060816]/60 backdrop-blur-sm">
        
        {/* Core Stats Row */}
        <div className="rounded-2xl glass-panel p-6 flex flex-col md:flex-row justify-between items-center gap-8 mb-8 shadow-inner">
          <div className="flex-1 w-full">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <Star className="text-cyan-400" size={20} /> Overall Readiness
            </h4>
            <div className="h-5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner">
               <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${summary.overallReadiness || 0}%` }}
                  transition={{ type: "spring", bounce: 0.4, duration: 2 }}
                  className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 relative"
               >
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px] opacity-30"></div>
               </motion.div>
            </div>
            <div className="mt-2 text-right text-sm text-cyan-200 font-black tracking-wider font-mono">
               {summary.overallReadiness || 0} / 100
            </div>
          </div>
          
          <div className="w-px h-20 bg-white/10 hidden md:block" />

          <div className="flex-1">
             <h4 className="font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="text-violet-400" size={20} /> Best Answer Highlights
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
              {summary.bestAnswerSummary}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-emerald-500/10 bg-black/30 p-6 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <h4 className="font-black text-white mb-4 flex items-center gap-2">
              <Trophy className="text-emerald-400" size={20} /> Top Strength
            </h4>
            <p className="text-emerald-100/80 text-sm leading-relaxed font-medium">
               {summary.topStrength}
            </p>
          </div>

          <div className="rounded-2xl border border-rose-500/10 bg-black/30 p-6 shadow-inner relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
            <h4 className="font-black text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="text-rose-400" size={20} /> Main Weakness
            </h4>
            <p className="text-rose-100/80 text-sm leading-relaxed font-medium">
               {summary.mainWeakness}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-amber-500/10 bg-black/30 p-6">
             <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="text-amber-400" size={20} /> Repeated Issue
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
               {summary.repeatedIssue}
            </p>
          </div>

          <div className="rounded-2xl border border-violet-500/10 bg-black/30 p-6">
             <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Target className="text-violet-400" size={20} /> Recommended Focus Target
            </h4>
            <p className="text-slate-300 text-sm leading-relaxed">
               {summary.recommendedFocus}
            </p>
          </div>
        </div>

      </div>
    </motion.section>
  );
}

```


## interviewmirror-client/src/hooks/useFaceTracking.js

```javascript
import { useEffect, useState, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function useFaceTracking(videoRef) {
  const [metrics, setMetrics] = useState({
    faceDetected: false,
    lookingAwayPercent: 0,
    centeredPercent: 100,
    blinkRate: 0,
    presenceScore: 70,
  });

  const faceLandmarkerRef = useRef(null);

  useEffect(() => {
    let interval;

    const init = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-assets/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );

      faceLandmarkerRef.current = faceLandmarker;

      interval = setInterval(() => {
        if (!videoRef.current || !faceLandmarkerRef.current) return;
        if (videoRef.current.readyState < 2 || videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) return;

        const result = faceLandmarkerRef.current.detectForVideo(
          videoRef.current,
          Date.now()
        );

        if (result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0];

          const leftEye = landmarks[33];
          const rightEye = landmarks[263];

          const dx = Math.abs(leftEye.x - rightEye.x);

          const lookingAway = dx < 0.05;

          const newPresence = lookingAway ? 55 : 85;

          setMetrics({
            faceDetected: true,
            lookingAwayPercent: lookingAway ? 60 : 10,
            centeredPercent: lookingAway ? 40 : 90,
            blinkRate: Math.floor(Math.random() * 10 + 12),
            presenceScore: newPresence,
          });
        } else {
          setMetrics((prev) => ({
            ...prev,
            faceDetected: false,
            presenceScore: 50,
          }));
        }
      }, 500);
    };

    init();

    return () => clearInterval(interval);
  }, [videoRef]);

  return metrics;
}
```


## interviewmirror-client/src/hooks/useInterviewController.js

```javascript
import { useCallback, useRef, useState } from "react";
import { STAGES } from "./useInterviewFlow";
import { startSessionBackend, submitAnswerBackend, endSessionBackend } from "../services/interviewApi";

export default function useInterviewController({ interviewerIntro }) {
	const [stage, setStage] = useState(STAGES.IDLE);
	const [sessionId, setSessionId] = useState(null);
	const [currentRound, setCurrentRound] = useState(1);
	const [maxRounds, setMaxRounds] = useState(3);
	const [difficultyConfig, setDifficultyConfig] = useState("Medium");

	const [question, setQuestion] = useState("");
	const [questionMeta, setQuestionMeta] = useState(null);
	const [answer, setAnswer] = useState("");
	const lastAskedRef = useRef("");

	const [results, setResults] = useState(null);
	const [summary, setSummary] = useState(null);
	const [nextActionDetails, setNextActionDetails] = useState({ nextAction: "", followUpQuestion: "", nextQuestion: "" });

	const [isProcessing, setIsProcessing] = useState(false);
	const [isSpeaking, setIsSpeaking] = useState(false);
	const [isListening, setIsListening] = useState(false);

	const speakText = useCallback((text, onEnd) => {
		if (!text || !window.speechSynthesis) return;
		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.onstart = () => setIsSpeaking(true);
		utterance.onend = () => {
			setIsSpeaking(false);
			if (onEnd) onEnd();
		};
		window.speechSynthesis.speak(utterance);
	}, []);

	const startSession = useCallback(async ({ role, type = "Technical", difficulty = "Medium", rounds = 3 }) => {
		setIsProcessing(true);
		setStage(STAGES.INTRO);
		setMaxRounds(rounds);
		setDifficultyConfig(difficulty);
		try {
			const data = await startSessionBackend({ role, type, difficulty, maxRounds: rounds });
			setSessionId(data.sessionId);
			setCurrentRound(1);
			setResults(null);
			setSummary(null);
			setQuestion(data.firstQuestion);
			setQuestionMeta(data.questionMeta || null);
			lastAskedRef.current = data.firstQuestion;
			setAnswer("");
			speakText(interviewerIntro, () => {
				setStage(STAGES.QUESTION);
				speakText(data.firstQuestion);
			});
		} catch (err) {
			console.error(err);
			setStage(STAGES.IDLE);
		} finally {
			setIsProcessing(false);
		}
	}, [interviewerIntro, speakText]);

	const triggerSummary = useCallback(async () => {
		if (!sessionId) return;
		setIsProcessing(true);
		setStage(STAGES.SUMMARY);
		try {
			const data = await endSessionBackend({ sessionId });
			setSummary(data);
		} catch (err) {
			console.error("endSession failed", err);
		} finally {
			setIsProcessing(false);
		}
	}, [sessionId]);

	const submitAnswer = useCallback(async ({ presenceMetrics, overrideAnswer } = {}) => {
		const finalAnswer = typeof overrideAnswer === "string" ? overrideAnswer : answer;
		if (!finalAnswer?.trim() || !sessionId) return;
		setIsProcessing(true);
		setStage(STAGES.ROUTING);
		try {
			const data = await submitAnswerBackend({
				sessionId,
				question: lastAskedRef.current,
				answer: finalAnswer,
				presenceMetrics
			});
			setNextActionDetails({
				nextAction: data.nextAction,
				followUpQuestion: data.followUpQuestion || "",
				nextQuestion: data.nextQuestion || ""
			});
			if (data.nextQuestionMeta) {
			    setQuestionMeta(data.nextQuestionMeta);
			}
			
			if (data.nextAction === "followup") {
				lastAskedRef.current = data.followUpQuestion;
				setAnswer("");
				setStage(STAGES.FOLLOWUP);
				speakText(data.followUpQuestion);
			} else if (data.nextAction === "next_question") {
				setResults(data.analysis);
				setStage(STAGES.ANALYSIS);
			} else if (data.nextAction === "summary") {
				setResults(data.analysis || null);
				await triggerSummary();
			} else {
				setResults(data.analysis);
				setStage(STAGES.ANALYSIS);
			}
		} catch (err) {
			console.error("submitAnswer failed", err);
			setStage(STAGES.IDLE);
		} finally {
			setIsProcessing(false);
		}
	}, [answer, sessionId, speakText, triggerSummary]);

	const skipFollowUp = useCallback(async ({ presenceMetrics } = {}) => {
		if (!sessionId) return;
		setIsProcessing(true);
		setStage(STAGES.ROUTING);
		try {
			const data = await submitAnswerBackend({
				sessionId,
				question: lastAskedRef.current,
				skippedFollowUp: true,
				presenceMetrics
			});
			setNextActionDetails({
				nextAction: data.nextAction,
				followUpQuestion: data.followUpQuestion || "",
				nextQuestion: data.nextQuestion || ""
			});
			if (data.nextQuestionMeta) {
			    setQuestionMeta(data.nextQuestionMeta);
			}
			
			if (data.nextAction === "followup") {
				lastAskedRef.current = data.followUpQuestion;
				setAnswer("");
				setStage(STAGES.FOLLOWUP);
				speakText(data.followUpQuestion);
			} else {
				setResults(data.analysis);
				setStage(STAGES.ANALYSIS);
			}
		} catch (err) {
			console.error("skipFollowUp failed", err);
			setStage(STAGES.IDLE);
		} finally {
			setIsProcessing(false);
		}
	}, [sessionId, speakText]);

	const retryFollowUp = useCallback(() => {
		setAnswer("");
		setStage(STAGES.FOLLOWUP);
	}, []);

	const nextRound = useCallback(() => {
		if (nextActionDetails.nextAction === "summary") return;
		if (nextActionDetails.nextAction === "next_question") {
			setCurrentRound(prev => prev + 1);
			setResults(null);
			setQuestion(nextActionDetails.nextQuestion);
			lastAskedRef.current = nextActionDetails.nextQuestion;
			setAnswer("");
			setStage(STAGES.QUESTION);
			speakText(nextActionDetails.nextQuestion);
		}
	}, [nextActionDetails, speakText]);

	const resetInterview = useCallback(() => {
		setResults(null);
		setSummary(null);
		setQuestion("");
		setQuestionMeta(null);
		setAnswer("");
		setNextActionDetails({ nextAction: "", followUpQuestion: "", nextQuestion: "" });
		lastAskedRef.current = "";
		setSessionId(null);
		setCurrentRound(1);
		setStage(STAGES.IDLE);
		window.speechSynthesis?.cancel();
	}, []);

	const interviewerStatus = isSpeaking ? "Speaking" : isProcessing ? "Thinking" : isListening ? "Listening" : "Waiting";

	return {
		stage,
		currentRound,
		maxRounds,
		difficultyConfig,
		results,
		summary,
		question,
		questionMeta,
		answer,
		setAnswer,
		nextActionDetails,
		isProcessing,
		isSpeaking,
		interviewerStatus,
		setIsListening,
		startSession,
		submitAnswer,
		skipFollowUp,
		retryFollowUp,
		nextRound,
		triggerSummary,
		resetInterview,
		speakText,
		setStage
	};
}

```


## interviewmirror-client/src/hooks/useInterviewFlow.js

```javascript
import { useState } from "react";

export const STAGES = {
  IDLE: "idle",
  INTRO: "intro",
  QUESTION: "question",
  FOLLOWUP: "followup",
  ROUTING: "routing",
  ANALYSIS: "analysis",
  SUMMARY: "summary"
};

export function useInterviewFlow() {
  const [stage, setStage] = useState(STAGES.IDLE);
  
  // Backend provided session identifiers
  const [sessionId, setSessionId] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const maxRounds = 3; // Fixed for now

  // Latest analysis provided by the backend to display on the scorecard
  const [results, setResults] = useState(null);
  // Prefetched next actions from the backend
  const [nextActionDetails, setNextActionDetails] = useState({ nextAction: "", followUpQuestion: "", nextQuestion: "" });
  
  // Global summary string
  const [overallSessionSummary, setOverallSessionSummary] = useState(null);

  const initSession = (id) => {
    setSessionId(id);
    setCurrentRound(1);
    setOverallSessionSummary(null);
    setResults(null);
    setStage(STAGES.INTRO);
  };

  const advanceFollowingAnalysis = () => {
    if (nextActionDetails.nextAction === "summary") {
      setStage(STAGES.SUMMARY);
    } else if (nextActionDetails.nextAction === "next_question") {
      // The backend has already incremented the round behind the scenes
      setCurrentRound(prev => prev + 1);
      setResults(null);
      setStage(STAGES.QUESTION);
    }
  };

  return {
    stage,
    setStage,
    initSession,
    advanceFollowingAnalysis,
    
    // Session state
    sessionId,
    currentRound,
    maxRounds,
    overallSessionSummary,
    setOverallSessionSummary,
    
    // Server orchestration state
    results,
    setResults,
    nextActionDetails,
    setNextActionDetails
  };
}

```


## interviewmirror-client/src/hooks/useSpeechRecognition.js

```javascript
import { useState, useRef, useCallback } from "react";

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback((onResultCallback, onEndCallback) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Use Chrome.");
      return;
    }

    if (recognitionRef.current) recognitionRef.current.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript + " ";
      }
      if (onResultCallback) onResultCallback(transcript.trim());
    };

    recognition.onerror = (e) => {
      console.error("Speech recognition error:", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (onEndCallback) onEndCallback();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}

```


## interviewmirror-client/src/services/interviewApi.js

```javascript
const API_BASE = "http://localhost:5000/api";

export const startSessionBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/start-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const submitAnswerBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/submit-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const endSessionBackend = async (payload) => {
  const res = await fetch(`${API_BASE}/end-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
};

```


## server/.env

```plaintext
OPENROUTER_API_KEY=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
```


## server/index.js

```javascript
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import interviewRoutes from './routes/interviewRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: process.env.AI_MODE || 'openrouter-ai' });
});

app.use('/api/interview', interviewRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong', details: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

```


## server/package.json

```json
{
  "name": "neural-v3-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "dev": "node --watch index.js",
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "morgan": "^1.10.0",
    "nanoid": "^5.0.7"
  }
}

```


## server/data/sessions.json

```json
{
  "sessions": [
    {
      "id": "wdf6TLJLoh",
      "createdAt": "2026-04-09T06:19:33.782Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002"
      ],
      "currentQuestion": {
        "id": "SWE002",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
        "keywords": [
          "technical depth",
          "ownership",
          "communication"
        ],
        "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
        "expectedPoints": [
          "Too vague",
          "No category of tradeoff named",
          "Missing justification"
        ],
        "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
      },
      "transcript": [],
      "pressureScore": 48,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": null,
      "summary": null
    },
    {
      "id": "M6y3KukfCZ",
      "createdAt": "2026-04-09T06:10:54.526Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002",
        "SWE004",
        "SWE006"
      ],
      "currentQuestion": {
        "id": "SWE006",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "How do you decide when to build a feature from scratch versus using a third-party library?",
        "keywords": [
          "judgment",
          "risk thinking",
          "pragmatism"
        ],
        "ideal_answer_framework": "Evaluation Criteria + Domain Risk + Decision + Example",
        "expectedPoints": [
          "Too casual",
          "No framework given",
          "Missing risk analysis"
        ],
        "strong_answer": "I evaluate on four axes: maintenance burden, security risk, customization needs, and licensing constraints. If a library covers 90%+ of what we need, has active maintenance, and doesn't introduce a critical dependency risk — I use it. If it's in a trust-critical area like auth or payments, I default to well-audited libraries. If the need is highly specific, I build."
      },
      "transcript": [
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "Over </S>Hello",
          "createdAt": "2026-04-09T06:11:21.767Z",
          "analysis": {
            "responseSeconds": 26
          },
          "responseSeconds": 26,
          "pressureScoreBefore": 48
        },
        {
          "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
          "questionMeta": {
            "id": "SWE004",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
            "keywords": [
              "technical leadership",
              "scalability thinking",
              "team awareness"
            ],
            "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management",
            "expectedPoints": [
              "Too surface-level",
              "Not team-scale",
              "No systematic approach"
            ],
            "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound."
          },
          "answer": "Over </S>HelloHello",
          "createdAt": "2026-04-09T06:11:28.176Z",
          "analysis": {
            "responseSeconds": 32
          },
          "responseSeconds": 32,
          "pressureScoreBefore": 56
        }
      ],
      "pressureScore": 64,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-09T06:11:29.353Z",
      "summary": {}
    },
    {
      "id": "nQVlB_PMnc",
      "createdAt": "2026-04-09T06:06:32.745Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002",
        "SWE004"
      ],
      "currentQuestion": {
        "id": "SWE004",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
        "keywords": [
          "technical leadership",
          "scalability thinking",
          "team awareness"
        ],
        "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management",
        "expectedPoints": [
          "Too surface-level",
          "Not team-scale",
          "No systematic approach"
        ],
        "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound."
      },
      "transcript": [
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "Hello I want to fuck you fuck youAbout meIf you like to hear something something",
          "createdAt": "2026-04-09T06:07:28.000Z",
          "analysis": {
            "responseSeconds": 54
          },
          "responseSeconds": 54,
          "pressureScoreBefore": 48
        }
      ],
      "pressureScore": 56,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": null,
      "summary": null
    },
    {
      "id": "-hA10UhOyb",
      "createdAt": "2026-04-09T05:27:51.262Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002"
      ],
      "currentQuestion": {
        "id": "SWE002",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
        "keywords": [
          "technical depth",
          "ownership",
          "communication"
        ],
        "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
        "expectedPoints": [
          "Too vague",
          "No category of tradeoff named",
          "Missing justification"
        ],
        "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
      },
      "transcript": [],
      "pressureScore": 48,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": null,
      "summary": null
    },
    {
      "id": "fRNxLMbhu1",
      "createdAt": "2026-04-09T05:26:07.097Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "friendly-recruiter",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002",
        "SWE004"
      ],
      "currentQuestion": {
        "id": "SWE004",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
        "keywords": [
          "technical leadership",
          "scalability thinking",
          "team awareness"
        ],
        "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management",
        "expectedPoints": [
          "Too surface-level",
          "Not team-scale",
          "No systematic approach"
        ],
        "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound."
      },
      "transcript": [
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "I started with capturing the essence of the things and doing work upon it",
          "createdAt": "2026-04-09T05:26:29.133Z",
          "analysis": {
            "responseSeconds": 22
          },
          "responseSeconds": 22,
          "pressureScoreBefore": 48
        }
      ],
      "pressureScore": 56,
      "interviewer": {
        "name": "Maya Singh",
        "title": "Talent Partner",
        "style": "Warm, encouraging, but still precise.",
        "pressureMultiplier": 0.8,
        "intro": "Hi there. I want you to do well, but I will still push for clear and specific answers."
      },
      "endedAt": "2026-04-09T05:27:43.762Z",
      "summary": {}
    },
    {
      "id": "CIDkckI8yK",
      "createdAt": "2026-04-09T05:25:32.404Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002",
        "SWE004"
      ],
      "currentQuestion": {
        "id": "SWE004",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
        "keywords": [
          "technical leadership",
          "scalability thinking",
          "team awareness"
        ],
        "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management",
        "expectedPoints": [
          "Too surface-level",
          "Not team-scale",
          "No systematic approach"
        ],
        "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound."
      },
      "transcript": [
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "Do you know the",
          "createdAt": "2026-04-09T05:25:57.026Z",
          "analysis": {
            "responseSeconds": 24
          },
          "responseSeconds": 24,
          "pressureScoreBefore": 48
        }
      ],
      "pressureScore": 56,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-09T05:26:00.238Z",
      "summary": {}
    },
    {
      "id": "Te7mSRosEA",
      "createdAt": "2026-04-09T05:12:49.510Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002",
        "SWE004"
      ],
      "currentQuestion": {
        "id": "SWE004",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
        "keywords": [
          "technical leadership",
          "scalability thinking",
          "team awareness"
        ],
        "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management",
        "expectedPoints": [
          "Too surface-level",
          "Not team-scale",
          "No systematic approach"
        ],
        "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound."
      },
      "transcript": [
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "Hello </S>You know the thing isEnglish wordStopMotherfuckerVanessa",
          "createdAt": "2026-04-09T05:15:31.781Z",
          "analysis": {
            "responseSeconds": 162
          },
          "responseSeconds": 162,
          "pressureScoreBefore": 48
        }
      ],
      "pressureScore": 56,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-09T05:15:33.049Z",
      "summary": {}
    },
    {
      "id": "zgLmB2bhVT",
      "createdAt": "2026-04-09T05:12:41.649Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "easy",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE001"
      ],
      "currentQuestion": {
        "id": "SWE001",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "hard",
        "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
        "keywords": [
          "technical judgment",
          "pressure handling",
          "communication"
        ],
        "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson",
        "expectedPoints": [
          "Generic choice",
          "No pressure context",
          "Missing tradeoff reasoning"
        ],
        "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team."
      },
      "transcript": [],
      "pressureScore": 48,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": null,
      "summary": null
    },
    {
      "id": "MCX7Coisrr",
      "createdAt": "2026-04-09T05:02:03.182Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "easy",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE001"
      ],
      "currentQuestion": {
        "id": "SWE001",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "hard",
        "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
        "keywords": [
          "technical judgment",
          "pressure handling",
          "communication"
        ],
        "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson",
        "expectedPoints": [
          "Generic choice",
          "No pressure context",
          "Missing tradeoff reasoning"
        ],
        "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team."
      },
      "transcript": [],
      "pressureScore": 48,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-09T05:02:25.331Z",
      "summary": {}
    },
    {
      "id": "QeBcrZpG6i",
      "createdAt": "2026-04-08T18:30:08.777Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "easy",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE001",
        "SWE002"
      ],
      "currentQuestion": {
        "id": "SWE002",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
        "keywords": [
          "technical depth",
          "ownership",
          "communication"
        ],
        "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
        "expectedPoints": [
          "Too vague",
          "No category of tradeoff named",
          "Missing justification"
        ],
        "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
      },
      "transcript": [
        {
          "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
          "questionMeta": {
            "id": "SWE001",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "hard",
            "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
            "keywords": [
              "technical judgment",
              "pressure handling",
              "communication"
            ],
            "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson",
            "expectedPoints": [
              "Generic choice",
              "No pressure context",
              "Missing tradeoff reasoning"
            ],
            "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team."
          },
          "answer": "dfsfsfsd ",
          "createdAt": "2026-04-08T18:30:28.988Z",
          "analysis": {
            "responseSeconds": 20
          },
          "responseSeconds": 20,
          "pressureScoreBefore": 48
        }
      ],
      "pressureScore": 56,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-08T18:30:30.198Z",
      "summary": {}
    },
    {
      "id": "rvNbk2NeNB",
      "createdAt": "2026-04-08T18:29:25.322Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "easy",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE001",
        "SWE002",
        "SWE003"
      ],
      "currentQuestion": {
        "id": "SWE003",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "hard",
        "question": "Walk me through a time when a critical system failed in production. How did you diagnose and resolve it?",
        "keywords": [
          "debugging",
          "calmness under pressure",
          "accountability"
        ],
        "ideal_answer_framework": "Detection → Diagnosis → Fix → Prevention → Communication",
        "expectedPoints": [
          "No diagnosis process shown",
          "No measurable impact",
          "No prevention step"
        ],
        "strong_answer": "Our payment processing degraded silently during peak traffic. I noticed via alert that success rates dropped 12%. I pulled logs, identified repeated DB timeout errors on a specific query, traced it to a missing index introduced in a recent migration, added the index via a hot-patch, and authored a post-mortem with a checklist to catch similar issues in CI. Downtime was under 8 minutes."
      },
      "transcript": [
        {
          "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
          "questionMeta": {
            "id": "SWE001",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "hard",
            "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
            "keywords": [
              "technical judgment",
              "pressure handling",
              "communication"
            ],
            "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson",
            "expectedPoints": [
              "Generic choice",
              "No pressure context",
              "Missing tradeoff reasoning"
            ],
            "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team."
          },
          "answer": "UhUh itUh it wasUh it was theUh it was the timeUh it was the timeUh it was the time whenUh it was the time whenUh it was the time whenUh it was the time when IUh it was the time when IUh it was the time when I wasUh it was the time when I wasUh it was the time when I was workingUh it was the time when I was workingUh it was the time when I was workingUh it was the time when I was working atUh it was the time when I was working at theUh it was the time when I was working at theUh it was the time when I was working at",
          "createdAt": "2026-04-08T18:29:45.550Z",
          "analysis": {
            "responseSeconds": 20
          },
          "responseSeconds": 20,
          "pressureScoreBefore": 48
        },
        {
          "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
          "questionMeta": {
            "id": "SWE002",
            "role": "software-engineer",
            "category": "Software Engineer",
            "difficulty": "medium",
            "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
            "keywords": [
              "technical depth",
              "ownership",
              "communication"
            ],
            "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
            "expectedPoints": [
              "Too vague",
              "No category of tradeoff named",
              "Missing justification"
            ],
            "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
          },
          "answer": "UhUh itUh it wasUh it was theUh it was the timeUh it was the timeUh it was the time whenUh it was the time whenUh it was the time whenUh it was the time when IUh it was the time when IUh it was the time when I wasUh it was the time when I wasUh it was the time when I was workingUh it was the time when I was workingUh it was the time when I was workingUh it was the time when I was working atUh it was the time when I was working at theUh it was the time when I was working at theUh it was the time when I was working at",
          "createdAt": "2026-04-08T18:29:53.428Z",
          "analysis": {
            "responseSeconds": 28
          },
          "responseSeconds": 28,
          "pressureScoreBefore": 56
        }
      ],
      "pressureScore": 64,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": "2026-04-08T18:29:55.061Z",
      "summary": {}
    },
    {
      "id": "dh16DMFy_P",
      "createdAt": "2026-04-08T18:24:03.290Z",
      "role": "software-engineer",
      "candidateName": "Candidate",
      "interviewMode": "behavioral + technical",
      "difficulty": "medium",
      "persona": "calm-senior-interviewer",
      "pressureMode": "balanced",
      "resumeText": "",
      "jdText": "",
      "askedQuestionIds": [
        "SWE002"
      ],
      "currentQuestion": {
        "id": "SWE002",
        "role": "software-engineer",
        "category": "Software Engineer",
        "difficulty": "medium",
        "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
        "keywords": [
          "technical depth",
          "ownership",
          "communication"
        ],
        "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan",
        "expectedPoints": [
          "Too vague",
          "No category of tradeoff named",
          "Missing justification"
        ],
        "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on."
      },
      "transcript": [],
      "pressureScore": 48,
      "interviewer": {
        "name": "Ananya Rao",
        "title": "Senior Interviewer",
        "style": "Calm, deliberate, and detail-oriented.",
        "pressureMultiplier": 1,
        "intro": "Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics."
      },
      "endedAt": null,
      "summary": null
    }
  ]
}
```


## server/data/structuredDAQuestions.js

```javascript
export const structuredDAQuestions = [
  {
    "id": "DA001",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Tell me about a time your data analysis completely contradicted the team’s core assumption.",
    "average_answer": "I found data that showed our new feature wasn't working. I told the team and we stopped working on it.",
    "strong_answer": "Marketing assumed a massive spike in Q3 signups was due to a new ad campaign. My cohort analysis showed that while top-of-funnel grew, D7 retention for those users was near zero. Furthermore, the traffic origin was mostly automated bot networks. I didn't just send a chart; I built a presentation showing the ROI of the ad spend was deeply negative. It was a tough meeting, but I pre-aligned with the head of growth so I had support in the room. We paused the campaign and saved $40k/month.",
    "feedback_average": ["No depth on the analysis method", "No stakeholder management", "Passive communication"],
    "feedback_strong": ["Specific analysis named", "Showed courage in communication", "Managed stakeholders effectively", "Clear business impact"],
    "improved_answer": "I used cohort retention analysis to disprove a celebrated growth spike, identifying bot traffic. I carefully built a case, gained an executive ally beforehand, and delivered the hard news safely, saving significant ad spend.",
    "follow_up_questions": ["How do you handle a stakeholder who simply refuses to believe your data?", "What steps did you take to ensure your bot-traffic hypothesis was bulletproof?"],
    "traits_evaluated": ["analytical rigor", "courage", "stakeholder management"],
    "ideal_answer_framework": "The Assumption → The Analysis Method → The Counter-finding → Communication Strategy → Business Impact"
  },
  {
    "id": "DA002",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "How do you handle data anomalies or outliers that completely skew your reporting models?",
    "average_answer": "I usually just delete the outliers from the dataset so the average looks normal.",
    "strong_answer": "I never silently delete outliers. First, I identify the cause. Is it a tracking bug, fraud, or a legitimate whale user? If it's a tracking error, I filter it out but leave a documented CTE or comment in the SQL explaining the exclusion. If it's a legitimate edge case, like a massive enterprise client skewing overall revenue, I segment the reporting. I present the median instead of the mean, and show two views: 'Including Enterprise' and 'Excluding Enterprise' so the business understands the true distribution.",
    "feedback_average": ["Dangerous data practices", "No investigation", "Loses valuable business context"],
    "feedback_strong": ["Investigates root cause", "Uses medians appropriately", "Provides segmented context"],
    "improved_answer": "I investigate the root cause first. If it's an error, I document the exclusion. If it's legitimate, I segment the user base and switch from means to medians to provide an accurate business narrative.",
    "follow_up_questions": ["Can you give an example of an outlier that turned out to be a massive business opportunity?", "How do you automate outlier detection in a daily dashboard?"],
    "traits_evaluated": ["statistical integrity", "curiosity", "business acumen"],
    "ideal_answer_framework": "Root Cause Investigation → Statistical Adjustment (Median/Segmentation) → Transparent Documentation → Dual Reporting"
  },
  {
    "id": "DA003",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Describe a time you had to optimize a slow, resource-heavy SQL query. What was your approach?",
    "average_answer": "I had a query that took 10 minutes. I added an index and it ran faster.",
    "strong_answer": "A daily financial rollup query was timing out after 15 minutes, blocking morning reports. I ran EXPLAIN PLAN and found it was doing a full table scan on a 50M row table because of a function wrapped around a date column in the WHERE clause (e.g., DATE(created_at) = '2023-10-01'). I rewrote the condition to use a bounding range (created_at >= '2023-10-01' AND created_at < '2023-10-02') to hit the index, and replaced a massive subquery with a CTE to materialize temporary results. Execution dropped to 45 seconds.",
    "feedback_average": ["No debugging methodology", "No specific SQL concepts used", "Vague outcome"],
    "feedback_strong": ["Used EXPLAIN", "Identified sargable vs non-sargable conditions", "Used CTEs", "Clear performance win"],
    "improved_answer": "I used EXPLAIN PLAN to find bottlenecks, rewrote non-sargable WHERE clauses to utilize indexing, and factored out repeated subqueries into CTEs to drastically reduce execution time.",
    "follow_up_questions": ["What do you do if you optimize a query as much as possible but it's still too slow?", "How do you balance readability with performance when writing SQL?"],
    "traits_evaluated": ["sql proficiency", "performance tuning", "technical depth"],
    "ideal_answer_framework": "Identify Bottleneck (EXPLAIN) → Specific Optimization Technique → Structural Refactor → Measured Result"
  },
  {
    "id": "DA004",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "Describe an instance where you uncovered a critical tracking error in production. How did you fix the historical data?",
    "average_answer": "I noticed tracking was broken, so I told engineering. We couldn't fix the old data, so we just started tracking properly from that day on.",
    "strong_answer": "I found a bug where Android purchases weren't firing the 'checkout_complete' event, meaning our revenue dashboard under-reported by 30%. After collaborating with engineering to ship a hotfix for future events, I tackled the historical gap. I couldn't inject frontend events, so I wrote a Python script to backfill a proxy event table by joining raw Stripe success webhooks with our user session logs based on timestamps. I documented the proxy method clearly on the main dashboard so stakeholders understood the methodology.",
    "feedback_average": ["Gave up on historical data", "No cross-functional collaboration", "No proxy solving"],
    "feedback_strong": ["Cross-team collaboration", "Creative proxy joining", "Maintains trust via transparency"],
    "improved_answer": "I halted the bleeding with engineering, then creatively repaired the historical baseline by joining external payment system logs with internal session data, documenting the proxy solution for stakeholders.",
    "follow_up_questions": ["How did you rebuild trust with stakeholders who realized the dashboard had been wrong for months?", "At what point do you decide historical data is corrupted beyond repair?"],
    "traits_evaluated": ["data engineering", "problem solving", "stakeholder trust"],
    "ideal_answer_framework": "Identify Issue → Stop the Bleeding → Proxy/Backfill Historical → Transparent Communication"
  },
  {
    "id": "DA005",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "How do you communicate complex, counter-intuitive data insights to non-technical stakeholders?",
    "average_answer": "I try to use simple words and make a nice chart so they understand.",
    "strong_answer": "I focus on the business decision, not the math. I had to explain Simpson's Paradox to a sales team who thought conversion rates were up everywhere, when in fact, high-converting channels were shrinking. Instead of explaining the paradox statistically, I built a waterfall chart showing exactly how many dollars we lost due to channel mix shift. I always start with 'The Bottom Line,' support it with one visual, and keep the deep statistical methodology in an appendix.",
    "feedback_average": ["Too vague", "No framework for communication", "Lacks situational empathy"],
    "feedback_strong": ["Specific complex scenario", "Translates math into money", "Excellent presentation structuring (Bottom Line First)"],
    "improved_answer": "I abstract the statistics into business impact (usually dollars or time). I use the 'Bottom Line First' framework, provide a single intuitive visual like a waterfall chart, and bury the technical methodology in the appendix.",
    "follow_up_questions": ["Give an example of a visualization that failed to communicate your point.", "How do you prepare for a presentation where you know the audience will be hostile to the data?"],
    "traits_evaluated": ["communication", "business translation", "empathy"],
    "ideal_answer_framework": "The Complex Concept → Translation to Business Metric → Visualization Choice → Presentation Structure"
  },
  {
    "id": "DA006",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Tell me about a time stakeholders completely rejected your data-backed recommendations.",
    "average_answer": "I showed the executive team that we should kill a feature, but they wanted to keep it. I just accepted it because they are the bosses.",
    "strong_answer": "I presented an analysis showing our freemium tier had a negative LTV-to-CAC ratio and recommended ending it. The CEO rejected it, citing brand awareness. I realized I hadn't incorporated 'marketing value'. I went back, gathered organic referral data from freemium users, and reran the model. The freemium tier was still a loss leader, but not as severely. We compromised: we kept the tier but gated the most expensive compute features. I learned to always understand the stakeholder's unmeasured incentives.",
    "feedback_average": ["Resigned immediately", "No attempt to understand the 'why'", "No compromise"],
    "feedback_strong": ["Incorporated new context", "Iterated on the model", "Found a middle ground", "Learned about unspoken incentives"],
    "improved_answer": "When rejected, I dug deeper to understand the unspoken business incentives (like brand), incorporated those into my model, and returned with a compromised recommendation that satisfied both math and strategy.",
    "follow_up_questions": ["How do you differentiate between a stubborn stakeholder and a flawed analysis?", "What do you do if a stakeholder asks you to massage the data to support their preconceived idea?"],
    "traits_evaluated": ["resilience", "commercial awareness", "negotiation"],
    "ideal_answer_framework": "The Rejection → Uncovering Missing Context → Iterating the Model → Re-negotiating a Solution"
  },
  {
    "id": "DA007",
    "category": "Data Analyst",
    "difficulty": "Hard",
    "question": "How do you identify whether a metric change is a seasonal trend or a permanent behavioral shift?",
    "average_answer": "I look at last year's data and see if it looks similar.",
    "strong_answer": "I use a combination of Year-over-Year (YoY) benchmarking and cohort analysis. When our e-commerce engagement dropped in August, looking YoY showed August was always slow. However, I didn't stop there. I isolated the newest cohort of users acquired in July, and saw their retention curve was 15% steeper than the July cohort from the previous year. The overall volume drop was seasonal, but the specific retention degradation was a behavioral shift caused by a recent UI update. Separating aggregate trends from cohort behavior is critical.",
    "feedback_average": ["Too simplistic", "Misses internal composition changes", "Vague methodology"],
    "feedback_strong": ["Separation of aggregate from cohort", "Clear methodology", "Identifies hidden shifts within expected trends"],
    "improved_answer": "I don't just look at aggregate Year-over-Year drops; I isolate specific user cohorts to ensure an expected seasonal drop isn't masking a dangerous permanent behavioral shift in new users.",
    "follow_up_questions": ["What statistical methods do you use to smooth out highly volatile daily metrics?", "How do you explain 'cohort analysis' to a non-technical manager?"],
    "traits_evaluated": ["analytical depth", "cohort analysis", "nuance"],
    "ideal_answer_framework": "Initial YoY Check → Cohort Isolation → Identifying the Hidden Shift → Conclusion"
  },
  {
    "id": "DA008",
    "category": "Data Analyst",
    "difficulty": "Medium",
    "question": "Describe your approach to designing a dashboard that executives will actually use and understand.",
    "average_answer": "I ask them what metrics they want and put them all on one page with clear labels.",
    "strong_answer": "Executive dashboards fail when they answer 'What' but not 'So what?'. I follow a 3-part hierarchy. Top row: 3-5 macro KPIs with green/red variance against targets. Middle row: The primary drivers of those KPIs (e.g., if Revenue is red, is it Volume or Pricing?). Bottom section: A dynamic text box where I write a weekly 3-bullet summary interpreting the data. If an exec only has 10 seconds, they read the summary. If they have 1 minute, they look at the colors. I never include exploratory tables on an exec dashboard.",
    "feedback_average": ["Too passive (order taking)", "No UX/UI philosophy", "Lacks business synthesis"],
    "feedback_strong": ["Clear visual hierarchy", "Focuses on variance and targets", "Includes narrative synthesis", "Understands executive time constraints"],
    "improved_answer": "I build with a strict 'What/Why/Narrative' hierarchy. Top-line variance, secondary drivers, and most importantly, a written summary synthesising the 'So What' for time-poor executives.",
    "follow_up_questions": ["How do you handle feature-creep when everyone wants their specific metric on the main dashboard?", "What tooling do you prefer for narrative-driven dashboards?"],
    "traits_evaluated": ["data visualization", "executive presence", "product sense for data"],
    "ideal_answer_framework": "The Flaw in Normal Dashboards → Visual Hierarchy → Inclusion of Narrative Syntheses → Boundary Setting"
  }
];

```


## server/data/structuredHRQuestions.js

```javascript
export const structuredHRQuestions = [
  {
    "id": "IM001",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Tell me about yourself.",
    "average_answer": "I am a final-year engineering student interested in software development and problem-solving. I have worked on a few academic and personal projects and I enjoy learning new technologies.",
    "strong_answer": "I am a final-year engineering student with a strong interest in software development, especially building practical digital products. Over time, I have worked on projects involving web development and problem-solving, which helped me strengthen both my technical and communication skills. I enjoy solving real-world problems through technology, which is why I’m excited about opportunities like this.",
    "feedback_average": ["Decent introduction", "Needs more impact", "Could include one achievement"],
    "feedback_strong": ["Clear structure", "Professional tone", "Relevant positioning"],
    "improved_answer": "I am a final-year engineering student passionate about building useful software solutions. Through projects and hands-on learning, I have developed technical skills, problem-solving ability, and a strong interest in applying technology to real-world challenges.",
    "follow_up_questions": ["What project are you most proud of?", "What are your career goals?"],
    "traits_evaluated": ["clarity", "confidence", "relevance", "structure"],
    "ideal_answer_framework": "Present + Skills + Evidence + Fit"
  },
  {
    "id": "IM002",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Why should we hire you?",
    "average_answer": "I am hardworking, a quick learner, and I can contribute to the company with my skills.",
    "strong_answer": "You should hire me because I bring a combination of technical capability, adaptability, and a willingness to learn quickly. I take ownership of my work, I’m comfortable solving problems, and I’m motivated to contribute meaningfully while growing in a professional environment.",
    "feedback_average": ["Common answer", "Needs proof", "Too generic"],
    "feedback_strong": ["Value-oriented", "Balanced confidence", "Good professional framing"],
    "improved_answer": "I believe I would be a strong fit because I combine problem-solving ability, adaptability, and consistent execution. I can contribute with both technical effort and a learning mindset, which helps me add value while improving quickly.",
    "follow_up_questions": ["What specific value can you bring?", "Can you give an example of ownership?"],
    "traits_evaluated": ["confidence", "impact", "relevance"],
    "ideal_answer_framework": "Strength + Evidence + Value"
  },
  {
    "id": "IM003",
    "category": "HR",
    "difficulty": "Easy",
    "question": "What are your strengths?",
    "average_answer": "My strengths are problem-solving, adaptability, and hard work.",
    "strong_answer": "My key strengths are problem-solving, adaptability, and consistency. I’m comfortable learning new tools and approaches when needed, and I stay reliable in execution, which helps me perform well in both individual and team-based work.",
    "feedback_average": ["Good points", "Needs examples", "Slightly generic"],
    "feedback_strong": ["Specific", "Professional", "Well explained"],
    "improved_answer": "I would say my biggest strengths are problem-solving, adaptability, and consistency. These help me approach challenges calmly, learn quickly, and stay dependable in execution.",
    "follow_up_questions": ["Can you give an example of one strength?", "How has adaptability helped you?"],
    "traits_evaluated": ["clarity", "specificity", "confidence"],
    "ideal_answer_framework": "Strength + Explanation + Example"
  },
  {
    "id": "IM004",
    "category": "HR",
    "difficulty": "Medium",
    "question": "What are your weaknesses?",
    "average_answer": "Sometimes I overthink my work and spend extra time on details.",
    "strong_answer": "One weakness I’ve identified is that I can sometimes spend too much time trying to perfect a task. While attention to detail is useful, I realized it can affect speed, so I’ve been improving by setting time limits and prioritizing progress along with quality.",
    "feedback_average": ["Safe answer", "Needs action plan"],
    "feedback_strong": ["Self-aware", "Mature", "Shows improvement mindset"],
    "improved_answer": "A weakness I’ve been working on is over-focusing on perfection in some tasks. I’ve improved this by becoming more conscious of deadlines and prioritizing what matters most first.",
    "follow_up_questions": ["How are you improving this weakness?", "Has this ever affected a project?"],
    "traits_evaluated": ["self-awareness", "honesty", "maturity"],
    "ideal_answer_framework": "Weakness + Reflection + Improvement"
  },
  {
    "id": "IM005",
    "category": "HR",
    "difficulty": "Easy",
    "question": "Where do you see yourself in 5 years?",
    "average_answer": "I want to be in a good position in the company and improve my skills.",
    "strong_answer": "In five years, I see myself as a skilled professional who has built strong domain expertise and contributed meaningfully to impactful projects. I also hope to take on greater responsibility and continue growing both technically and professionally.",
    "feedback_average": ["Acceptable", "Needs direction", "Too broad"],
    "feedback_strong": ["Ambitious but realistic", "Growth-oriented"],
    "improved_answer": "In five years, I want to be someone who has developed strong expertise, delivered meaningful work, and grown into a more responsible and dependable professional.",
    "follow_up_questions": ["What kind of skills do you want to build?", "Do you want leadership responsibilities?"],
    "traits_evaluated": ["vision", "clarity", "professional maturity"],
    "ideal_answer_framework": "Future Goal + Growth + Alignment"
  },
  {
    "id": "IM006",
    "category": "HR",
    "difficulty": "Medium",
    "question": "Why do you want to work here?",
    "average_answer": "I want to work here because your company provides good opportunities and growth.",
    "strong_answer": "I want to work here because this role offers a strong opportunity to apply my current skills while continuing to learn in a professional environment. I also value the kind of impactful and growth-oriented work your company is known for, which aligns with what I’m looking for early in my career.",
    "feedback_average": ["Good intent", "Needs personalization"],
    "feedback_strong": ["Shows alignment", "Professional and role-focused"],
    "improved_answer": "I’m interested in this opportunity because it seems like a place where I can both contribute and grow. I value learning, meaningful work, and environments where strong execution is appreciated.",
    "follow_up_questions": ["What do you know about our company?", "Why this role specifically?"],
    "traits_evaluated": ["motivation", "research", "relevance"],
    "ideal_answer_framework": "Company Fit + Role Fit + Motivation"
  },
  {
    "id": "IM007",
    "category": "HR",
    "difficulty": "Easy",
    "question": "What motivates you?",
    "average_answer": "I am motivated by learning and success.",
    "strong_answer": "I’m motivated by growth, problem-solving, and the feeling of making meaningful progress. I enjoy situations where I can learn, improve, and contribute to something that creates real value.",
    "feedback_average": ["Clear but generic", "Needs personality"],
    "feedback_strong": ["Good self-awareness", "Professional and authentic"],
    "improved_answer": "What motivates me most is growth through meaningful work. I enjoy learning, solving challenges, and seeing the results of consistent effort.",
    "follow_up_questions": ["What demotivates you?", "Can you give an example of meaningful work?"],
    "traits_evaluated": ["self-awareness", "authenticity", "clarity"],
    "ideal_answer_framework": "Motivator + Why + Work Relevance"
  },
  {
    "id": "IM008",
    "category": "HR",
    "difficulty": "Medium",
    "question": "Why did you choose your field?",
    "average_answer": "I chose this field because I was interested in technology from a young age.",
    "strong_answer": "I chose this field because it sits at the intersection of logical problem-solving and creative building. I enjoy diving into complex systems, figuring out how they work, and improving them, which makes this work engaging for me on a daily basis.",
    "feedback_average": ["A bit cliché", "Needs professional connection"],
    "feedback_strong": ["Genuine", "Highlights relevant work traits"],
    "improved_answer": "I chose this field because it allows me to combine analytical problem-solving with creative execution. I enjoy the process of breaking down complex problems and building efficient solutions.",
    "follow_up_questions": ["Can you give an example of a complex system you improved?", "What do you find most challenging about this field?"],
    "traits_evaluated": ["motivation", "passion", "alignment"],
    "ideal_answer_framework": "Origin + Core Interest + Value Alignment"
  }
];

```


## server/data/structuredPMQuestions.js

```javascript
export const structuredPMQuestions = [
  {
    "id": "PM001",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Tell me about a time you had to prioritize competing, aggressive demands from multiple stakeholders.",
    "average_answer": "I had sales asking for one feature and marketing asking for another. I talked to both, put them in a spreadsheet, and prioritized based on impact.",
    "strong_answer": "Sales needed a custom integration for a massive client, while Support needed an internal tool fix to reduce ticket volume. Both escalated to the C-suite. I built a quick RICE matrix but mapped it explicitly to our OKR of reducing churn. I showed both teams that the Support tool fix saved 300 dev hours per quarter, allowing us to build the Sales integration the following month without halting core product work. Making the tradeoff quantitative de-escalated the emotional tension.",
    "feedback_average": ["No framework used", "No resolution outcome", "Stakeholders handled passively"],
    "feedback_strong": ["Clear framework (RICE)", "Tied to company OKRs", "Data de-escalated emotion"],
    "improved_answer": "I quantified the ROI of both requests against our core OKR, showed both teams the math, and found a sequencing compromise that satisfied the business goal rather than the loudest voice.",
    "follow_up_questions": ["What do you do if a stakeholder rejects your quantitative model?", "Have you ever made a prioritization decision you later regretted?"],
    "traits_evaluated": ["framework thinking", "stakeholder management", "strategic alignment"],
    "ideal_answer_framework": "Conflict Setup → Framework Applied → Alignment to OKRs → Communication Strategy → Outcome"
  },
  {
    "id": "PM002",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Describe a product feature launch that failed. How did you measure the failure and what was the pivot?",
    "average_answer": "We launched a new dashboard but users didn't like it. So we asked them what they wanted and changed it.",
    "strong_answer": "We launched a 'smart recommendations' feed expected to increase daily engagement by 15%. After 2 weeks, metrics showed a 2% drop in core workflow completion. I immediately ran a Mixpanel funnel analysis and saw users dropping off at the new feed. I paused the rollout, conducted 5 user interviews, and realized the feed caused cognitive overload. We pivoted the feed into an opt-in weekly digest email instead. Engagement recovered and the digest saw a 40% open rate.",
    "feedback_average": ["No quantitative measurement", "Vague failure reason", "No distinct pivot strategy"],
    "feedback_strong": ["Specific metrics named", "Fast identification", "Clear hypothesis testing", "Data-backed pivot"],
    "improved_answer": "I defined failure quantitatively, identified the drop-off funnel, validated the root cause with user interviews, stopped the rollout, and successfully pivoted the delivery mechanism.",
    "follow_up_questions": ["How do you differentiate between an adoption curve and a failed feature?", "How did you explain the failure to management?"],
    "traits_evaluated": ["data analysis", "adaptability", "accountability"],
    "ideal_answer_framework": "Hypothesis → Measurable Failure → Root Cause Diagnosis → Pivot → Outcome"
  },
  {
    "id": "PM003",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Walk me through precisely how you determine and measure success for a new product launch.",
    "average_answer": "I look at user adoption and see if people are actually using the feature.",
    "strong_answer": "I define success across three dimensions before writing a single line of code: Primary Metric (e.g., Conversion Rate), Secondary Metric (e.g., Time on Page), and a Counter Metric (e.g., Support Ticket Volume). I establish a baseline, set a conservative and stretch target, and instrument the tracking in Amplitude. After launch, I measure Day 1, Day 7, and Day 30 retention curves against those targets.",
    "feedback_average": ["No mention of counter metrics", "No baseline comparison", "No timelines"],
    "feedback_strong": ["Three-tiered metric approach", "Mentions counter metrics", "Time-bound measurement"],
    "improved_answer": "I establish a Primary metric, a Secondary metric, and a Counter metric beforehand. I log baselines, set targets, ensure instrumentation, and review at specific time intervals (D1, D7, D30).",
    "follow_up_questions": ["Can you give an example of a counter metric that saved a launch?", "What do you do if you hit your primary metric but the counter metric explodes?"],
    "traits_evaluated": ["analytical rigor", "product strategy", "metric design"],
    "ideal_answer_framework": "Metric Trio (Primary/Secondary/Counter) + Baseline + Instrumentation + Checkpoints"
  },
  {
    "id": "PM004",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "How do you decide when to kill a feature that users love but is technically unsustainable?",
    "average_answer": "If it breaks too much, I just turn it off and send an email to the users.",
    "strong_answer": "I experienced this with a legacy data export tool that 5% of highly vocal users loved, but caused 30% of our database load. First, I analyzed those users' core job-to-be-done. I realized they just needed a weekly CSV, not real-time query access. I proposed an asynchronous report generator as a replacement. I provided a 60-day sunset notice for the old tool, offered white-glove migration for the top 10 enterprise users, and shut it down. Load dropped 30% with zero churn.",
    "feedback_average": ["Abrupt", "Ignores user empathy", "No migration path"],
    "feedback_strong": ["Understands 'Job-to-be-done'", "Data-driven", "Managed the sunset gracefully"],
    "improved_answer": "I balance the technical cost against the business value, find alternative ways to solve the core user need, announce early, provide a migration path, and then sunset.",
    "follow_up_questions": ["What if a top paying customer threatens to churn if you kill the feature?", "Do you ever let engineering kill a feature without PM approval?"],
    "traits_evaluated": ["pragmatism", "user empathy", "hard decisions"],
    "ideal_answer_framework": "Cost/Benefit Analysis → Understand Core Need → Build Alternative → Sunset Plan → Outcome"
  },
  {
    "id": "PM005",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Tell me about a time you used purely qualitative user feedback to override a quantitative data trend.",
    "average_answer": "The data said a feature was doing well, but users told me they hated it, so we changed it.",
    "strong_answer": "Our A/B test for a mandatory onboarding flow showed a 20% increase in profile completions (a huge positive). However, I sat in on 5 user testing sessions, and observed profound frustration — users were clicking through rapidly just to 'get it over with' and entering fake data. The quantitative data looked like success; the qualitative data revealed toxic engagement. I overrode the test, made the flow skippable, and our 30-day retention increased by 8% even though Day 1 completion dropped.",
    "feedback_average": ["No nuance", "Vague data point", "No business outcome"],
    "feedback_strong": ["Excellent observation skills", "Understands 'toxic engagement'", "Proves instinct with long-term retention data"],
    "improved_answer": "I spotted 'toxic engagement' where quantitative metrics looked green but qualitative observation showed extreme user frustration. I trusted the user pain, pivoted, and improved long-term retention.",
    "follow_up_questions": ["How do you convince a data-driven executive to trust your qualitative finding?", "When is qualitative data dangerous to trust?"],
    "traits_evaluated": ["product sense", "user empathy", "metric skepticism"],
    "ideal_answer_framework": "Deceptive Metric + Qualitative Discovery + The Realizations + The Override Decision + Long-term Result"
  },
  {
    "id": "PM006",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "Walk me through your approach to conducting a brutally honest post-mortem after a launch.",
    "average_answer": "I call a meeting, ask what went wrong, and write down notes for next time.",
    "strong_answer": "I enforce a blameless culture. I send a pre-read survey asking for 1 thing that went well and 2 that failed. During the meeting, we use the '5 Whys' technique for the biggest failure. For example, when a launch was delayed by 2 weeks, we traced it from 'design wasn't ready' down to 'PM didn't provide edge-case requirements before dev started'. I owned that failure publicly. The outcome of a post-mortem must be an automated or process change, not just a promise to 'do better'.",
    "feedback_average": ["No structure", "Places blame", "No actionable outcome"],
    "feedback_strong": ["Blameless culture", "Specific root-cause technique", "Sets actionable outcomes"],
    "improved_answer": "I use a blameless '5 Whys' structure, encourage pre-read data collection, own my portion of failures publicly, and mandate that outputs are process changes, not just promises.",
    "follow_up_questions": ["How do you handle an engineer who refuses to participate blamelessly?", "Can you give an example of a process change that came from a post-mortem?"],
    "traits_evaluated": ["leadership", "process improvement", "humility"],
    "ideal_answer_framework": "Blameless Setup + Pre-work + Framework (5 Whys) + Ownership + Concrete Process Output"
  },
  {
    "id": "PM007",
    "category": "Product Manager",
    "difficulty": "Medium",
    "question": "How do you manage a situation where sales strongly over-promises a feature to land a massive client?",
    "average_answer": "I tell sales they can't do that and inform the client it won't be built.",
    "strong_answer": "First, I de-escalate. I meet with the Sales Director to understand the exact contract language. Then I talk to the client directly to understand their core underlying need — they didn't actually need real-time sync, they just needed a daily 8AM report. I negotiated with the client to deliver the daily report in 2 weeks, rather than throwing engineering into a 3-month fire drill. Finally, I instituted a formal 'deal desk' process with Sales to review technical commitments over $50k.",
    "feedback_average": ["Antagonistic to sales", "Inflexible", "Burns the client relationship"],
    "feedback_strong": ["Commercial awareness", "Finds the 'job to be done'", "Creates systemic prevention"],
    "improved_answer": "I intercept the requirement directly with the client to find the true underlying need, renegotiate a simpler technical solution, and establish a process with Sales to prevent future occurrences.",
    "follow_up_questions": ["What happens if the client refuses to budge on the complex feature?", "How do you maintain a good relationship with Sales while telling them no?"],
    "traits_evaluated": ["negotiation", "commercial awareness", "problem solving"],
    "ideal_answer_framework": "De-escalate → Uncover True Need → Negotiate Simplified Solution → Preventative Process"
  },
  {
    "id": "PM008",
    "category": "Product Manager",
    "difficulty": "Hard",
    "question": "Describe a situation where your engineering team told you a feature was impossible. How did you proceed?",
    "average_answer": "I asked them to try harder or compromised on what we could build.",
    "strong_answer": "Engineering told me real-time collaborative editing was impossible within our quarterly timeline. I scheduled a white-boarding session and asked, 'What part is impossible?' We realized conflict resolution was the timeline killer. I proposed a tradeoff: what if we implement field-level locking instead of true simultaneous typing? The user gets collision protection (the core need), and engineering said they could build that in 3 weeks. It was a massive success.",
    "feedback_average": ["No discovery of 'why'", "No creative negotiation", "Weak leadership"],
    "feedback_strong": ["Breaks down 'impossible'", "Partners with engineering", "Negotiates technical scope"],
    "improved_answer": "I drill down into exactly *which component* of the feature makes it impossible, identify the timeline killer, and propose a degraded scope that still solves the core user need.",
    "follow_up_questions": ["What if you can't find a degraded scope that works?", "How do you build trust with an engineering lead who defaults to 'impossible'?"],
    "traits_evaluated": ["technical communication", "scoping", "collaboration"],
    "ideal_answer_framework": "Dissect the Barrier → Identify the True Need → Propose Technical Compromise → Outcome"
  }
];

```


## server/data/structuredSWEQuestions.js

```javascript
export const structuredSWEQuestions = [
  {
    "id": "SWE001",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about a time you had to make a difficult architectural decision under pressure.",
    "average_answer": "I once had to choose between a microservices and monolith approach. I went with microservices because it's more scalable.",
    "strong_answer": "During a product launch with a hard deadline, we discovered our existing monolith couldn't handle projected load. I had to decide quickly between a partial extraction vs. a caching layer. I mapped the highest-traffic endpoints, ran load tests, and chose to introduce Redis caching first — which gave us 4x throughput without a risky refactor. I documented the tradeoff clearly for the team.",
    "feedback_average": ["Generic choice", "No pressure context", "Missing tradeoff reasoning"],
    "feedback_strong": ["Time-bound pressure shown", "Data-driven decision", "Documents outcome and tradeoffs"],
    "improved_answer": "Under deadline pressure, I evaluated two options, ran quick experiments, chose the lower-risk path based on data, and clearly communicated the tradeoffs and future plan to the team.",
    "follow_up_questions": ["What would you have done differently with more time?", "How did you validate the decision worked?"],
    "traits_evaluated": ["technical judgment", "pressure handling", "communication"],
    "ideal_answer_framework": "Context + Options Considered + Decision Criteria + Outcome + Lesson"
  },
  {
    "id": "SWE002",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Describe a technical tradeoff you made recently. What did you sacrifice and why?",
    "average_answer": "I chose speed over perfection once to meet a deadline.",
    "strong_answer": "We needed a reporting feature by end-of-sprint. I chose a synchronous approach instead of async queuing — sacrificing long-term scalability for delivery speed. I created a follow-up ticket to migrate to an async queue post-launch and communicated the tradeoff to the team so everyone understood the technical debt we were taking on.",
    "feedback_average": ["Too vague", "No category of tradeoff named", "Missing justification"],
    "feedback_strong": ["Clear tradeoff named", "Documented the debt", "Team-aware"],
    "improved_answer": "I explicitly chose delivery speed over scalability with a documented plan to refactor. I surfaced it as known debt immediately.",
    "follow_up_questions": ["Did you ever pay off that debt?", "How did the team react to the known compromise?"],
    "traits_evaluated": ["technical depth", "ownership", "communication"],
    "ideal_answer_framework": "Tradeoff Name + Why That Direction + What Was Given Up + Mitigation Plan"
  },
  {
    "id": "SWE003",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Walk me through a time when a critical system failed in production. How did you diagnose and resolve it?",
    "average_answer": "Our server went down once. I restarted it and then found the bug in the logs.",
    "strong_answer": "Our payment processing degraded silently during peak traffic. I noticed via alert that success rates dropped 12%. I pulled logs, identified repeated DB timeout errors on a specific query, traced it to a missing index introduced in a recent migration, added the index via a hot-patch, and authored a post-mortem with a checklist to catch similar issues in CI. Downtime was under 8 minutes.",
    "feedback_average": ["No diagnosis process shown", "No measurable impact", "No prevention step"],
    "feedback_strong": ["Structured diagnosis", "Measurable impact", "Root cause + prevention"],
    "improved_answer": "I diagnosed using alerts + logs, found the root cause (missing index), patched it in under 8 minutes, then wrote a post-mortem with a clear prevention checklist.",
    "follow_up_questions": ["How did you prevent the same issue from recurring?", "How did you communicate the incident to stakeholders?"],
    "traits_evaluated": ["debugging", "calmness under pressure", "accountability"],
    "ideal_answer_framework": "Detection → Diagnosis → Fix → Prevention → Communication"
  },
  {
    "id": "SWE004",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you ensure your code remains maintainable and scalable as a team grows?",
    "average_answer": "I write clean code and add comments.",
    "strong_answer": "I enforce patterns at three levels: (1) PR reviews focused on naming, single-responsibility, and test coverage; (2) architectural decision records (ADRs) for patterns above function-level; (3) onboarding docs with conventions guides. I also flag complexity debt proactively in tickets rather than letting it compound.",
    "feedback_average": ["Too surface-level", "Not team-scale", "No systematic approach"],
    "feedback_strong": ["Multi-layered strategy", "Team-aware", "Proactive, not reactive"],
    "improved_answer": "PR standards, ADRs, and explicit convention documentation — applied consistently so any new engineer can contribute confidently without tribal knowledge.",
    "follow_up_questions": ["How do you enforce standards without becoming a bottleneck?", "What happens when someone ignores your standards?"],
    "traits_evaluated": ["technical leadership", "scalability thinking", "team awareness"],
    "ideal_answer_framework": "Standards + Documentation + Review Culture + Proactive Debt Management"
  },
  {
    "id": "SWE005",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about the most difficult bug you've ever tracked down. What was your methodology?",
    "average_answer": "I once debugged a race condition. I added logs and eventually found it.",
    "strong_answer": "A user-reported bug caused intermittent data duplication in our order system. Reproduction rate was ~3%, impossible to reproduce locally. I added structured logging to capture thread IDs and timestamps, replicated it in staging under load using JMeter, identified it as a race condition in our optimistic lock, and fixed it by switching to a pessimistic lock pattern with a clear explanation in the commit.",
    "feedback_average": ["No reproduction strategy", "No isolation technique", "No outcome/impact"],
    "feedback_strong": ["Systematic methodology", "Tools named", "Root cause + fix + documentation"],
    "improved_answer": "I isolate intermittent bugs with structured logging and load simulation, form a hypothesis, validate in staging, then fix with a clear commit explanation.",
    "follow_up_questions": ["How did you know the fix actually worked?", "Have you ever needed to fix a bug without being able to reproduce it?"],
    "traits_evaluated": ["debugging systematically", "persistence", "technical depth"],
    "ideal_answer_framework": "Reproduce → Isolate → Hypothesize → Validate Fix → Document"
  },
  {
    "id": "SWE006",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you decide when to build a feature from scratch versus using a third-party library?",
    "average_answer": "I check if there's a good library first. If not, I build it.",
    "strong_answer": "I evaluate on four axes: maintenance burden, security risk, customization needs, and licensing constraints. If a library covers 90%+ of what we need, has active maintenance, and doesn't introduce a critical dependency risk — I use it. If it's in a trust-critical area like auth or payments, I default to well-audited libraries. If the need is highly specific, I build.",
    "feedback_average": ["Too casual", "No framework given", "Missing risk analysis"],
    "feedback_strong": ["Clear evaluation criteria", "Risk-aware", "Domain-specific thinking"],
    "improved_answer": "I evaluate libraries on maintenance activity, security posture, customization ceiling, and licensing. Build-vs-buy changes by domain.",
    "follow_up_questions": ["When have you regretted using a library?", "How do you handle a dependency that becomes abandoned?"],
    "traits_evaluated": ["judgment", "risk thinking", "pragmatism"],
    "ideal_answer_framework": "Evaluation Criteria + Domain Risk + Decision + Example"
  },
  {
    "id": "SWE007",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Explain how you design an API that needs to support both internal and external consumers.",
    "average_answer": "I make a REST API and document it well.",
    "strong_answer": "I separate contracts from implementation. External APIs are versioned (e.g., /v1/), more conservatively designed with strict backward compatibility guarantees, rate limiting, and detailed error codes. Internal APIs are more permissive but documented via OpenAPI or similar. I also enforce consumer-driven contract testing so internal changes can't silently break external consumers.",
    "feedback_average": ["No versioning strategy", "No consumer differentiation", "No stability guarantees"],
    "feedback_strong": ["Separate contracts", "Versioning strategy", "Testing methodology"],
    "improved_answer": "External APIs are versioned, stable-contract-first, with rate limits. Internal APIs share the same implementation but with relaxed constraints and contract tests guarding shared boundaries.",
    "follow_up_questions": ["How do you deprecate an API version?", "What's the hardest API versioning problem you've faced?"],
    "traits_evaluated": ["API design", "consumer empathy", "maintainability"],
    "ideal_answer_framework": "External vs Internal Contract + Versioning + Consumer Tests + Error Design"
  },
  {
    "id": "SWE008",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Tell me about a time your project was blocked by another team. How did you unblock it?",
    "average_answer": "I messaged them and asked them to prioritize our request.",
    "strong_answer": "Our backend release was blocked on an auth dependency from Platform team. Instead of waiting, I met with their lead, understood their backlog constraints, offered to write the specification myself so they just needed to review and merge, and agreed on a 3-day turnaround. We also added a feature flag so we could develop in parallel. This approach turned a potential 2-week block into a 4-day one.",
    "feedback_average": ["Passive approach", "No creative solution", "No resolution timeline"],
    "feedback_strong": ["Proactive ownership", "Cross-team empathy", "Parallel workstream created"],
    "improved_answer": "I proactively reduced the other team's burden by doing prep work myself, proposed a parallel track, and aligned on a concrete timeline — turning a blocker into a minor delay.",
    "follow_up_questions": ["How do you avoid getting blocked by the same team again?", "How do you handle it when a team simply can't prioritize you?"],
    "traits_evaluated": ["cross-team collaboration", "ownership", "creative problem solving"],
    "ideal_answer_framework": "Blocker Identified → Empathy → Creative Unblock → Parallel Track → Outcome"
  },
  {
    "id": "SWE009",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Describe a time you had to take ownership of a failing project that you didn't start.",
    "average_answer": "I took over a project and fixed it. It was messy but I managed.",
    "strong_answer": "I inherited a 6-month-behind project with no documentation and failing CI. Week 1, I did a full codebase audit, interviewed the original engineers, and created a brutally honest status report. Week 2, I scoped a realistic recovery plan — cut scope by 40%, stabilized the test suite, and established weekly stakeholder syncs. We shipped 8 weeks later, 20% over original timeline, with proper documentation in place.",
    "feedback_average": ["No diagnosis process", "No scope/tradeoff discussion", "No outcome metric"],
    "feedback_strong": ["Structured takeover", "Scope trade", "Outcome with numbers"],
    "improved_answer": "I diagnosed the root state, created a transparent status report, renegotiated scope with stakeholders, stabilized infra, and shipped — prioritizing honest communication throughout.",
    "follow_up_questions": ["How did you deal with morale on a failing project?", "What would you never do again in that situation?"],
    "traits_evaluated": ["ownership", "leadership", "communication"],
    "ideal_answer_framework": "Audit → Honest Assessment → Scoped Recovery Plan → Communication Rhythm → Outcome"
  },
  {
    "id": "SWE010",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "How do you debug an intermittent performance issue that only happens under specific load conditions?",
    "average_answer": "I add logging and try to reproduce it locally.",
    "strong_answer": "Intermittent perf issues require systematic narrowing. I start by defining the observable symptom precisely — latency spike? Memory climb? CPU burst? Then I replicate the load condition in staging using tooling like k6 or Locust. I add distributed tracing spans to pinpoint the slow path, then profile at the component level. I form hypotheses based on prior patterns (N+1 queries, lock contention, GC pressure) and instrument specifically.",
    "feedback_average": ["Local-only reproduction is insufficient", "No tooling named", "No systematic hypothesis generation"],
    "feedback_strong": ["Precise symptom definition", "Load tooling named", "Hypothesis-driven approach"],
    "improved_answer": "Define symptom precisely → replicate load in staging → add distributed traces → profile at component level → form and test specific hypotheses.",
    "follow_up_questions": ["How do you know when you've fixed a load-only performance issue?", "What's your go-to first signal when a perf issue is reported?"],
    "traits_evaluated": ["debugging methodology", "tooling knowledge", "systematic thinking"],
    "ideal_answer_framework": "Define Symptom → Replicate → Instrument → Profile → Hypothesize → Validate"
  },
  {
    "id": "SWE011",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "What is the harshest piece of technical feedback you've ever received, and how did you change?",
    "average_answer": "Someone told me my code was hard to read. I started writing cleaner code.",
    "strong_answer": "A senior engineer told me my PRs were 'too large to meaningfully review — you're treating reviews as a formality.' That stung, but they were right. I started decomposing every feature into atomic commits, each independently reviewable with a clear description. My review cycle time dropped by 60% and I noticed teammates actually engaging more deeply with my PRs.",
    "feedback_average": ["Feedback not specific enough", "No behavioral change shown", "No measurable impact"],
    "feedback_strong": ["Specific harsh feedback", "Real behavior change", "Measurable result"],
    "improved_answer": "I received harsh, valid feedback, sat with it, made a specific behavioral change, and tracked the result — it became a habit.",
    "follow_up_questions": ["How do you distinguish harsh feedback that's valid vs. unfair?", "Have you ever given similarly harsh feedback to someone else?"],
    "traits_evaluated": ["growth mindset", "self-awareness", "professionalism"],
    "ideal_answer_framework": "Feedback (specific) + Initial Reaction + Behavioral Change + Measurable Outcome"
  },
  {
    "id": "SWE012",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "Tell me about a time you completely misestimated a task. How did you recover?",
    "average_answer": "I underestimated a feature. I worked overtime to finish it.",
    "strong_answer": "I estimated a data migration at 3 days. At day 2.5, I was 30% done — severely underestimated the edge cases in the legacy data format. I immediately flagged to my manager, scoped a minimal viable migration to protect the deadline, deferred 4 edge cases with clear tickets and monitoring in place, and delivered the core on time. I then wrote a migration estimation checklist I still use.",
    "feedback_average": ["No proactive communication", "No partial delivery strategy", "No post-mortem"],
    "feedback_strong": ["Early escalation", "Scope negotiation", "Prevention artifact created"],
    "improved_answer": "When I realized the error early, I escalated immediately, negotiated a reduced deliverable, hit the core deadline, and turned the failure into a reusable estimation checklist.",
    "follow_up_questions": ["What would your estimation process look like now?", "How do you handle a teammate who consistently underestimates?"],
    "traits_evaluated": ["accountability", "planning", "communication"],
    "ideal_answer_framework": "Realize Early → Escalate → Reduce Scope Pragmatically → Deliver Core → Improve Process"
  },
  {
    "id": "SWE013",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Tell me about a time you inherited a massive, undocumented legacy codebase. Where did you start?",
    "average_answer": "I read through the code and asked people questions.",
    "strong_answer": "I started by running the tests that existed to understand what the system guaranteed. Then I traced the most frequently hit endpoints using logs. I built a dependency map by hand for the top 10 modules. Then I interviewed the two people with the most git blame and documented the implicit rules they held in their heads. Only then did I write code — and every PR I made added documentation as a first-class deliverable.",
    "feedback_average": ["No structured approach", "No documentation goal", "Too reactive"],
    "feedback_strong": ["Tests first", "Behavioral tracing", "Knowledge extraction from humans", "Documentation as deliverable"],
    "improved_answer": "Run tests → trace live traffic → map dependencies → extract tribal knowledge → document everything I touch.",
    "follow_up_questions": ["How long before you felt confident contributing?", "How did you handle parts of the code no one understood?"],
    "traits_evaluated": ["adaptability", "structured thinking", "knowledge management"],
    "ideal_answer_framework": "Tests → Trace → Map → Interview → Document Everything"
  },
  {
    "id": "SWE014",
    "category": "Software Engineer",
    "difficulty": "Medium",
    "question": "How do you mentor junior engineers who are consistently missing edge cases in their code?",
    "average_answer": "I review their code carefully and give them feedback.",
    "strong_answer": "I shift the mindset rather than just flagging the bug. I pair with them on a specific feature, walk through my edge-case thought process out loud, and ask 'what happens if X is null? What if this is called twice?' Then I give them an exercise: take their last PR and write a list of every assumption it makes. Most engineers who do this correctly never repeat the same class of miss. I also add tests for the cases they missed so it becomes self-documenting.",
    "feedback_average": ["Reactive not formative", "No teaching methodology", "No long-term change"],
    "feedback_strong": ["Transfers thought process, not just answers", "Exercise-based learning", "Tests as documentation"],
    "improved_answer": "I teach the edge-case mindset via live pairing and exercises, not just flagging bugs — so the behavior changes, not just the one file.",
    "follow_up_questions": ["What do you do if a junior doesn't improve after your coaching?", "How do you balance mentoring with your own delivery?"],
    "traits_evaluated": ["mentorship", "communication", "patience"],
    "ideal_answer_framework": "Mindset Shift + Live Modeling + Exercise + Tests as Documentation"
  },
  {
    "id": "SWE015",
    "category": "Software Engineer",
    "difficulty": "Hard",
    "question": "Walk me through your thought process when reviewing a pull request that introduces a significant risk.",
    "average_answer": "I check if the code looks right and leave comments on anything that seems wrong.",
    "strong_answer": "I start by reading the PR description and ticket to understand the intent, not just the diff. Then I review by category: correctness, security surface area, performance impact, test coverage, and rollback strategy. For risky PRs, I specifically ask: 'What's the blast radius if this breaks?' and 'Is there a feature flag?' I leave inline comments for small things and a top-level comment with my overall risk assessment and blockers vs. suggestions clearly separated.",
    "feedback_average": ["Only checks correctness", "No risk taxonomy", "No structured feedback format"],
    "feedback_strong": ["Intent-first reading", "Multi-axis risk review", "Structured feedback format", "Blast radius thinking"],
    "improved_answer": "I review intent first, then check correctness, security, perf, tests, and rollback strategy — separating blockers from suggestions and always naming the blast radius.",
    "follow_up_questions": ["How do you handle a disagreement with an author who pushes back on your review?", "When is a PR too risky to approve?"],
    "traits_evaluated": ["technical judgment", "code quality ownership", "communication"],
    "ideal_answer_framework": "Intent → Multi-Axis Review → Blast Radius → Structured Feedback (Blockers vs. Suggestions)"
  }
];

```


## server/lib/fileDb.js

```javascript
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'sessions.json');

function ensureDb() {
  if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ sessions: [] }, null, 2));
  }
}

export function readDb() {
  ensureDb();
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

export function writeDb(data) {
  ensureDb();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

```


## server/lib/questionBank.js

```javascript
import { structuredSWEQuestions } from '../data/structuredSWEQuestions.js';
import { structuredHRQuestions } from '../data/structuredHRQuestions.js';
import { structuredPMQuestions } from '../data/structuredPMQuestions.js';
import { structuredDAQuestions } from '../data/structuredDAQuestions.js';

// Convert our advanced schemas into the v3 expectations
function mapper(qArr, roleLabel) {
  return qArr.map(q => ({
    id: q.id,
    role: roleLabel,
    category: typeof q === 'object' ? q.category : 'General',
    difficulty: typeof q === 'object' ? (q.difficulty || 'Medium').toLowerCase() : 'medium',
    question: typeof q === 'object' ? q.question : q,
    keywords: typeof q === 'object' ? (q.traits_evaluated || []) : [],
    ideal_answer_framework: typeof q === 'object' ? q.ideal_answer_framework : 'Use the STAR method.',
    expectedPoints: typeof q === 'object' ? (q.feedback_average || []) : [],
    strong_answer: typeof q === 'object' ? q.strong_answer : 'N/A'
  }));
}

export const questionBank = [
  ...mapper(structuredSWEQuestions, 'software-engineer'),
  ...mapper(structuredPMQuestions, 'product-manager'),
  ...mapper(structuredDAQuestions, 'data-analyst'),
  ...mapper(structuredHRQuestions, 'hr-general')
];

export const personaProfiles = {
  'calm-senior-interviewer': {
    name: 'Ananya Rao',
    title: 'Senior Interviewer',
    style: 'Calm, deliberate, and detail-oriented.',
    pressureMultiplier: 1,
    intro: 'Welcome. I will evaluate clarity, structure, and evidence. Take a breath, and answer with specifics.'
  },
  'friendly-recruiter': {
    name: 'Maya Singh',
    title: 'Talent Partner',
    style: 'Warm, encouraging, but still precise.',
    pressureMultiplier: 0.8,
    intro: 'Hi there. I want you to do well, but I will still push for clear and specific answers.'
  },
  'strict-panelist': {
    name: 'Arjun Mehta',
    title: 'Technical Panelist',
    style: 'Sharp, direct, and high-pressure.',
    pressureMultiplier: 1.35,
    intro: 'This round will be direct. Keep your answers structured, specific, and efficient.'
  },
  'startup-founder': {
    name: 'Kabir Shah',
    title: 'Founder Interviewer',
    style: 'Fast-moving, practical, and impact focused.',
    pressureMultiplier: 1.15,
    intro: 'I care about ownership, speed, and judgment. Keep it practical and outcome oriented.'
  }
};

```


## server/lib/scoring.js

```javascript
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
  "metrics": {
    "relevance": number (0 to 10),
    "clarity": number (0 to 10),
    "structure": number (0 to 10),
    "specificity": number (0 to 10),
    "confidence": number (0 to 10),
    "delivery": number (0 to 10),
    "roleFit": number (0 to 10),
    "overall": number (0 to 10)
  },
  "evidence": ["string array of evidence supporting the scores"],
  "strengths": ["string array"],
  "weaknesses": ["string array"],
  "improvements": ["string array of actionable advice"],
  "missingPoints": ["string array of anything expected that they missed"],
  "rewrite": "A stronger, perfect way the candidate could have answered.",
  "followUp": "A direct follow-up challenge probing the weakest part of their answer. Keep it under 20 words."
}
Be sharp, honest, and do not use generic fluff.
  `;

  const fallbackData = {
    metrics: { relevance: 6, clarity: 6, structure: 6, specificity: 5, confidence: 6, delivery: 6, roleFit: 6, overall: 6 },
    evidence: ["Answer captured via emergency fallback."],
    strengths: ["Attempted to answer the prompt."],
    weaknesses: ["Lacked specific metrics and clarity."],
    improvements: ["Use the STAR method rigidly."],
    missingPoints: ["Deep technical evidence."],
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
      analysis: {
        metrics: parsed.metrics,
        evidence: parsed.evidence,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        improvements: parsed.improvements,
        missingPoints: parsed.missingPoints,
        rewrite: parsed.rewrite,
        responseSeconds
      },
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
Score: ${t.analysis?.metrics?.overall || 0}/10
`).join('\n');

  const prompt = `
You are an evaluating committee reviewing a complete interview loop for a ${session.role}.

Transcript:
${transcriptText}

Provide an overall final verdict and thematic summary.
Return ONLY valid JSON matching this exact structure:
{
  "averageMetrics": {
      "overall": number (0-10),
      "relevance": number (0-10),
      "structure": number (0-10),
      "specificity": number (0-10),
      "confidence": number (0-10)
  },
  "strengths": ["string array of top 3 global strengths"],
  "weaknesses": ["string array of top 3 critical weaknesses"],
  "missingThemes": ["string array of concepts they completely missed giving evidence for"],
  "recommendation": "A harsh, honest 2-sentence final hiring recommendation."
}
`;

  const fallbackSummary = {
    averageMetrics: { overall: 6.5, relevance: 6.5, structure: 6.0, specificity: 5.5, confidence: 6.0 },
    strengths: ["Completed the interview loop properly."],
    weaknesses: ["Did not consistently display mastery of details."],
    missingThemes: ["Impact metrics", "Trade-off analysis"],
    recommendation: "Borderline. Needs to be much sharper under pressure."
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

```


## server/lib/sessionEngine.js

```javascript
import { nanoid } from 'nanoid';
import { personaProfiles, questionBank } from './questionBank.js';
import { analyzeAnswer, summarizeSession } from './scoring.js';
import { readDb, writeDb } from './fileDb.js';

function tokenize(text) {
  return (text || '')
    .split(/[^a-zA-Z0-9+#.]+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 2);
}

function scoreQuestion(question, session) {
  const profileTokens = new Set([...tokenize(session.resumeText), ...tokenize(session.jdText)]);
  const keywordScore = (question.keywords || []).reduce((sum, token) => sum + (profileTokens.has(token) ? 2 : 0), 0);
  const diffBoost = session.difficulty === question.difficulty ? 2 : 0;
  const modeBoost = session.interviewMode?.toLowerCase().includes(question.category || '') ? 2 : 0;
  const pressureBoost = session.pressureMode === 'high-pressure' && question.difficulty === 'hard' ? 1 : 0;
  return keywordScore + diffBoost + modeBoost + pressureBoost;
}

function pickQuestion(session) {
  const candidates = questionBank
    .filter((q) => q.role === session.role && !session.askedQuestionIds.includes(q.id))
    .sort((a, b) => scoreQuestion(b, session) - scoreQuestion(a, session));

  return candidates[0] || questionBank.find((q) => q.role === session.role) || questionBank[0];
}

function pressureShift(session, analysis) {
  const base = session.pressureScore || 50;
  let delta = 0;
  if ((analysis.metrics?.overall || 0) < 6.2) delta += 8;
  if ((analysis.metrics?.confidence || 0) >= 7.5) delta -= 4;
  if ((analysis.metrics?.specificity || 0) >= 7.5) delta -= 3;
  if (session.persona === 'strict-panelist') delta += 4;
  if (session.pressureMode === 'high-pressure') delta += 6;
  return Math.max(20, Math.min(95, base + delta));
}

export function createSession(payload) {
  const db = readDb();
  const personaMeta = personaProfiles[payload.persona] || personaProfiles['calm-senior-interviewer'];
  const session = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    role: payload.role,
    candidateName: payload.candidateName,
    interviewMode: payload.interviewMode,
    difficulty: payload.difficulty,
    persona: payload.persona,
    pressureMode: payload.pressureMode || 'balanced',
    resumeText: payload.resumeText || '',
    jdText: payload.jdText || '',
    askedQuestionIds: [],
    currentQuestion: null,
    transcript: [],
    pressureScore: payload.pressureMode === 'high-pressure' ? 72 : 48,
    interviewer: personaMeta,
    endedAt: null,
    summary: null
  };

  const firstQuestion = pickQuestion(session);
  session.currentQuestion = firstQuestion;
  session.askedQuestionIds.push(firstQuestion.id);
  db.sessions.unshift(session);
  writeDb(db);

  return {
    session,
    firstQuestion: firstQuestion.question,
    interviewerIntro: `${personaMeta.intro} First question: ${firstQuestion.question}`
  };
}

export function getSession(sessionId) {
  const db = readDb();
  return db.sessions.find((session) => session.id === sessionId);
}

// Convert answerQuestion to an async function to support AI evaluation
export async function answerQuestion(sessionId, answer, meta = {}) {
  const db = readDb();
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('Session not found');

  const questionObj = session.currentQuestion || questionBank.find((q) => q.id === session.askedQuestionIds.at(-1));
  
  // Real OpenRouter AI Analysis
  const aiPayload = await analyzeAnswer({
    answer,
    question: questionObj.question,
    role: session.role,
    transcriptSoFar: session.transcript,
    rubric: questionObj,
    pressureScore: session.pressureScore,
    responseSeconds: meta.responseSeconds || 0
  });

  const analysis = aiPayload.analysis;
  const followUp = aiPayload.followUp;

  session.transcript.push({
    question: questionObj.question,
    questionMeta: questionObj,
    answer,
    createdAt: new Date().toISOString(),
    analysis,
    followUp,
    responseSeconds: meta.responseSeconds || 0,
    pressureScoreBefore: session.pressureScore
  });

  session.pressureScore = pressureShift(session, analysis);
  
  // Choose the next question based on shifting pool priorities
  const nextQuestion = pickQuestion(session);
  session.currentQuestion = nextQuestion;
  if (nextQuestion && !session.askedQuestionIds.includes(nextQuestion.id)) {
    session.askedQuestionIds.push(nextQuestion.id);
  }

  writeDb(db);

  return {
    analysis,
    followUp,
    nextQuestion: nextQuestion?.question || null,
    pressureScore: session.pressureScore,
    interviewerMood: session.pressureScore >= 75 ? 'skeptical' : analysis.metrics.overall >= 7.3 ? 'impressed' : 'neutral'
  };
}

// Convert to async just in case summarizeSession becomes an AI endpoint later
export async function endSession(sessionId) {
  const db = readDb();
  const session = db.sessions.find((item) => item.id === sessionId);
  if (!session) throw new Error('Session not found');
  session.endedAt = new Date().toISOString();
  
  // Real OpenRouter AI Summary
  session.summary = await summarizeSession(session);
  
  writeDb(db);
  return session.summary;
}

export function listSessions() {
  const db = readDb();
  return db.sessions.map((session) => ({
    id: session.id,
    createdAt: session.createdAt,
    endedAt: session.endedAt,
    role: session.role,
    candidateName: session.candidateName,
    interviewMode: session.interviewMode,
    difficulty: session.difficulty,
    summary: session.summary
  }));
}

```


## server/routes/interviewRoutes.js

```javascript
import express from 'express';
import { answerQuestion, createSession, endSession, getSession, listSessions } from '../lib/sessionEngine.js';
import { questionBank } from '../lib/questionBank.js';

const router = express.Router();

router.get('/sessions', (_req, res) => {
  res.json(listSessions());
});

router.get('/sessions/:id', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

router.get('/question-bank', (req, res) => {
  const { role } = req.query;
  const rows = role ? questionBank.filter((item) => item.role === role) : questionBank;
  res.json({ count: rows.length, questions: rows });
});

router.post('/start', (req, res) => {
  const { role, candidateName, interviewMode, difficulty, persona, resumeText, jdText, pressureMode } = req.body;
  if (!role || !candidateName) return res.status(400).json({ error: 'role and candidateName are required' });
  const result = createSession({ role, candidateName, interviewMode, difficulty, persona, resumeText, jdText, pressureMode });
  res.status(201).json(result);
});

router.post('/answer', async (req, res) => {
  const { sessionId, answer, responseSeconds } = req.body;
  if (!sessionId || !answer) return res.status(400).json({ error: 'sessionId and answer are required' });
  try {
    const result = await answerQuestion(sessionId, answer, { responseSeconds });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/end', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  try {
    const summary = await endSession(sessionId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

```

