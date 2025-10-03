import React, { useState, useEffect } from 'react';
import { CodeFile } from '../types';
import { fetchRepoFiles, fetchFileContent, parseGitHubUrl } from '../services/githubService';
import { openDirectoryAndGetFiles, readFileContent } from '../services/localFileService';
import { SparklesIcon } from './icons/SparklesIcon';
import { LanguageOverrideSelector } from './LanguageOverrideSelector';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ReviewModeSelector } from './ReviewModeSelector';

interface CodeInputProps {
  onReview: (code: string, language: string, customPrompt: string) => void;
  onRepoReview: (files: {path: string, content: string}[], repoUrl: string, customPrompt: string) => void;
  isLoading: boolean;
  selectedFile: CodeFile | null;
  setSelectedFile: (file: CodeFile | null) => void;
  code: string;
  setCode: (code: string) => void;
  customPrompt: string;
  setCustomPrompt: (prompt: string) => void;
  setError: (error: string | null) => void;
  reviewMode: string;
  setReviewMode: (mode: string) => void;
}

export const CodeInput: React.FC<CodeInputProps> = ({ 
    onReview, 
    onRepoReview,
    isLoading, 
    selectedFile, 
    setSelectedFile, 
    code, 
    setCode, 
    customPrompt,
    setCustomPrompt,
    setError,
    reviewMode,
    setReviewMode
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [languageOverride, setLanguageOverride] = useState('auto-detect');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  useEffect(() => {
    if (selectedFile) {
      setCode(selectedFile.content || '');
    } else {
      setCode('');
    }
  }, [selectedFile, setCode]);

  const handleFetchRepo = async () => {
    setError(null);
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      setError("Invalid GitHub repository URL.");
      return;
    }
    setIsFetchingFiles(true);
    setFiles([]);
    setSelectedFile(null);
    try {
      const repoFiles = await fetchRepoFiles(parsed.owner, parsed.repo);
      setFiles(repoFiles);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const handleOpenDirectory = async () => {
    setError(null);
    setIsFetchingFiles(true);
    setFiles([]);
    setSelectedFile(null);
    setRepoUrl(''); // Clear repo url if selecting local
    try {
        const localFiles = await openDirectoryAndGetFiles();
        setFiles(localFiles);
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
    } finally {
        setIsFetchingFiles(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const filePath = e.target.value;
    if (!filePath) {
      setSelectedFile(null);
      return;
    }

    const file = files.find(f => f.path === filePath);
    if (file) {
      setError(null);
      setIsFetchingFiles(true);
      try {
        let content = '';
        if (file.handle) { // Local file
          content = await readFileContent(file);
        } else { // GitHub file
          const parsed = parseGitHubUrl(repoUrl);
          if (parsed) {
            content = await fetchFileContent(parsed.owner, parsed.repo, file.path);
          }
        }
        setSelectedFile({ ...file, content });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to fetch file content: ${errorMessage}`);
        setSelectedFile(null);
      } finally {
        setIsFetchingFiles(false);
      }
    }
  };
  
  const handleReviewClick = () => {
    const languageToUse = languageOverride !== 'auto-detect' ? languageOverride : selectedFile?.language.value || 'typescript';
    onReview(code, languageToUse, customPrompt);
  };

  const handleRepoReviewClick = async () => {
    if (!repoUrl || files.length === 0) return;

    setError(null);
    setIsFetchingFiles(true);
    setSelectedFile(null);
    try {
        const parsed = parseGitHubUrl(repoUrl);
        if (!parsed) return;

        const filesWithContent = await Promise.all(files.map(async (file) => {
            const content = await fetchFileContent(parsed.owner, parsed.repo, file.path);
            return { path: file.path, content };
        }));

        onRepoReview(filesWithContent, repoUrl, customPrompt);

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(`Failed to fetch repository content: ${errorMessage}`);
    } finally {
        setIsFetchingFiles(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[75vh]">
      <div className="p-4 bg-gray-700/50 rounded-t-lg border-b border-gray-600">
        <h2 className="text-lg font-semibold text-gray-100">Code Input</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto">
        {/* GitHub URL Input */}
        <div className="flex gap-2">
            <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isFetchingFiles}
            />
            <button onClick={handleFetchRepo} disabled={isFetchingFiles || !repoUrl} className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed transition-colors">
                {isFetchingFiles ? '...' : 'Load'}
            </button>
        </div>
        
        {/* Local Directory Button */}
        <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-600"></div>
        </div>
        <button
            onClick={handleOpenDirectory}
            disabled={isFetchingFiles}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 rounded-md disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
        >
            Select Local Folder
        </button>

        {/* File Selector */}
        {(files.length > 0 || isFetchingFiles) && (
          <div>
            <select
                value={selectedFile?.path || ''}
                onChange={handleFileSelect}
                disabled={isFetchingFiles}
                className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="">{isFetchingFiles ? 'Loading files...' : 'Select a file to review'}</option>
                {files.map(file => (
                    <option key={file.path} value={file.path}>
                        {file.path} ({file.language.label})
                    </option>
                ))}
            </select>

            {repoUrl && (
              <div className="mt-4">
                  <button
                      onClick={handleRepoReviewClick}
                      disabled={isLoading || isFetchingFiles || reviewMode === 'test_generation'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed transition-colors"
                      title={reviewMode === 'test_generation' ? "Test Generation is not available for repository-wide reviews" : "Review the entire repository"}
                  >
                      <SparklesIcon />
                      Review Entire Repository
                  </button>
              </div>
            )}
          </div>
        )}

        <LanguageOverrideSelector value={languageOverride} onChange={setLanguageOverride} />

        <ReviewModeSelector selectedMode={reviewMode} onModeChange={setReviewMode} />

        {/* Custom Prompt Section */}
        <div className="border-t border-gray-700 pt-4">
          <button 
            onClick={() => setShowCustomPrompt(prev => !prev)}
            className="w-full flex justify-between items-center text-left text-sm font-medium text-gray-400 hover:text-gray-200"
          >
            Custom Instructions
            <ChevronDownIcon className={`h-5 w-5 transition-transform ${showCustomPrompt ? 'rotate-180' : ''}`} />
          </button>
          {showCustomPrompt && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'Focus on performance optimizations' or 'Check for adherence to SOLID principles.'"
              className="w-full mt-2 p-2 bg-gray-900/50 border border-gray-600 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm h-24"
              spellCheck="false"
            />
          )}
        </div>
      </div>

      <div className="flex-grow p-4 pt-0 flex flex-col">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here, or load it from a source above."
          className="w-full flex-grow p-3 bg-gray-900/50 border border-gray-600 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
          spellCheck="false"
          disabled={!!selectedFile}
        />
      </div>

      <div className="p-4 bg-gray-700/50 rounded-b-lg border-t border-gray-600 flex justify-end">
        <button
          onClick={handleReviewClick}
          disabled={isLoading || !code || !selectedFile}
          className="flex items-center gap-2 px-6 py-2.5 font-semibold bg-green-600 text-white rounded-md hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed transition-colors"
        >
          <SparklesIcon />
          {isLoading ? 'Reviewing...' : 'Review File'}
        </button>
      </div>
    </div>
  );
};
