import { useEffect, useRef, useState } from "react";

// Web Speech API hook — STT (SpeechRecognition) + TTS (speechSynthesis)
export function useVoice({ onTranscript, lang = "en-US" } = {}) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || !window.speechSynthesis) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
      if (t && onTranscript) onTranscript(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch {} };
    // eslint-disable-next-line
  }, [lang]);

  const startListening = () => {
    if (!recRef.current || listening) return;
    try { recRef.current.start(); setListening(true); } catch {}
  };
  const stopListening = () => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch {}
    setListening(false);
  };
  const speak = (text, opts = {}) => {
    if (!window.speechSynthesis || !text) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = opts.rate || 1.05;
    utt.pitch = opts.pitch || 1;
    utt.lang = lang;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };
  const stopSpeaking = () => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return { listening, speaking, supported, startListening, stopListening, speak, stopSpeaking };
}
