import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { 
  X, 
  HelpCircle, 
  Check, 
  AlertCircle, 
  ChevronRight, 
  Trophy, 
  ArrowRight,
  BookOpen
} from 'lucide-react';

export const QuizTaker = ({ lesson, quiz, onClose }) => {
  const { updateProgress, recordQuizAttempt } = useApp();
  const toast = useToast();
  const questions = quiz?.questions_json || [];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const activeQuestion = questions[currentIdx];

  const handleOptionSelect = (option) => {
    if (isSubmitted) return;
    setSelectedOption(option);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption) {
      toast.warning("Select Option", "Please select one of the options to proceed.");
      return;
    }
    
    setIsSubmitted(true);
    if (selectedOption === activeQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsSubmitted(false);
    } else {
      // Quiz complete!
      setQuizFinished(true);
      const correctCount = score + (selectedOption === activeQuestion.answer ? 1 : 0);
      const calculatedPercentage = Math.round((correctCount / questions.length) * 100);

      // Save score and progress to DB, and log the attempt for score history
      updateProgress(lesson.id, true, calculatedPercentage);
      if (quiz?.id) {
        recordQuizAttempt(quiz.id, lesson.id, calculatedPercentage, questions.length);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 selection:bg-primary/20">
      {/* Frosted backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl glass-panel rounded-3xl border border-border shadow-2xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
        
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white/40 dark:bg-black/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm md:text-base leading-tight truncate max-w-[280px] md:max-w-md">Assessment: {lesson.title}</h3>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Panel */}
        {!quizFinished ? (
          /* Active Question Flow */
          <div className="p-6 overflow-y-auto flex-grow flex flex-col justify-between space-y-6">
            
            {/* Progress tracker */}
            <div className="space-y-2 shrink-0">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <span>Question {currentIdx + 1} of {questions.length}</span>
                <span>Score: {score} Correct</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="glass-panel p-5 rounded-2xl border border-border bg-white/20 dark:bg-card/20 shrink-0">
              <div className="flex gap-3">
                <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <h4 className="font-bold text-base text-foreground leading-relaxed">
                  {activeQuestion.question}
                </h4>
              </div>
            </div>

            {/* Options list */}
            <div className="space-y-3 flex-grow py-2">
              {activeQuestion.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx);
                
                // Styling matrices
                let optionStyle = 'border-border bg-white/50 dark:bg-black/10 text-foreground hover:border-primary/50';
                
                if (selectedOption === option) {
                  optionStyle = 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(99,102,241,0.05)]';
                }

                if (isSubmitted) {
                  if (option === activeQuestion.answer) {
                    optionStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold';
                  } else if (selectedOption === option) {
                    optionStyle = 'border-rose-500 bg-rose-500/10 text-rose-400';
                  } else {
                    optionStyle = 'border-border opacity-50 bg-transparent text-muted-foreground';
                  }
                }

                return (
                  <button
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    disabled={isSubmitted}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between text-xs md:text-sm font-semibold transition-all duration-200 ${optionStyle}`}
                  >
                    <div className="flex items-center gap-3.5 pr-4">
                      <span className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${
                        selectedOption === option
                          ? 'border-primary/50 bg-primary/20 text-primary'
                          : 'border-border bg-secondary text-muted-foreground'
                      }`}>
                        {letter}
                      </span>
                      <span className="leading-snug">{option}</span>
                    </div>

                    {/* Right side check marks */}
                    {isSubmitted && option === activeQuestion.answer && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    {isSubmitted && selectedOption === option && option !== activeQuestion.answer && (
                      <X className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* AI Explanation details display */}
            {isSubmitted && (
              <div className="glass-panel p-4 rounded-2xl border border-border bg-indigo-500/5 dark:bg-card/40 shrink-0 animate-scale-up">
                <div className="flex gap-2.5 items-start">
                  {selectedOption === activeQuestion.answer ? (
                    <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      {selectedOption === activeQuestion.answer ? "Correct Answer!" : "Incorrect Answer"}
                    </h5>
                    <p className="text-xs text-foreground leading-relaxed">
                      {activeQuestion.explanation || "No explanation provided for this question."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit / Next Button */}
            <div className="pt-4 border-t border-border shrink-0 flex justify-end">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-primary/10 disabled:opacity-50 disabled:pointer-events-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Verify Answer <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-sm flex items-center gap-1.5 shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {currentIdx + 1 < questions.length ? "Next Question" : "View Results"} 
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        ) : (
          /* Finished summary panel */
          <div className="p-8 text-center space-y-6 flex-grow flex flex-col justify-center items-center">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center animate-bounce shadow-xl shadow-amber-500/5 glow-indigo">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-gradient-purple">Assessment Complete!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Excellent effort. Your assessment marks have been synchronized with your educational track record.
              </p>
            </div>

            {/* Score report card */}
            <div className="glass-panel py-5 px-8 rounded-2xl border border-border inline-flex items-center gap-6">
              <div className="text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Accuracy</span>
                <span className="text-3xl font-black mt-1 block">
                  {Math.round((score / questions.length) * 100)}%
                </span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Answered</span>
                <span className="text-3xl font-black mt-1 block">
                  {score} / {questions.length}
                </span>
              </div>
            </div>

            <div className="pt-4 w-full max-w-xs">
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-sm shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Return to Syllabus Notes
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
