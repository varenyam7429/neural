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
