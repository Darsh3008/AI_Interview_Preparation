import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/gemini.service.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";

/* ==========================================================
   Resume Analysis
========================================================== */

export const analyzeResume = async (req, res) => {
  let filePath = "";

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Resume file is required.",
      });
    }

    filePath = req.file.path;

    const fileBuffer = await fs.promises.readFile(filePath);

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
    }).promise;

    let resumeText = "";

    for (let page = 1; page <= pdf.numPages; page++) {
      const currentPage = await pdf.getPage(page);
      const content = await currentPage.getTextContent();

      resumeText +=
        content.items.map((item) => item.str).join(" ") + "\n";
    }

    resumeText = resumeText.replace(/\s+/g, " ").trim();

    const messages = [
      {
        role: "system",
        content: `
You are an expert resume parser.

Extract ONLY the following information.

Return ONLY valid JSON.

{
  "role":"",
  "experience":"",
  "projects":[],
  "skills":[]
}
        `,
      },
      {
        role: "user",
        content: resumeText,
      },
    ];

    const aiResponse = await askAi(messages);

    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned an empty response.",
      });
    }

    const cleaned = aiResponse
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Invalid Resume JSON");
      console.error(cleaned);

      return res.status(500).json({
        message: "AI returned invalid JSON.",
      });
    }

    return res.status(200).json({
      role: parsed.role || "",
      experience: parsed.experience || "",
      projects: parsed.projects || [],
      skills: parsed.skills || [],
      resumeText,
    });
  } catch (error) {
    console.error("Resume Analysis Error:", error);

    return res.status(500).json({
      message: error.message || "Internal Server Error",
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }
};

/* ==========================================================
   Generate Interview Questions
========================================================== */

export const generateQuestion = async (req, res) => {
  try {
    let {
      role,
      experience,
      mode,
      resumeText,
      projects,
      skills,
    } = req.body;

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res.status(400).json({
        message: "Role, Experience and Mode are required.",
      });
    }

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Minimum 50 credits are required.",
      });
    }

    const projectText =
      Array.isArray(projects) && projects.length
        ? projects.join(", ")
        : "None";

    const skillsText =
      Array.isArray(skills) && skills.length
        ? skills.join(", ")
        : "None";

    const safeResume = resumeText?.trim() || "None";

    const prompt = `
Role: ${role}

Experience: ${experience}

Interview Mode: ${mode}

Projects: ${projectText}

Skills: ${skillsText}

Resume:
${safeResume}
`;

    const messages = [
      {
        role: "system",
        content: `
You are an experienced technical interviewer.

Generate exactly FIVE interview questions.

Rules:

- Ask naturally like a human interviewer.
- Keep English simple.
- One question per line.
- No numbering.
- No bullets.
- No markdown.
- No explanation.

Difficulty:

Q1 → Easy
Q2 → Easy
Q3 → Medium
Q4 → Medium
Q5 → Hard

Questions must be based on:

- Role
- Experience
- Interview Mode
- Resume
- Skills
- Projects
        `,
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const aiResponse = await askAi(messages);

    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        message: "AI returned empty response.",
      });
    }

    const questions = aiResponse
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 5);

    if (questions.length !== 5) {
      return res.status(500).json({
        message: "AI failed to generate exactly five questions.",
      });
    }

    user.credits -= 50;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      resumeText: safeResume,

      questions: questions.map((question, index) => ({
        question,
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
        timeLimit: [60, 60, 90, 90, 120][index],
      })),
    });

    return res.status(201).json({
      success: true,
      interviewId: interview._id,
      userName: user.name,
      creditsLeft: user.credits,
      questions: interview.questions,
    });
  } catch (error) {
    console.error("Generate Question Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}; export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body;

    /* ===============================
       Validate Request
    =============================== */

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: "Interview ID is required.",
      });
    }

    if (
      questionIndex === undefined ||
      questionIndex === null ||
      questionIndex < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid question index.",
      });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    if (questionIndex >= interview.questions.length) {
      return res.status(400).json({
        success: false,
        message: "Question index out of range.",
      });
    }

    const question = interview.questions[questionIndex];

    /* ===============================
       Empty Answer
    =============================== */

    if (!answer || answer.trim() === "") {
      question.answer = "";

      question.communication = 0;
      question.confidence = 0;
      question.correctness = 0;
      question.score = 0;

      question.feedback =
        "Question was skipped by the candidate.";

      await interview.save();

      return res.status(200).json({
        success: true,
        communication: 0,
        confidence: 0,
        correctness: 0,
        score: 0,
        feedback: question.feedback,
      });
    }

    /* ===============================
       Time Limit Check
    =============================== */

    if (timeTaken > question.timeLimit) {
      question.answer = answer;

      question.communication = 0;
      question.confidence = 0;
      question.correctness = 0;
      question.score = 0;

      question.feedback =
        "Time limit exceeded. Answer was not evaluated.";

      await interview.save();

      return res.status(200).json({
        success: true,
        communication: 0,
        confidence: 0,
        correctness: 0,
        score: 0,
        feedback: question.feedback,
      });
    }

    /* ===============================
       AI Evaluation
    =============================== */

    const messages = [
      {
        role: "system",
        content: `
You are a senior software engineering interviewer.

Evaluate the candidate's answer realistically.

Score each category from 0 to 10.

Scoring Rubric:

0-2 = Completely incorrect

3-4 = Weak

5-6 = Average

7-8 = Good

9-10 = Excellent

Evaluate:

1. Communication
2. Confidence
3. Correctness

Do NOT return a final score.

Return ONLY valid JSON.

{
  "communication":7,
  "confidence":8,
  "correctness":9,
  "feedback":"Your explanation was technically correct. Add more real-world examples."
}
        `,
      },
      {
        role: "user",
        content: `
Question:
${question.question}

Candidate Answer:
${answer}
        `,
      },
    ];

    const aiResponse = await askAi(messages);

    if (!aiResponse || !aiResponse.trim()) {
      return res.status(500).json({
        success: false,
        message: "AI returned an empty response.",
      });
    }

    /* ===============================
       Parse AI JSON
    =============================== */

    const cleaned = aiResponse
      .replace(/^```json/, "")
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Invalid AI JSON:");
      console.error(cleaned);

      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON.",
      });
    }

    /* ===============================
       Save Scores
    =============================== */

    const communication =
      Number(parsed.communication) || 0;

    const confidence =
      Number(parsed.confidence) || 0;

    const correctness =
      Number(parsed.correctness) || 0;

    // Final score out of 10
    const finalScore = Number(
      (
        (communication +
          confidence +
          correctness) /
        3
      ).toFixed(1)
    );

    question.answer = answer;

    question.communication = communication;
    question.confidence = confidence;
    question.correctness = correctness;

    question.score = finalScore;

    question.feedback =
      parsed.feedback ||
      "No feedback generated.";

    await interview.save();

    /* ===============================
       Response
    =============================== */

    return res.status(200).json({
      success: true,

      communication,

      confidence,

      correctness,

      score: finalScore,

      feedback: question.feedback,
    });
  } catch (error) {
    console.error("Submit Answer Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
}; export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return res.status(400).json({
        success: false,
        message: "Interview ID is required.",
      });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;

    

    const avgConfidence =
      totalQuestions
        ? interview.questions.reduce(
          (sum, q) => sum + (q.confidence || 0),
          0
        ) / totalQuestions
        : 0;

    const avgCommunication =
      totalQuestions
        ? interview.questions.reduce(
          (sum, q) => sum + (q.communication || 0),
          0
        ) / totalQuestions
        : 0;

    const avgCorrectness =
      totalQuestions
        ? interview.questions.reduce(
          (sum, q) => sum + (q.correctness || 0),
          0
        ) / totalQuestions
        : 0;

    // Store averages
    interview.finalScore = Number(finalScore.toFixed(1));
    interview.confidence = Number(avgConfidence.toFixed(1));
    interview.communication = Number(avgCommunication.toFixed(1));
    interview.correctness = Number(avgCorrectness.toFixed(1));

    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      success: true,

      interviewId: interview._id,

      finalScore: interview.finalScore,

      confidence: interview.confidence,

      communication: interview.communication,

      correctness: interview.correctness,

      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: q.score,
        communication: q.communication,
        confidence: q.confidence,
        correctness: q.correctness,
        feedback: q.feedback,
      })),
    });
  } catch (error) {
    console.error("Finish Interview Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}; export const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      userId: req.userId,
    })
      .sort({ createdAt: -1 })
      .select(
        "role experience mode finalScore status createdAt"
      );

    return res.status(200).json(interviews);
  } catch (error) {
    console.error("Get Interviews Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}; export const getInterviewReport = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: "Interview not found.",
      });
    }

    return res.status(200).json({
      role: interview.role,
      experience: interview.experience,
      mode: interview.mode,
      status: interview.status,
      createdAt: interview.createdAt,

      finalScore: interview.finalScore || 0,

      confidence: interview.confidence || 0,

      communication: interview.communication || 0,

      correctness: interview.correctness || 0,

      questionWiseScore: interview.questions.map(
        (q) => ({
          question: q.question,
          answer: q.answer,
          score: q.score,
          confidence: q.confidence,
          communication: q.communication,
          correctness: q.correctness,
          feedback: q.feedback,
        })
      ),
    });
  } catch (error) {
    console.error("Interview Report Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};