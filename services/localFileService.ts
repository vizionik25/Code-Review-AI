import { LANGUAGES } from '../constants';
import { CodeFile, Language } from '../types';

function getLanguageForFile(filePath: string): Language | undefined {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    return LANGUAGES.find(lang => lang.extensions.includes(extension));
}

async function scanFiles(directoryHandle: FileSystemDirectoryHandle, pathPrefix = ''): Promise<CodeFile[]> {
    let files: CodeFile[] = [];
    for await (const entry of directoryHandle.values()) {
        const nestedPath = `${pathPrefix}${entry.name}`;
        if (entry.kind === 'file') {
            const language = getLanguageForFile(entry.name);
            if (language) {
                files.push({
                    path: nestedPath,
                    language,
                    // FIX: Add explicit type assertion because the type guard may not be correctly inferred.
                    handle: entry as FileSystemFileHandle,
                });
            }
        } else if (entry.kind === 'directory') {
            // Don't scan common dependency/build directories
            if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git' && entry.name !== 'build') {
                 // FIX: Add explicit type assertion because the type guard may not be correctly inferred in all TS environments.
                 const nestedFiles = await scanFiles(entry as FileSystemDirectoryHandle, `${nestedPath}/`);
                 files = files.concat(nestedFiles);
            }
        }
    }
    return files;
}

export async function openDirectoryAndGetFiles(): Promise<CodeFile[]> {
    if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support the File System Access API. Please use a modern browser like Chrome or Edge.');
    }

    try {
        const directoryHandle = await window.showDirectoryPicker();
        return await scanFiles(directoryHandle);
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
             // User cancelled the picker. Return empty array, not an error.
             return [];
        }
        console.error('Error opening directory:', err);
        throw new Error('Failed to open directory. Please grant the necessary permissions.');
    }
}

export async function readFileContent(file: CodeFile): Promise<string> {
    if (!file.handle) {
        throw new Error('No file handle available for this local file.');
    }
    try {
        const fileObject = await file.handle.getFile();
        return await fileObject.text();
    } catch (err) {
        console.error('Error reading file content:', err);
        throw new Error(`Failed to read content of ${file.path}.`);
    }
}
