import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Flame,
  HelpCircle,
  Filter,
} from 'lucide-react';
import {
  QuizEngine,
  QuizQuestion,
  QuizTopic,
  DifficultyLevel,
} from '../quiz/quizEngine';
import { globalProgressTracker } from '../progress/progressTracker';

const ALL_TOPICS: QuizTopic[] = [
  'Lexical Analysis',
  'Syntax Analysis',
  'FIRST and FOLLOW',
  'LL(1) Parsing',
  'LR(1) Parsing',
  'AST',
  'Symbol Tables',
  'Three-Address Code',
  'Code Optimization',
  'Basic Blocks',
  'Target Code Generation',
];

export const QuizPage: React.FC = () => {
  const [engine] = useState(() => new QuizEngine());
  const [selectedTopic, setSelectedTopic] = useState<QuizTopic | 'ALL'>('ALL');
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [fillBlankAnswer, setFillBlankAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    explanation: string;
    newDifficulty: DifficultyLevel;
  } | null>(null);

  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [currentDifficulty, setCurrentDifficulty] = useState<DifficultyLevel>('Beginner');
  const [streak, setStreak] = useState(0);

  const loadQuestion = () => {
    setSelectedOption(null);
    setFillBlankAnswer('');
    setFeedback(null);

    const topicFilter = selectedTopic === 'ALL' ? undefined : selectedTopic;
    const q = engine.getNextQuestion(topicFilter);
    setCurrentQuestion(q);
    setCurrentDifficulty(engine.getCurrentDifficulty());
    setStreak(engine.getStreak());
  };

  useEffect(() => {
    loadQuestion();
  }, [selectedTopic]);

  const handleSubmit = (answer: string) => {
    if (!currentQuestion || feedback) return;

    const evalResult = engine.submitAnswer(currentQuestion, answer);
    setFeedback(evalResult);
    setCurrentDifficulty(evalResult.newDifficulty);
    setStreak(engine.getStreak());

    // Record in global persistence tracker
    globalProgressTracker.recordAttempt({
      questionId: currentQuestion.id,
      topic: currentQuestion.topic,
      difficulty: currentQuestion.difficulty,
      userAnswer: answer,
      isCorrect: evalResult.isCorrect,
      timestamp: Date.now(),
    });

    setScore((prev) => ({
      correct: prev.correct + (evalResult.isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Banner with Adaptive Difficulty & Streak Indicator */}
      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono mb-1">
            <Award className="w-4 h-4" />
            <span>Dynamic Adaptive Assessment</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Adaptive Compiler Quiz</h1>
          <p className="text-xs text-slate-300 leading-relaxed mt-1">
            Tests your conceptual and algorithmic knowledge. Difficulty scales dynamically as you
            answer consecutive questions correctly.
          </p>
        </div>

        {/* Live Metrics */}
        <div className="flex items-center space-x-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-center">
            <span className="text-[10px] text-slate-500 block">DIFFICULTY</span>
            <span
              className={`font-bold ${
                currentDifficulty === 'Advanced'
                  ? 'text-rose-400'
                  : currentDifficulty === 'Intermediate'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentDifficulty}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-center">
            <span className="text-[10px] text-slate-500 block">STREAK</span>
            <span className="font-bold text-cyan-400 flex items-center justify-center space-x-1">
              <Flame className="w-3.5 h-3.5" />
              <span>{streak}</span>
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border text-center">
            <span className="text-[10px] text-slate-500 block">SCORE</span>
            <span className="font-bold text-white">
              {score.correct} / {score.total}
            </span>
          </div>
        </div>
      </div>

      {/* Topic Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <button
          onClick={() => setSelectedTopic('ALL')}
          className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
            selectedTopic === 'ALL'
              ? 'bg-amber-600 text-white font-bold'
              : 'bg-surface hover:bg-surface-elevated text-slate-400 border border-border'
          }`}
        >
          All Topics
        </button>
        {ALL_TOPICS.map((top) => (
          <button
            key={top}
            onClick={() => setSelectedTopic(top)}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
              selectedTopic === top
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-surface hover:bg-surface-elevated text-slate-400 border border-border'
            }`}
          >
            {top}
          </button>
        ))}
      </div>

      {/* Question Card */}
      {currentQuestion ? (
        <div className="bg-surface rounded-3xl border border-border overflow-hidden shadow-2xl p-6 space-y-6">
          {/* Question Metadata */}
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-elevated border border-border text-slate-300 font-mono">
              Topic: {currentQuestion.topic}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full border font-mono font-bold ${
                currentQuestion.difficulty === 'Advanced'
                  ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                  : currentQuestion.difficulty === 'Intermediate'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              }`}
            >
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* Question Prompt */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white leading-relaxed">
              {currentQuestion.prompt}
            </h2>

            {currentQuestion.codeSnippet && (
              <div className="p-3 bg-slate-950 rounded-xl border border-border font-mono text-xs text-cyan-300 whitespace-pre">
                {currentQuestion.codeSnippet}
              </div>
            )}
          </div>

          {/* Multiple Choice Options */}
          {currentQuestion.options && (
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                let btnStyle =
                  'bg-surface-elevated/40 border-border/80 text-slate-300 hover:bg-surface-elevated hover:border-slate-600';

                if (feedback) {
                  if (opt === currentQuestion.correctAnswer) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-bold';
                  } else if (isSelected && !feedback.isCorrect) {
                    btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-200 line-through';
                  }
                } else if (isSelected) {
                  btnStyle = 'bg-amber-600/20 border-amber-500 text-white font-semibold';
                }

                return (
                  <button
                    key={i}
                    disabled={!!feedback}
                    onClick={() => {
                      setSelectedOption(opt);
                      handleSubmit(opt);
                    }}
                    className={`w-full p-4 rounded-xl border text-left text-xs leading-relaxed transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {feedback && opt === currentQuestion.correctAnswer && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                    {feedback && isSelected && !feedback.isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Fill-in-the-blank answer input */}
          {currentQuestion.type === 'fill_in_the_blank' && !feedback && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={fillBlankAnswer}
                onChange={(e) => setFillBlankAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 bg-surface-elevated border border-border rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={() => handleSubmit(fillBlankAnswer)}
                disabled={!fillBlankAnswer.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          )}

          {/* Feedback & Pedagogical Explanation */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl border space-y-2 animate-in fade-in duration-200 ${
                feedback.isCorrect
                  ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-800 text-rose-200'
              }`}
            >
              <div className="flex items-center space-x-2 font-bold text-sm">
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Correct! Great analysis.</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Incorrect. Correct answer: {currentQuestion.correctAnswer}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans pl-6">
                {feedback.explanation}
              </p>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={loadQuestion}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md transition-all"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border p-8 text-center text-slate-500 text-xs">
          No questions found for the chosen criteria.
        </div>
      )}
    </div>
  );
};
