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
