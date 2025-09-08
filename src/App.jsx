import React, { useState, useEffect, useRef, useCallback } from "react";

// ✅ Vite environment variable
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export default function App() {
  const [question, setQuestion] = useState("Loading question...");
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const recognitionRef = useRef(null);

  const getFeedback = useCallback(
    async (answer) => {
      setFeedback("Analyzing your answer with AI...");

      try {
        const prompt = `
You are an expert JavaScript interviewer. The candidate answered the question below.

Question: ${question}

Candidate's answer: ${answer}

Please provide constructive, detailed feedback on the answer, highlighting strengths, weaknesses, and suggestions for improvement. Keep it concise but helpful.
`;

        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.7,
              max_tokens: 300,
            }),
          }
        );

        const data = await response.json();
        console.log("Feedback API Response:", data);

        if (data.error) {
          setFeedback(`⚠️ API Error: ${data.error.message}`);
        } else if (data.choices?.length > 0) {
          setFeedback(data.choices[0].message.content.trim());
        } else {
          setFeedback(
            "⚠️ Unable to get feedback. This may be due to API quota being exceeded or temporary server issues. Please check your OpenAI billing/plan or try again later."
          );
        }
      } catch (error) {
        console.error("Error fetching feedback:", error);
        setFeedback(
          "⚠️ Error getting feedback. Check your API key, billing, and network connection."
        );
      }
    },
    [question]
  );

  const fetchRandomQuestion = useCallback(async () => {
    setLoadingQuestion(true);
    setQuestion("Loading question...");
    setTranscript("");
    setFeedback("");

    try {
      const prompt =
        "Generate a single, clear, and concise JavaScript interview question suitable for a mid-level developer. Make it unique each time. Return only the question without any numbering or extra text.";

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
            max_tokens: 60,
          }),
        }
      );

      const data = await response.json();
      console.log("Question API Response:", data);

      if (data.error) {
        setQuestion(`⚠️ API Error: ${data.error.message}`);
      } else if (data.choices?.length > 0) {
        setQuestion(data.choices[0].message.content.trim());
      } else {
        setQuestion(
          "⚠️ Unable to fetch a new question. This may be due to API quota being exceeded or temporary server issues. Please check your OpenAI billing/plan or try again later."
        );
      }
    } catch (error) {
      console.error("Error fetching question:", error);
      setQuestion(
        "⚠️ Error loading question. Check your API key, billing, and network connection."
      );
    } finally {
      setLoadingQuestion(false);
    }
  }, []);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(
        "Your browser does not support Speech Recognition. Please use Chrome."
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      setIsListening(false);
      getFeedback(speechResult);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [getFeedback]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript("");
      setFeedback("");
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (OPENAI_API_KEY) {
      fetchRandomQuestion();
    } else {
      setQuestion("⚠️ Please set your OpenAI API key in .env");
    }
  }, [fetchRandomQuestion]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 mb-6 text-center">
        🎤 JS Interview Coach
      </h1>

      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
              Random Question:
            </h2>
            <div className="min-h-[80px] p-3 sm:p-4 bg-gray-50 border-l-4 border-indigo-600 rounded text-sm sm:text-base">
              {question}
            </div>
            <button
              onClick={fetchRandomQuestion}
              disabled={loadingQuestion}
              className={`mt-4 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-md text-white font-semibold ${
                loadingQuestion
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loadingQuestion ? "Loading..." : "New Question"}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
              Your Response
            </h2>
            <button
              onClick={startListening}
              disabled={isListening || loadingQuestion}
              className={`mb-4 w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 rounded-md text-white font-semibold ${
                isListening || loadingQuestion
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {isListening ? "Listening..." : "Speak Your Answer"}
            </button>
            <div className="p-3 sm:p-4 bg-gray-50 border rounded min-h-[80px] text-sm sm:text-base">
              <p className="text-gray-600">
                {transcript || "🎙️ Your spoken answer will appear here..."}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">
            AI Feedback
          </h2>
          <div className="p-3 sm:p-4 bg-gray-50 border rounded min-h-[200px] text-sm sm:text-base">
            <p
              className={`whitespace-pre-wrap text-gray-700 ${
                feedback.startsWith("Analyzing") ? "italic" : ""
              }`}
            >
              {feedback || "🤖 AI feedback will appear here after you answer."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
