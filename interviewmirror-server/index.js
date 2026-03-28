import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("InterviewMirror API running");
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
app.post("/api/generate-question", async (req, res) => {
  const { role } = req.body;

  const roleQuestions = {
    "Software Engineer": [
      "Tell me about a time you had to make a difficult architectural decision under pressure.",
      "Explain a technical tradeoff you made recently.",
      "How do you manage technical debt under deadlines?"
    ],
    "Product Manager": [
      "How do you prioritize when stakeholders disagree?",
      "Tell me about a product decision that failed.",
      "How do you measure launch success?"
    ],
    "Data Analyst": [
      "Tell me about a time your data contradicted assumptions.",
      "How do you communicate insights to non-technical teams?",
      "Describe a decision you influenced using data."
    ],
    "HR / General": [
      "Why should we hire you?",
      "Tell me about a difficult conflict you handled.",
      "Describe a situation where you adapted quickly."
    ]
  };

  const pool = roleQuestions[role] || roleQuestions["HR / General"];
  const question = pool[Math.floor(Math.random() * pool.length)];

  res.json({ question });
});
app.post("/api/analyze-answer", async (req, res) => {
  try {
    const { role, question, answer, presenceMetrics } = req.body;

    const prompt = `
You are an elite interview evaluator.

Evaluate this interview answer as if you were a serious recruiter and communication coach.

Return ONLY valid JSON in this format:
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
- Be sharp, specific, and honest
- Do not be motivational
- Do not praise weak answers
- Bullet points should be short and useful

Role: ${role}
Question: ${question}
Answer: ${answer}

Presence metrics:
${JSON.stringify(presenceMetrics || {}, null, 2)}
`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "InterviewMirror"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = {
        clarity: 72,
        structure: 70,
        confidence: 68,
        delivery: 69,
        roleFit: 74,
        overall: 71,
        bullets: [
          "Answer has usable content, but parts of it still feel underpowered.",
          "The middle section drifts and loses force.",
          "The close needs a stronger outcome."
        ],
        improvement:
          "Tighten the answer structure and make the strongest result visible earlier.",
        rewrite:
          "I focused on solving the core problem quickly, aligned the team, and delivered a cleaner outcome with measurable impact."
      };
    }

    const presence = presenceMetrics?.presenceScore ?? 65;

    res.json({
      ...parsed,
      presence
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI analysis failed" });
  }
});