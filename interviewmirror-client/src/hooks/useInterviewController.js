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
