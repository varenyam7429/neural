import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("InterviewMirror AI API running");
});

const roleQuestions = {
  "Software Engineer": [
    "Tell me about a time you had to make a difficult architectural decision under pressure.",
    "Describe a technical tradeoff you made recently and why you made it.",
    "How do you handle technical debt when deadlines are tight?",
  ],
  "Product Manager": [
    "Tell me about a time you had to prioritize competing stakeholder demands.",
    "Describe a product decision that failed and what you learned from it.",
    "How do you measure whether a product launch was successful?",
  ],
  "Data Analyst": [
    "Tell me about a time your analysis challenged a team’s assumption.",
    "How do you communicate complex data insights to non-technical stakeholders?",
    "Describe a business decision you influenced using data.",
  ],
  "HR / General": [
    "Why should we hire you for this role?",
    "Tell me about a difficult conflict you handled professionally.",
    "Describe a situation where you had to adapt quickly under pressure.",
  ],
};

app.post("/api/generate-question", async (req, res) => {
  const { role } = req.body;
  const pool = roleQuestions[role] || roleQuestions["HR / General"];
  const question = pool[Math.floor(Math.random() * pool.length)];
  res.json({ question });
});

app.post("/api/generate-followup", async (req, res) => {
  try {
    const { role, question, answer } = req.body;

    const prompt = `
You are a sharp, realistic interviewer.

Generate ONE concise follow-up question based on the candidate's answer.

Rules:
- Be specific
- Sound like a real interviewer
- Keep it under 20 words
- No explanation, only the question

Role: ${role}
Original Question: ${question}
Candidate Answer: ${answer}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
    });

    const data = await response.json();
    const followUp =
      data.choices?.[0]?.message?.content?.trim() ||
      "Can you explain the measurable impact of that decision?";

    res.json({ followUp });
  } catch (error) {
    console.error("Follow-up generation error:", error);
    res.json({
      followUp: "Can you explain the measurable impact of that decision?",
    });
  }
});

app.post("/api/analyze-answer", async (req, res) => {
  try {
    const { role, question, answer, presenceMetrics } = req.body;

    const prompt = `
You are an elite recruiter and communication coach.

Evaluate the following interview answer.

Return ONLY valid JSON in this exact format:
{
  "clarity": number,
  "structure": number,
  "confidence": number,
  "delivery": number,
  "roleFit": number,
  "overall": number,
  "bullets": ["...", "...", "..."],
  "improvement": "...",
  "rewrite": "..."
}

Rules:
- Score from 0 to 100
- Be sharp and honest
- Do not be motivational
- Do not overpraise
- Bullets should be concise and useful

Role: ${role}
Question: ${question}
Answer: ${answer}

Presence Metrics:
${JSON.stringify(presenceMetrics, null, 2)}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
    });

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        clarity: 76,
        structure: 72,
        confidence: 70,
        delivery: 68,
        roleFit: 78,
        overall: 73,
        bullets: [
          "The answer has usable content, but the structure drifts in the middle.",
          "The impact should be made clearer and quantified earlier.",
          "Delivery feels slightly cautious instead of decisive.",
        ],
        improvement:
          "Use a tighter STAR-style structure and make the strongest business or technical outcome visible earlier.",
        rewrite:
          "I focused on solving the core issue quickly, aligned the team around the best tradeoff, and delivered a more stable outcome with measurable impact.",
      };
    }

    res.json({
      ...parsed,
      presence: presenceMetrics?.presenceScore ?? 70,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});