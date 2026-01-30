/**
 * Viewer Component
 * Displays parsed documents with sections and navigation
 * Supports markdown, images, text files, and download for unsupported types
 */

import ReactMarkdown from "react-markdown";
import { useMemoryBankDocument } from "../hooks/useMemoryBankDocs";
import type { ParsedDocument } from "../hooks/useMemoryBankDocs";
import { detectFileType, getDisplayMode } from "../utils/fileTypeUtils";

interface ViewerProps {
  category: string;
  file: string;
}

export function Viewer({ category, file }: ViewerProps) {
  const doc = useMemoryBankDocument(category, file);

  const filePath = category === "root" ? file : `${category}/${file}`;
  const fileType = detectFileType(file);
  const displayMode = getDisplayMode(file);

  if (!doc) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 bg-gray-50 p-6">
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <code className="bg-red-100 px-2 py-1 rounded text-sm text-red-700">
              {filePath}
            </code>
            <span className="text-red-500 font-medium">Document not found</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-4">📄</div>
            <p>Document not found</p>
            <p className="text-sm text-gray-400 mt-2">
              The file could not be located in the memory bank
            </p>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = new Date(doc.created).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updatedDate = new Date(doc.updated).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Image display mode
  if (displayMode === 'image') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white">
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {filePath}
            </code>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <div>
                <span className="font-semibold">Created:</span> {createdDate} IST
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {updatedDate} IST
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-100 p-8">
          <img
            src={doc.content}
            alt={doc.title}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        </div>
      </div>
    );
  }

  // Text file display mode
  if (displayMode === 'text') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white">
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {filePath}
            </code>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <div>
                <span className="font-semibold">Created:</span> {createdDate} IST
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {updatedDate} IST
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
            {doc.content}
          </pre>
        </div>
      </div>
    );
  }

  // Download mode for unsupported types
  if (displayMode === 'download') {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white">
        <div className="border-b border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm text-gray-600">
            <code className="bg-gray-100 px-2 py-1 rounded text-sm">
              {filePath}
            </code>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6">
              <div>
                <span className="font-semibold">Created:</span> {createdDate} IST
              </div>
              <div>
                <span className="font-semibold">Updated:</span> {updatedDate} IST
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{doc.title}</h2>
            <p className="text-gray-600 mb-4">
              This file type is not supported for preview
            </p>
            <a
              href={doc.content}
              download={doc.title}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download File
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Markdown display mode (original implementation)
  const sectionIdMap = new Map(
    doc.sections.map(section => [section.title, section.id])
  );

  const HeaderWithId = ({ level, children, ...props }: any) => {
    const title = typeof children === 'string' ? children : children?.toString?.() || '';
    const id = sectionIdMap.get(title);
    const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
    const className = level === 1 ? "text-2xl font-bold mt-8 mb-4 text-gray-900 scroll-mt-4" : 
                     level === 2 ? "text-xl font-bold mt-6 mb-3 text-gray-900 scroll-mt-4" : 
                                  "text-lg font-bold mt-5 mb-2 text-gray-900 scroll-mt-4";
    
    return <Tag id={id} className={className} {...props}>{children}</Tag>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
      {/* Sections Toolbar */}
      {doc.sections.length > 0 && (
        <div className="border-b border-gray-200 bg-white p-3">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Sections
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.sections
              .filter((s: any) => s.level <= 2)
              .map((section: any) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-blue-50 transition-colors text-gray-700 whitespace-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(section.id);
                    element?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  {section.title}
                </a>
              ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {doc.filePath}
          </code>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-6">
            <div>
              <span className="font-semibold">Created:</span> {createdDate} IST
            </div>
            <div>
              <span className="font-semibold">Updated:</span> {updatedDate} IST
            </div>
          </div>
        </div>
      </div>

      {/* Markdown Content */}
      <div className="p-4 sm:p-6">
        <div className="max-w-4xl prose prose-sm">
          <ReactMarkdown
            components={{
              h1: HeaderWithId,
              h2: HeaderWithId,
              h3: HeaderWithId,
              p: ({ children }) => (
                <p className="mb-4 text-gray-700 leading-relaxed">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside mb-4 text-gray-700 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside mb-4 text-gray-700 space-y-1">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="ml-2">{children}</li>,
              code: ({ inline, children }: any) =>
                inline ? (
                  <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-red-600">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4">
                    {children}
                  </code>
                ),
              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <table className="border-collapse border border-gray-300 mb-4 w-full">
                  {children}
                </table>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold text-gray-900">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 px-4 py-2 text-gray-700">
                  {children}
                </td>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {children}
                </a>
              ),
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>
      </div>
      </div>{/* end scrollable wrapper */}
    </div>
  );
}