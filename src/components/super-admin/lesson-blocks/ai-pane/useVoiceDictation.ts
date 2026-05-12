import { useCallback, useEffect, useRef, useState } from "react";

type SR = any;

export interface UseVoiceDictationResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string; // accumulating interim transcript (cleared on stop)
  start: () => void;
  stop: () => void;
  error: string | null;
}

export function useVoiceDictation(opts: {
  onFinal: (text: string) => void;
}): UseVoiceDictationResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SR | null>(null);
  const onFinalRef = useRef(opts.onFinal);
  onFinalRef.current = opts.onFinal;

  useEffect(() => {
    const SpeechRecognition =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition)) ||
      null;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const start = useCallback(() => {
    setError(null);
    const SpeechRecognition =
      (typeof window !== "undefined" &&
        ((window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition)) ||
      null;
    if (!SpeechRecognition) {
      setError("Voice dictation not supported in this browser.");
      return;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    const rec: SR = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang =
      (typeof navigator !== "undefined" && navigator.language) || "en-US";

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          if (text) onFinalRef.current(text);
        } else {
          interim += text;
        }
      }
      setTranscript(interim);
    };
    rec.onerror = (event: any) => {
      setError(event?.error || "Voice dictation error");
    };
    rec.onend = () => {
      setIsListening(false);
      setTranscript("");
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch (e: any) {
      setError(e?.message || "Could not start voice dictation");
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { isSupported, isListening, transcript, start, stop, error };
}
