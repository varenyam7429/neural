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
