export interface Language {
  value: string;
  label: string;
  extensions: string[];
}

export interface CodeFile {
  path: string;
  language: Language;
  handle?: FileSystemFileHandle; // For local files
  content?: string; // Loaded on demand
}

export interface GitHubTreeFile {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url: string;
}

export interface GitHubContent {
  content: string;
  encoding: 'base64' | string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  fileName: string;
  language: string;
  feedback: string;
  code: string;
  mode: string;
}

declare global {
  interface Window {
    showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
  }
}