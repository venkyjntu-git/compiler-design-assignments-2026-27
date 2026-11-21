/**
 * Learning Progress Tracker for CompilerVerse
 * Manages persistent storage and analytics for quiz attempts, topic mastery,
 * and compiler execution statistics.
 */

import { QuizTopic, QuizAttempt, DifficultyLevel } from '../quiz/quizEngine';

export interface TopicProgress {
  topic: QuizTopic;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface UserProgressData {
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  overallAccuracy: number;
  compilationsRun: number;
  highestDifficulty: DifficultyLevel;
  topicStats: Record<string, { attempts: number; correct: number }>;
  history: QuizAttempt[];
  completedPhasesViewed: string[];
}

const STORAGE_KEY = 'compilerverse_user_progress';

export class ProgressTracker {
  private data: UserProgressData;

  constructor() {
    this.data = this.loadData();
  }

  public recordAttempt(attempt: QuizAttempt): void {
    this.data.totalAttempts++;
    if (attempt.isCorrect) {
      this.data.correctCount++;
    } else {
      this.data.incorrectCount++;
    }

    this.data.overallAccuracy =
      this.data.totalAttempts > 0
        ? Math.round((this.data.correctCount / this.data.totalAttempts) * 100)
        : 0;

    if (!this.data.topicStats[attempt.topic]) {
      this.data.topicStats[attempt.topic] = { attempts: 0, correct: 0 };
    }
    this.data.topicStats[attempt.topic].attempts++;
    if (attempt.isCorrect) {
      this.data.topicStats[attempt.topic].correct++;
    }

    if (attempt.difficulty === 'Advanced') {
      this.data.highestDifficulty = 'Advanced';
    } else if (attempt.difficulty === 'Intermediate' && this.data.highestDifficulty === 'Beginner') {
      this.data.highestDifficulty = 'Intermediate';
    }

    // Keep last 50 attempts in history
    this.data.history.unshift(attempt);
    if (this.data.history.length > 50) {
      this.data.history.pop();
    }

    this.saveData();
  }

  public recordCompilation(): void {
    this.data.compilationsRun++;
    this.saveData();
  }

  public recordPhaseView(phaseName: string): void {
    if (!this.data.completedPhasesViewed.includes(phaseName)) {
      this.data.completedPhasesViewed.push(phaseName);
      this.saveData();
    }
  }

  public getTopicBreakdown(): TopicProgress[] {
    const topics: QuizTopic[] = [
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

    return topics.map((t) => {
      const stat = this.data.topicStats[t] || { attempts: 0, correct: 0 };
      const accuracy =
        stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : 0;
      return {
        topic: t,
        attempts: stat.attempts,
        correct: stat.correct,
        accuracy,
      };
    });
  }

  public getData(): UserProgressData {
    return { ...this.data };
  }

  public resetProgress(): void {
    this.data = this.getDefaultData();
    this.saveData();
  }

  private getDefaultData(): UserProgressData {
    return {
      totalAttempts: 0,
      correctCount: 0,
      incorrectCount: 0,
      overallAccuracy: 0,
      compilationsRun: 0,
      highestDifficulty: 'Beginner',
      topicStats: {},
      history: [],
      completedPhasesViewed: [],
    };
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // storage unavailable
    }
  }

  private loadData(): UserProgressData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return this.getDefaultData();
  }
}

export const globalProgressTracker = new ProgressTracker();
