/**
 * Document Parser
 * Extracts plain text from PDF, DOCX, TXT files
 */
import fs   from 'fs';
import path from 'path';
import pdfParse  from 'pdf-parse/lib/pdf-parse.js';
import mammoth   from 'mammoth';

/**
 * Extract text from a file
 * @param {string} filePath  - Absolute path to file
 * @param {string} mimetype  - e.g. 'application/pdf'
 * @returns {Promise<string>}
 */
export async function extractText(filePath, mimetype) {
  const buffer = fs.readFileSync(filePath);

  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimetype === 'text/plain' || path.extname(filePath) === '.txt') {
    return buffer.toString('utf-8');
  }

  if (mimetype === 'text/markdown' || path.extname(filePath) === '.md') {
    return buffer.toString('utf-8');
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}
