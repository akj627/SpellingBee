import React, { useState, useRef } from "react";
import axios from "axios";

const config = {
  pollyApi: "https://uni945qhm1.execute-api.us-east-1.amazonaws.com/Dev/text-to-speech",
  transcribeApi: "https://uni945qhm1.execute-api.us-east-1.amazonaws.com/Dev/speech-to-text",
  checkApi: "https://uni945qhm1.execute-api.us-east-1.amazonaws.com/Dev/spell-check",
};


// Create axios instance with default config
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  withCredentials: false
});

function SpellingQuiz() {
  const [wordList, setWordList] = useState("");
  const [words, setWords] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [score, setScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  
  const startQuiz = () => {
    const wordsArray = wordList.split(",").map((w) => w.trim());
    setWords(wordsArray);
    setCurrentWordIndex(0);
    setResults([]);
    setScore(0);
    setCurrentWord(wordsArray[0]);
    setError("");
    playWord(wordsArray[0]);
  };

  const playWord = async (word) => {
    try {
      const response = await api.post(config.pollyApi, { word });
      
      const base64Audio = await response.data.body; // Because API returns base64 string
      const audioBytes = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
      const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);
  
      const audio = new Audio(audioUrl);
      audio.play();
      
      if (response.data.audioUrl) {
        const audio = new Audio(response.data.audioUrl);
        await audio.play();
      }
      console.log("Pronouncing:", word);
    } catch (error) {
      console.error("Error playing word", error);
      setError("Failed to play the word. Please try again.");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        try {
          const response = await api.post(config.transcribeApi, {
            headers: { 
              'Content-Type': 'audio/wav'
            },
              body: audioBlob
          });

          await checkSpelling(response.data.text);
        } catch (error) {
          if (error.response) {
            // Server responded with a status outside 2xx
            console.error("Response error:", error.response.status);
            console.error("Data:", error.response.data);
          } else if (error.request) {
            // No response was received
            console.error("No response received:", error.request);
          } else {
            // Something else went wrong
            console.error("Axios error:", error.message);
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone", error);
      setError("Failed to access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const checkSpelling = async (spokenWord) => {
    try {
      const response = await api.post(config.checkApi, {
        correct_word: words[currentWordIndex],
        spoken_word: spokenWord,
      });
      
      const isCorrect = response.data.correct;
      setResults([...results, { word: words[currentWordIndex], correct: isCorrect }]);
      if (isCorrect) setScore(score + 1);
      
      setTimeout(() => {
        const nextIndex = currentWordIndex + 1;
        if (nextIndex < words.length) {
          setCurrentWordIndex(nextIndex);
          setCurrentWord(words[nextIndex]);
          playWord(words[nextIndex]);
        } else {
          alert("Quiz finished! Your score: " + (score + (isCorrect ? 1 : 0)));
        }
      }, 2000);
    } catch (error) {
      console.error("Error checking spelling", error);
      setError("Failed to check spelling. Please try again.");
    }
  };

  return (

    
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Spelling Quiz</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="4"
            value={wordList}
            onChange={(e) => setWordList(e.target.value)}
            placeholder="Enter words, separated by commas"
          />
        </div>

        <button 
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 mb-6"
          onClick={startQuiz}
        >
          Start Quiz
        </button>

        {currentWord && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h2 className="text-2xl font-bold text-blue-800 mb-2">Current Word:</h2>
            <p className="text-xl text-blue-600">{currentWord}</p>
          </div>
        )}

        {currentWord && (
          <div className="flex justify-center gap-4 mb-6">
            <button
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-700">Score: {score}</h3>
        </div>

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Word</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((res, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.word}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {res.correct ? (
                        <span className="text-green-600">✅ Correct</span>
                      ) : (
                        <span className="text-red-600">❌ Incorrect</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SpellingQuiz;
