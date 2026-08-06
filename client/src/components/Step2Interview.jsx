import React, { useEffect, useRef, useState } from "react";
import maleVideo from "../assets/Videos/male-ai.mp4";
import femaleVideo from "../assets/Videos/female-ai.mp4";
import Timer from "./Timer";
import { motion } from "framer-motion";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import axios from "axios"
import { ServerUrl } from "../App.jsx"
import { useNavigate } from "react-router-dom";

const Step2Interview = ({ interviewData, onFinish }) => {
  const { interviewId, questions, userName } = interviewData;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [timeLeft, setTimeLeft] = useState(
    questions?.[0]?.timeLimit ?? 60
  );

  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceGender, setVoiceGender] = useState("female");

  const [subtitle, setSubtitle] = useState("");

  const [isIntroPhase, setIsIntroPhase] = useState(true);

  const [isAIPlaying, setIsAIPlaying] = useState(false);

  const [isMicON, setIsMicOn] = useState(false);

  const recognitionRef = useRef(null);

  const videoRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const currentQuestion = questions[currentIndex];

  const videoSource =
    voiceGender === "male" ? maleVideo : femaleVideo;
  

  const navigate = useNavigate();

  /* -----------------------------------------
        LOAD AVAILABLE VOICES
  ------------------------------------------ */

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();

      if (!voices.length) return;

      const female = voices.find(
        (v) =>
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("samantha") ||
          v.name.toLowerCase().includes("female")
      );

      if (female) {
        setSelectedVoice(female);
        setVoiceGender("female");
        return;
      }

      const male = voices.find(
        (v) =>
          v.name.toLowerCase().includes("david") ||
          v.name.toLowerCase().includes("mark") ||
          v.name.toLowerCase().includes("male")
      );

      if (male) {
        setSelectedVoice(male);
        setVoiceGender("male");
        return;
      }

      setSelectedVoice(voices[0]);
      setVoiceGender("female");
    };

    loadVoices();

    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  /* -----------------------------------------
        SPEECH SYNTHESIS
  ------------------------------------------ */

  const speakText = (text) => {
    return new Promise((resolve) => {
      if (!window.speechSynthesis || !selectedVoice) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.voice = selectedVoice;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsAIPlaying(true);
        setSubtitle(text);

        if (videoRef.current) {
          videoRef.current.play();
        }
      };

      utterance.onend = () => {
        setIsAIPlaying(false);

        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }

        setTimeout(() => {
          setSubtitle("");
          resolve();
        }, 300);
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  /* -----------------------------------------
        SPEECH RECOGNITION
  ------------------------------------------ */

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log("Speech Recognition not supported.");
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
      }

      setAnswer(finalTranscriptRef.current + interimText);
    };

    recognition.onerror = (e) => {
      console.log(e);
      setIsMicOn(false);
    };

    recognition.onend = () => {
      setIsMicOn(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, []);

  /* -----------------------------------------
        START MIC
  ------------------------------------------ */

  const startListening = () => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
      setIsMicOn(true);
    } catch (err) {
      console.log(err)
    }
  };
  /* -----------------------------------------
        STOP MIC
  ------------------------------------------ */

  const stopListening = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.stop();
    setIsMicOn(false);
  };

  /* -----------------------------------------
        AI INTRODUCTION + QUESTION
  ------------------------------------------ */

  useEffect(() => {
    if (!selectedVoice) return;

    const runInterview = async () => {
      if (isIntroPhase) {
        await speakText(
          `Hi ${userName}. Welcome to your AI interview.`
        );

        await speakText(
          "Please answer each question naturally. Take your time and speak clearly."
        );

        setIsIntroPhase(false);
      } else if (currentQuestion) {
        await new Promise((r) => setTimeout(r, 800));

        if (currentIndex === questions.length - 1) {
          await speakText(
            "Great job. This is the final question."
          );
        }

        await speakText(currentQuestion.question);
      }
    };

    runInterview();
  }, [
    selectedVoice,
    isIntroPhase,
    currentIndex,
    userName,
    currentQuestion,
    questions,
  ]);
  /* -----------------------------------------
      RESET TIMER WHEN QUESTION CHANGES
------------------------------------------ */

  useEffect(() => {
    if (!currentQuestion) return;

    setAnswer("");
    setFeedback("");

    setTimeLeft(currentQuestion?.timeLimit ?? 60);

    stopListening();
  }, [currentIndex]);

  /* -----------------------------------------
        COUNTDOWN TIMER
  ------------------------------------------ */

  useEffect(() => {
    if (isIntroPhase) return;

    if (isAIPlaying) return;

    if (timeLeft <= 0) {
      handleSubmitAnswer();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isAIPlaying, isIntroPhase]);

  /* -----------------------------------------
        SUBMIT CURRENT ANSWER
  ------------------------------------------ */

  const handleSubmitAnswer = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    stopListening();

    try {
      const userAnswer = answer.trim();

      console.log({
        interviewId,
        questionNumber: currentIndex + 1,
        question: currentQuestion.question,
        answer: userAnswer,
      });
      await axios.post(
        `${ServerUrl}/api/interview/submit-answer`,
        {
          interviewId,
          questionIndex: currentIndex,
          answer: userAnswer,
          timeTaken: currentQuestion.timeLimit - timeLeft,
        },
        {
          withCredentials: true,
        }
      );



      if (answer.trim().length === 0) {
        const noAnswerLines = [
          "It looks like you skipped this question. That's alright, let's move on to the next one.",
          "No problem if you couldn't answer this one. Let's continue.",
          "I'll mark this question as unanswered and we'll proceed.",
          "That's okay. Not every question is easy. Let's move to the next one.",
          "We'll skip this question for now and continue with the interview."
        ];

        const randomLine =
          noAnswerLines[Math.floor(Math.random() * noAnswerLines.length)];

        await speakText(randomLine);
      } else {
        const answerLines = [
          "Thank you for your answer.",
          "Great! Let's move on to the next question.",
          "Nice response. Here's your next question.",
          "Thank you. I appreciate your explanation.",
          "Well answered. Let's continue.",
          "Good job. Let's proceed to the next question.",
          "Thanks for sharing your thoughts.",
          "Excellent. Let's keep going.",
          "That was helpful. Here's the next question.",
          "Very good. Moving to the next question."
        ];

        const randomLine =
          answerLines[Math.floor(Math.random() * answerLines.length)];

        await speakText(randomLine);
      }

      if (currentIndex < questions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        await speakText(
          "Congratulations. You have completed the interview."
        );

        const report = await axios.post(
          `${ServerUrl}/api/interview/finish`,
          { interviewId },
          { withCredentials: true }
        );

        navigate(`/report/${report.data.interviewId}`);

        // OR
        if (typeof onFinish === "function") {
          onFinish(report.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -----------------------------------------
        MICROPHONE BUTTON
  ------------------------------------------ */

  const toggleMic = () => {
    if (isAIPlaying) return;

    if (isMicON) {
      stopListening();
    } else {
      startListening();
    }
  };

  /* -----------------------------------------
        CLEANUP
  ------------------------------------------ */

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  return (
    <div className='min-h-screen bg-linear-to-br from-emerald-50 via-white-to-teal-100 flex items-center justify-center p-4 sm:p-6'>
      <div className='w-full max-w-250 min-h-[80vh] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col lg:flex-row overflow-hidden'>

        {/* video section */}
        <div className='w-full lg:w-[35%] bg-white flex flex-col items-center p-6 space-y-6 border-r border-gray-200'>

          <div className='w-full max-w-md rounded-2xl overflow-hidden shadow-xl'>
            <video
              src={videoSource}
              key={videoSource}
              ref={videoRef}
              muted
              playsInline
              preload='auto'
              className='w-full h-auto object-cover'
            />
          </div>

          {/* subtitle */}

          <div className='w-full max-w-md bg-white border border-gray-200 rounded-xl p-4 shadow-sm'>
            <p className='text-gray-700 text-sm sm:text-base font-medium text-center leading-relaxed'>
              {subtitle || "AI is waiting..."}
            </p>
          </div>

          {/* timer area */}

          <div className='w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-md p-6 space-y-5'>

            <div className='flex justify-between items-center'>
              <span className='text-sm text-gray-500'>
                Interview Status
              </span>

              {isAIPlaying && (
                <span className='text-sm font-semibold text-emerald-600'>
                  AI Speaking
                </span>
              )}
            </div>

            <div className='h-px bg-gray-200'></div>

            <div className='flex justify-center'>
              <Timer
                timeLeft={timeLeft}
                totalTime={currentQuestion?.timeLimit ?? 60}
              />
            </div>

            <div className='h-px bg-gray-200'></div>

            <div className='grid grid-cols-2 gap-6 text-center'>

              <div>
                <span className='text-2xl font-bold text-emerald-600'>
                  {currentIndex + 1}
                </span>

                <div className='text-xs text-gray-400'>
                  Current Question
                </div>
              </div>

              <div>
                <span className='text-2xl font-bold text-emerald-600'>
                  {questions.length}
                </span>

                <div className='text-xs text-gray-400'>
                  Total Questions
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Text section */}

        <div className='flex-1 flex flex-col p-4 sm:p-6 md:p-8 relative'>

          <h2 className='text-xl sm:text-2xl font-bold text-emerald-600 mb-6'>
            AI Smart Interview
          </h2>

          <div className='relative mb-6 bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm'>

            <p className='text-xs sm:text-sm text-gray-400 mb-2'>
              Question {currentIndex + 1} of {questions.length}
            </p>

            <div className='text-base sm:text-lg font-semibold text-gray-800 leading-relaxed'>
              {currentQuestion?.question}
            </div>

          </div>

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className='flex-1 bg-gray-100 p-4 sm:p-6 rounded-2xl resize-none outline-none border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition text-gray-800'
            placeholder='Type your answer here...'
          />

          <div className='flex items-center gap-4 mt-6'>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={toggleMic}
              disabled={isAIPlaying}
              className='w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-black text-white shadow-lg'
            >
              {isMicON ? (
                <FaMicrophoneSlash size={20} />
              ) : (
                <FaMicrophone size={20} />
              )}
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || isAIPlaying}
              className='flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-3 sm:py-4 rounded-2xl shadow-lg hover:opacity-90 font-semibold'
            >
              {isSubmitting
                ? "Submitting..."
                : currentIndex === questions.length - 1
                  ? "Finish Interview"
                  : "Submit Answer"}
            </motion.button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default Step2Interview;