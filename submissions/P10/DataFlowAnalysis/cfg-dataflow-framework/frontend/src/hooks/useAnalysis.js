import { useState, useEffect, useRef, useCallback } from 'react';
import { checkBackendHealth, fetchSamples, analyzeProgram } from '../services/api';
import { DEFAULT_SAMPLES } from '../constants/samples';

export function useAnalysis() {
  const [samples, setSamples] = useState(DEFAULT_SAMPLES);
  const [selectedSampleId, setSelectedSampleId] = useState(DEFAULT_SAMPLES[0].id);
  const [code, setCode] = useState(DEFAULT_SAMPLES[0].code.trim());
  const [isServerHealthy, setIsServerHealthy] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [activeTab, setActiveTab] = useState('cfg');
  const [activeNavSection, setActiveNavSection] = useState('graph');
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedBlockId, setSelectedBlockId] = useState(null);

  const toastTimerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

  // Poll server health
  const checkHealth = useCallback(async () => {
    const res = await checkBackendHealth();
    setIsServerHealthy(res.healthy);
  }, []);

  // Run analysis
  const runAnalysis = useCallback(async (codeOverride) => {
    const source = (typeof codeOverride === 'string' ? codeOverride : code) || '';
    if (!source.trim()) {
      setError({
        error_type: 'InputError',
        message: 'Source code cannot be empty. Please enter C source code.',
        line: 1,
        col: 1,
      });
      showToast('Please enter C source code', 'error');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await analyzeProgram(source, 'c');
      setAnalysisData(data);
      // Auto-select first non-entry basic block
      const userBlocks = data.cfg?.blocks?.filter((b) => !b.is_entry && !b.is_exit);
      if (userBlocks && userBlocks.length > 0) {
        setSelectedBlockId(userBlocks[0].id);
      } else if (data.cfg?.blocks?.length > 0) {
        setSelectedBlockId(data.cfg.blocks[0].id);
      }
      const engineLabel = data.engine === 'backend' ? 'FastAPI Backend' : 'In-Browser Engine';
      showToast(`Analysis complete via ${engineLabel} (${data.cfg?.blocks?.length || 0} blocks)`, 'success');
    } catch (err) {
      setError(err);
      setAnalysisData(null);
      showToast(err.message || 'Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [code, showToast]);

  // Initial load
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);

    fetchSamples()
      .then((fetched) => {
        if (Array.isArray(fetched) && fetched.length > 0) {
          setSamples(fetched);
        }
      })
      .catch(() => {
        // Fall back gracefully to DEFAULT_SAMPLES
      });

    // Run initial analysis with first sample
    runAnalysis(DEFAULT_SAMPLES[0].code.trim());

    return () => {
      clearInterval(interval);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [checkHealth, runAnalysis]);

  const selectSample = useCallback((sampleId) => {
    const sample = samples.find((s) => s.id === sampleId) || DEFAULT_SAMPLES.find((s) => s.id === sampleId);
    if (sample) {
      setSelectedSampleId(sampleId);
      const cleanCode = sample.code.trim();
      setCode(cleanCode);
      setError(null);
      runAnalysis(cleanCode);
      showToast(`Loaded benchmark: ${sample.title}`, 'success');
    }
  }, [samples, runAnalysis, showToast]);

  const resetCode = useCallback(() => {
    const current =
      samples.find((s) => s.id === selectedSampleId) ||
      DEFAULT_SAMPLES.find((s) => s.id === selectedSampleId) ||
      DEFAULT_SAMPLES[0];
    const cleanCode = current.code.trim();
    setCode(cleanCode);
    setError(null);
    runAnalysis(cleanCode);
    showToast(`Reset code to template: ${current.title}`, 'success');
  }, [samples, selectedSampleId, runAnalysis, showToast]);

  const clearCode = useCallback(() => {
    setCode('');
    setAnalysisData(null);
    setSelectedBlockId(null);
    setError(null);
    showToast('Code cleared. Enter your C program.', 'info');
  }, [showToast]);

  const selectedBlock = analysisData?.cfg?.blocks?.find((b) => b.id === selectedBlockId) || null;
  const activeEngine = analysisData?.engine || (isServerHealthy ? 'backend' : 'client');

  return {
    code,
    setCode,
    samples,
    selectedSampleId,
    selectSample,
    isServerHealthy,
    activeEngine,
    isAnalyzing,
    error,
    toast,
    showToast,
    activeTab,
    setActiveTab,
    activeNavSection,
    setActiveNavSection,
    analysisData,
    selectedBlockId,
    setSelectedBlockId,
    selectedBlock,
    runAnalysis,
    resetCode,
    clearCode,
  };
}
