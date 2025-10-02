import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ReactDiffViewer from 'react-diff-viewer';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { LoaderIcon } from './icons/LoaderIcon';
import { CodeFile } from '../types';
import { downloadFile } from '../utils/fileUtils';
import { generateFullCodeFromReview } from '../services/geminiService';

interface FeedbackDisplayProps {
  feedback: string;
  isLoading: boolean;
  selectedFile: CodeFile | null;
  originalCode: string;
  setError: (error: string | null) => void;
}

const Placeholder = () => (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <h3 className="text-xl font-semibold">AI Feedback</h3>
        <p className="mt-2">Your code review results will appear here.</p>
    </div>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

type ViewMode = 'review' | 'diff';

export const FeedbackDisplay: React.FC<FeedbackDisplayProps> = ({ feedback, isLoading, selectedFile, originalCode, setError }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('review');
  const [diffCode, setDiffCode] = useState<string | null>(null);
  const [isGeneratingDiff, setIsGeneratingDiff] = useState(false);

  // Reset diff when feedback changes
  useEffect(() => {
    setDiffCode(null);
    setViewMode('review');
  }, [feedback]);

  const handleSaveFeedback = () => {
    if (!feedback || !selectedFile) return;
    const originalFilename = selectedFile.path.split('/').pop() || 'review';
    const downloadFilename = `${originalFilename}.review.md`;
    downloadFile(feedback, downloadFilename, 'text/markdown;charset=utf-8');
  };

  const handleGenerateDiff = async () => {
    if (diffCode) {
      setViewMode('diff');
      return;
    }
    if (!originalCode || !feedback || !selectedFile) return;

    setIsGeneratingDiff(true);
    setError(null);
    try {
      const language = selectedFile.language.label;
      const newCode = await generateFullCodeFromReview(originalCode, language, feedback);
      setDiffCode(newCode);
      setViewMode('diff');
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(`Failed to generate diff: ${errorMessage}`);
    } finally {
      setIsGeneratingDiff(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="flex flex-col items-center gap-4">
            <LoaderIcon />
            <span className="text-lg">Generating feedback...</span>
          </div>
        </div>
      );
    }

    if (!feedback) {
      return <Placeholder />;
    }

    if (viewMode === 'diff') {
      if (isGeneratingDiff) {
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="flex flex-col items-center gap-4">
              <LoaderIcon />
              <span className="text-lg">Applying suggestions...</span>
            </div>
          </div>
        );
      }
      return (
        <ReactDiffViewer
            oldValue={originalCode}
            newValue={diffCode || ''}
            splitView={true}
            useDarkTheme={true}
            styles={{
                variables: {
                    dark: {
                        addedBackground: '#047857', // green-700
                        removedBackground: '#991B1B', // red-800
                    }
                },
                // FIX: The 'background' property under `variables.dark` is deprecated in recent versions of react-diff-viewer.
                // The main viewer background color should be set on `diffContainer` instead.
                diffContainer: { backgroundColor: '#1F2937' }, // gray-800
                gutter: { backgroundColor: '#4B5563' }, // gray-600
                // FIX: The 'color' property under 'variables.dark' is not supported in recent versions of react-diff-viewer.
                // To set the text color for unchanged lines, it should be applied to the 'line' style object.
                line: {
                    color: '#E5E7EB', // gray-200
                },
            }}
        />
      );
    }

    return (
        <div className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
            // FIX: Add `any` type to props to resolve TypeScript error on `inline` property.
            // This is likely due to a type definition mismatch in the `react-markdown` library.
            code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                <SyntaxHighlighter
                    // FIX: Cast style to `any` to resolve type error. This is a known issue with
                    // the type definitions for react-syntax-highlighter styles.
                    style={vscDarkPlus as any}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
                ) : (
                <code className="bg-gray-700 rounded px-1.5 py-1 text-indigo-300 font-mono" {...props}>
                    {children}
                </code>
                );
            },
            }}
        >
            {feedback}
        </ReactMarkdown>
        </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[75vh]">
      <div className="p-4 bg-gray-700/50 rounded-t-lg border-b border-gray-600 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <div className="isolate inline-flex rounded-md shadow-sm bg-gray-900/50 p-1">
                 <button
                    onClick={() => setViewMode('review')}
                    className={`relative inline-flex items-center rounded-l-md px-3 py-1 text-sm font-semibold transition-colors ${viewMode === 'review' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                >
                    Review
                </button>
                <button
                    onClick={handleGenerateDiff}
                    disabled={!feedback || isGeneratingDiff}
                    className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1 text-sm font-semibold transition-colors ${viewMode === 'diff' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'} disabled:text-gray-500 disabled:cursor-not-allowed`}
                >
                    Diff
                </button>
            </div>
        </div>
        <button
          onClick={handleSaveFeedback}
          disabled={!feedback}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          aria-label="Save feedback to a file"
        >
          <DownloadIcon />
          Save
        </button>
      </div>
      <div className="flex-grow overflow-y-auto bg-gray-800">
        {renderContent()}
      </div>
    </div>
  );
};
