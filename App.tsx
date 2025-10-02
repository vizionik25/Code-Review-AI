import React, { useState, useCallback, useEffect } from 'react';
import { CodeInput } from './components/CodeInput';
import { FeedbackDisplay } from './components/FeedbackDisplay';
import { Header } from './components/Header';
import Notification from './components/Notification';
import { HistoryPanel } from './components/HistoryPanel';
import { reviewCode } from './services/geminiService';
import { CodeFile, HistoryItem } from './types';
import { getHistory, addHistoryItem, clearHistory } from './services/historyService';

function App() {
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<CodeFile | null>(null);
  const [code, setCode] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [reviewMode, setReviewMode] = useState('comprehensive');


  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleReview = useCallback(async (codeToReview: string, language: string, prompt: string) => {
    if (!codeToReview.trim()) {
      setError("Cannot review empty code.");
      return;
    }
    setIsLoading(true);
    setFeedback('');
    setError(null);
    try {
      const review = await reviewCode(codeToReview, language, prompt, reviewMode);
      setFeedback(review);
      if (selectedFile) {
        const historyItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          fileName: selectedFile.path,
          language: selectedFile.language.label,
          feedback: review,
          code: codeToReview,
          mode: reviewMode,
        };
        addHistoryItem(historyItem);
        setHistory(getHistory());
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to get review: ${errorMessage}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, reviewMode]);

  const handleSelectHistoryItem = (item: HistoryItem) => {
    const language = { value: item.language.toLowerCase(), label: item.language, extensions: [] };
    setSelectedFile({ path: item.fileName, language });
    setCode(item.code);
    setFeedback(item.feedback);
    setReviewMode(item.mode || 'comprehensive');
    setIsHistoryPanelOpen(false);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  }


  return (
    <div className="bg-gray-900 min-h-screen text-gray-200 font-sans">
      <Header onToggleHistory={() => setIsHistoryPanelOpen(prev => !prev)} />
      <Notification message={error} onDismiss={() => setError(null)} />
      <HistoryPanel 
        isOpen={isHistoryPanelOpen} 
        onClose={() => setIsHistoryPanelOpen(false)}
        history={history}
        onSelect={handleSelectHistoryItem}
        onClear={handleClearHistory}
      />

      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <div>
            <CodeInput
              onReview={handleReview}
              isLoading={isLoading}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              code={code}
              setCode={setCode}
              customPrompt={customPrompt}
              setCustomPrompt={setCustomPrompt}
              setError={setError}
              reviewMode={reviewMode}
              setReviewMode={setReviewMode}
            />
          </div>
          <div>
            <FeedbackDisplay 
              feedback={feedback} 
              isLoading={isLoading} 
              selectedFile={selectedFile}
              originalCode={code}
              setError={setError}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;