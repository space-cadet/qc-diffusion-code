/**
 * Viewer Component
 * Displays parsed markdown documents with sections and navigation
 */

import ReactMarkdown from "react-markdown";
import { useMemoryBankDocument } from "../hooks/useMemoryBankDocs";
import type { ParsedDocument } from "../hooks/useMemoryBankDocs";

interface ViewerProps {
  category: string;
  file: string;
}

export function Viewer({ category, file }: ViewerProps) {
  const doc = useMemoryBankDocument(category, file);

  // Construct the file path for display
  const filePath = category === "root" ? file : `${category}/${file}`;

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

  // Create a map of section titles to IDs for quick lookup
  const sectionIdMap = new Map(
    doc.sections.map(section => [section.title, section.id])
  );

  // Custom component that adds IDs to headers based on title matching
  const HeaderWithId = ({ level, children, ...props }: any) => {
    const title = typeof children === 'string' ? children : children?.toString?.() || '';
    const id = sectionIdMap.get(title);
    const Tag = level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4';
    const className = level === 1 ? "text-2xl font-bold mt-8 mb-4 text-gray-900 scroll-mt-20" : 
                     level === 2 ? "text-xl font-bold mt-6 mb-3 text-gray-900 scroll-mt-20" : 
                                  "text-lg font-bold mt-5 mb-2 text-gray-900 scroll-mt-20";
    
    return <Tag id={id} className={className} {...props}>{children}</Tag>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Sticky Sections Toolbar */}
      {doc.sections.length > 0 && (
        <div className="sticky top-0 z-20 border-b border-gray-200 bg-white p-3 shadow-sm">
          <div className="text-xs font-semibold text-gray-700 mb-2">
            Sections
          </div>
          <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
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
      <div className="border-b border-gray-200 bg-gray-50 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-sm text-gray-600">
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {doc.filePath}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
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
    </div>
  );
}