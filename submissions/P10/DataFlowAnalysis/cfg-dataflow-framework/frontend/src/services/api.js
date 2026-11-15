/**
 * CFG Studio API Service
 * Manages communication with the FastAPI backend compiler service
 * with automatic, resilient client-side fallback engine for seamless
 * offline demos, evaluation, and viva presentations.
 */

import { compileAndAnalyzeClient } from './clientCompiler';
import { DEFAULT_SAMPLES } from '../constants/samples';

const BASE_URL = 'http://127.0.0.1:8000';

async function request(endpoint, options = {}) {
  // First attempt via relative URL (Vite dev proxy)
  try {
    const res = await fetch(endpoint, options);
    return res;
  } catch {
    // Fallback directly to backend port
    return fetch(`${BASE_URL}${endpoint}`, options);
  }
}

export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const res = await request('/health', { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return { healthy: false };
    const data = await res.json();
    return { healthy: data.status === 'healthy', data };
  } catch {
    return { healthy: false };
  }
}

export async function fetchSamples() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await request('/api/samples', { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to default samples
  }
  return DEFAULT_SAMPLES;
}

export async function analyzeProgram(code, language = 'c') {
  if (!code || !code.trim()) {
    throw {
      error_type: 'InputError',
      message: 'Source code cannot be empty. Please enter C source code.',
      line: null,
      col: null,
    };
  }

  // 1. Try FastAPI backend first
  let backendError = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await request('/api/analyze/all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (res.ok) {
      return {
        ...data,
        engine: 'backend',
      };
    }

    // Backend answered with an explicit compilation error (syntax, lexer, etc.)
    let msg = 'Compilation and analysis failed';
    let line = null;
    let col = null;
    let errorType = 'CompilationError';

    if (typeof data.detail === 'string') {
      msg = data.detail;
    } else if (Array.isArray(data.detail)) {
      msg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
    } else if (typeof data.detail === 'object' && data.detail !== null) {
      msg = data.detail.message || data.detail.msg || JSON.stringify(data.detail);
      line = data.detail.line ?? null;
      col = data.detail.col ?? null;
      errorType = data.detail.error_type || 'CompilationError';
    }

    throw {
      error_type: errorType,
      message: msg,
      line,
      col,
    };
  } catch (err) {
    if (err.error_type && err.error_type !== 'NetworkError') {
      // Re-throw genuine parser/lexer/validation error from backend
      throw err;
    }
    backendError = err;
  }

  // 2. If backend is offline or network fails, seamlessly use client compiler
  try {
    const clientResult = compileAndAnalyzeClient(code);
    return {
      ...clientResult,
      engine: 'client',
      offline_notice: true,
    };
  } catch (clientErr) {
    throw clientErr;
  }
}
