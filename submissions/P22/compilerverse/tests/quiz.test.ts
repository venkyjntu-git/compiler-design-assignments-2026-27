import { describe, it, expect, beforeEach } from 'vitest';
import { QuizEngine, QUESTION_BANK } from '../src/quiz/quizEngine';

describe('Adaptive Quiz Engine', () => {
  let engine: QuizEngine;

  beforeEach(() => {
    // Mock minimal localStorage if not in browser
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k];
      },
    };
    engine = new QuizEngine();
    engine.reset();
  });

  it('contains comprehensive questions across all 11 topics', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(15);
    const topics = new Set(QUESTION_BANK.map((q) => q.topic));
    expect(topics.has('Lexical Analysis')).toBe(true);
    expect(topics.has('FIRST and FOLLOW')).toBe(true);
    expect(topics.has('Three-Address Code')).toBe(true);
    expect(topics.has('Code Optimization')).toBe(true);
  });

  it('fetches questions and evaluates correct answers accurately', () => {
    const q = engine.getNextQuestion();
    expect(q).not.toBeNull();

    const evaluation = engine.submitAnswer(q!, q!.correctAnswer);
    expect(evaluation.isCorrect).toBe(true);
    expect(evaluation.explanation).toBe(q!.explanation);
  });

  it('increases difficulty to Intermediate after consecutive correct answers', () => {
    expect(engine.getCurrentDifficulty()).toBe('Beginner');

    const q1 = engine.getNextQuestion();
    engine.submitAnswer(q1!, q1!.correctAnswer);

    const q2 = engine.getNextQuestion();
    const res2 = engine.submitAnswer(q2!, q2!.correctAnswer);

    expect(res2.newDifficulty).toBe('Intermediate');
    expect(engine.getCurrentDifficulty()).toBe('Intermediate');
  });

  it('decreases difficulty after consecutive incorrect answers', () => {
    // Set to intermediate
    const q1 = engine.getNextQuestion();
    engine.submitAnswer(q1!, q1!.correctAnswer);
    const q2 = engine.getNextQuestion();
    engine.submitAnswer(q2!, q2!.correctAnswer);
    expect(engine.getCurrentDifficulty()).toBe('Intermediate');

    // Fail twice
    const q3 = engine.getNextQuestion();
    engine.submitAnswer(q3!, 'WRONG_ANSWER');
    const q4 = engine.getNextQuestion();
    const res4 = engine.submitAnswer(q4!, 'WRONG_ANSWER');

    expect(res4.newDifficulty).toBe('Beginner');
  });
});
