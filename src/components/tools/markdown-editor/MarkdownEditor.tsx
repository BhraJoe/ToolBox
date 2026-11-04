import { useMemo, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
  Bold,
  Code2,
  Copy,
  Download,
  Eye,
  FileCode2,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  SplitSquareVertical,
  Strikethrough,
  Trash2,
  Upload,
} from 'lucide-react';

const TEMPLATE_MARKDOWN: Record<string, string> = {
  readme: `# Project Title

A short description of the project and what it does.

## Features
- Fast and responsive interface
- Easy to deploy
- Built for productivity

## Technologies
- React
- TypeScript
- Vite

## Installation
\`\`\`bash
npm install
npm run dev
\`\`\`

## Usage
Run the app locally and visit the development server.

## Contributing
Please open an issue or submit a pull request with your ideas.

## License
This project is licensed under the MIT License.
`,
  documentation: `# Project Documentation

## Overview
This project provides a streamlined way to manage documentation and day-to-day tasks.

## Requirements
- Node.js 18+
- A modern browser
- A terminal with Git installed

## Installation
1. Clone the repository.
2. Install the dependencies.
3. Start the app with the local dev command.

## Configuration
Set the required environment variables before running the application.

## Usage
Use the product for writing notes, managing tasks, and documenting your process.

## Examples
- Getting started
- Team onboarding
- Release notes

## Troubleshooting
Check the logs, confirm environment settings, and re-run the setup steps.
`,
  notes: `# Weekly Team Meeting

**Date:** 2026-11-04

**Participants:** Alex, Sam, Priya, Jordan

## Agenda
- Review open tasks
- Discuss project blockers
- Finalize launch checklist

## Discussion Points
- Feature rollout is ahead of schedule.
- Testing coverage needs another pass.
- Documentation still needs final review.

## Decisions
- Keep the launch date unchanged.
- Prioritize the onboarding flow improvements.

## Action Items
- [ ] Share updated QA notes
- [ ] Prepare release notes draft
- [ ] Confirm deployment checklist
`,
  example: `# Sample Markdown

This is a paragraph with **bold text**, *italic text*, and ~~strikethrough~~.

## Lists
- First item
- Second item
- Third item

1. First numbered item
2. Second numbered item

## Links and Images
[ToolBox](https://example.com)

![Example image](https://images.unsplash.com/photo-1516321165247-4aa89a48be28?auto=format&fit=crop&w=800&q=80)

## Code
\`\`\`ts
const message = 'Hello, Markdown!';
console.log(message);
\`\`\`

> This is a blockquote from a helpful teammate.
`,
};

type ViewMode = 'editor' | 'preview' | 'split';
type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'strikethrough'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'bullet-list'
  | 'ordered-list'
  | 'blockquote'
  | 'inline-code'
  | 'code-block'
  | 'link'
  | 'image'
  | 'table'
  | 'hr';

const TOOLBAR_ACTIONS: { action: ToolbarAction; label: string; icon: typeof Bold }[] = [
  { action: 'bold', label: 'Bold', icon: Bold },
  { action: 'italic', label: 'Italic', icon: Italic },
  { action: 'strikethrough', label: 'Strikethrough', icon: Strikethrough },
  { action: 'heading-1', label: 'H1', icon: Heading1 },
  { action: 'heading-2', label: 'H2', icon: Heading2 },
  { action: 'heading-3', label: 'H3', icon: Heading3 },
  { action: 'bullet-list', label: 'List', icon: List },
  { action: 'ordered-list', label: 'Numbered', icon: ListOrdered },
  { action: 'blockquote', label: 'Quote', icon: Quote },
  { action: 'inline-code', label: 'Code', icon: Code2 },
  { action: 'code-block', label: 'Block', icon: FileCode2 },
  { action: 'link', label: 'Link', icon: Link2 },
  { action: 'image', label: 'Image', icon: Image },
  { action: 'table', label: 'Table', icon: SplitSquareVertical },
  { action: 'hr', label: 'Rule', icon: Minus },
];

function getCodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((item) => getCodeText(item)).join('');
  }

  if (node && typeof node === 'object' && 'props' in node) {
    const props = node.props as { children?: ReactNode };
    return getCodeText(props.children);
  }

  return '';
}

export default function MarkdownEditor() {
  const [markdown, setMarkdown] = useState(TEMPLATE_MARKDOWN.example);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const stats = useMemo(() => {
    const lines = markdown.length === 0 ? 0 : markdown.split(/\r?\n/).length;
    const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
    const characters = markdown.length;
    const charactersNoSpaces = markdown.replace(/\s+/g, '').length;

    return { lines, words, characters, charactersNoSpaces };
  }, [markdown]);

  const lineNumbers = useMemo(
    () => Array.from({ length: Math.max(1, stats.lines) }, (_, index) => index + 1),
    [stats.lines],
  );

  const updateStatus = (message: string) => {
    setStatusMessage(message);
    const timerKey = '__markdownStatusTimer' as const;
    const windowWithTimer = window as typeof window & Record<string, number | undefined>;
    const current = windowWithTimer[timerKey];
    if (current) {
      window.clearTimeout(current);
    }

    const timeoutId = window.setTimeout(() => setStatusMessage(''), 2200);
    windowWithTimer[timerKey] = timeoutId;
  };

  const setMarkdownSelection = (start: number, end: number) => {
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, end);
    });
  };

  const applyToolbarAction = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);
    const textToInsert = selectedText || 'text';

    let insertion = '';
    let selectionAfterInsert = { start: selectionStart, end: selectionStart };

    switch (action) {
      case 'bold':
        insertion = `**${textToInsert}**`;
        selectionAfterInsert = {
          start: selectionStart + 2,
          end: selectionStart + 2 + textToInsert.length,
        };
        break;
      case 'italic':
        insertion = `*${textToInsert}*`;
        selectionAfterInsert = {
          start: selectionStart + 1,
          end: selectionStart + 1 + textToInsert.length,
        };
        break;
      case 'strikethrough':
        insertion = `~~${textToInsert}~~`;
        selectionAfterInsert = {
          start: selectionStart + 2,
          end: selectionStart + 2 + textToInsert.length,
        };
        break;
      case 'heading-1':
        insertion = `# ${textToInsert || 'Heading 1'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'heading-2':
        insertion = `## ${textToInsert || 'Heading 2'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'heading-3':
        insertion = `### ${textToInsert || 'Heading 3'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'bullet-list':
        insertion = `- ${textToInsert || 'Item'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'ordered-list':
        insertion = `1. ${textToInsert || 'Item'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'blockquote':
        insertion = `> ${textToInsert || 'Quote'}`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'inline-code':
        insertion = `\`${textToInsert || 'code'}\``;
        selectionAfterInsert = {
          start: selectionStart + 1,
          end: selectionStart + 1 + (textToInsert || 'code').length,
        };
        break;
      case 'code-block':
        insertion = `\n\`\`\`\n${textToInsert || 'code'}\n\`\`\`\n`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'link':
        insertion = `[${textToInsert || 'Link text'}](https://example.com)`;
        selectionAfterInsert = {
          start: selectionStart + 1,
          end: selectionStart + 1 + (textToInsert || 'Link text').length,
        };
        break;
      case 'image':
        insertion = `![${textToInsert || 'Alt text'}](https://example.com/image.png)`;
        selectionAfterInsert = {
          start: selectionStart + 2,
          end: selectionStart + 2 + (textToInsert || 'Alt text').length,
        };
        break;
      case 'table':
        insertion = `| Column 1 | Column 2 |\n| --- | --- |\n| Value 1 | Value 2 |`;
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      case 'hr':
        insertion = '\n---\n';
        selectionAfterInsert = {
          start: selectionStart + insertion.length,
          end: selectionStart + insertion.length,
        };
        break;
      default:
        insertion = textToInsert;
        selectionAfterInsert = { start: selectionStart, end: selectionStart + insertion.length };
        break;
    }

    const nextValue = `${value.slice(0, selectionStart)}${insertion}${value.slice(selectionEnd)}`;
    setMarkdown(nextValue);
    setMarkdownSelection(selectionAfterInsert.start, selectionAfterInsert.end);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      if (markdown.trim() && !window.confirm(`Replace the current markdown with "${file.name}"?`)) {
        return;
      }

      try {
        const result = await file.text();
        setMarkdown(result);
        setImportedFileName(file.name);
        updateStatus(`Imported ${file.name}`);
      } catch {
        updateStatus('Unable to read the file.');
      }
    };

    input.click();
  };

  const handleDownload = () => {
    const filename = importedFileName ? importedFileName.replace(/\.(md|markdown)$/i, '') : 'document';
    const proposedName = `${filename}.md`;
    const requestedName = window.prompt('Name the Markdown file', proposedName) || proposedName;
    const finalName = requestedName.toLowerCase().endsWith('.md') || requestedName.toLowerCase().endsWith('.markdown')
      ? requestedName
      : `${requestedName}.md`;

    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = finalName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      updateStatus(`Downloaded ${finalName}`);
    } catch {
      updateStatus('Unable to download the file.');
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      updateStatus('Markdown copied to clipboard.');
    } catch {
      updateStatus('Unable to copy the source.');
    }
  };

  const handleCopyRendered = async () => {
    try {
      const renderedText = document.querySelector('.markdown-editor__preview-content')?.textContent ?? markdown;
      await navigator.clipboard.writeText(renderedText);
      updateStatus('Rendered text copied.');
    } catch {
      updateStatus('Unable to copy the rendered text.');
    }
  };

  const handleClear = () => {
    if (markdown.trim() && !window.confirm('Clear the current document?')) {
      return;
    }

    setMarkdown('');
    setImportedFileName(null);
    updateStatus('Document cleared.');
  };

  const handleTemplateLoad = (templateName: keyof typeof TEMPLATE_MARKDOWN) => {
    if (markdown.trim() && !window.confirm('Replace the current document with this template?')) {
      return;
    }

    setMarkdown(TEMPLATE_MARKDOWN[templateName]);
    setImportedFileName(null);
    updateStatus(`Loaded ${templateName} template.`);
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      updateStatus('Code copied.');
    } catch {
      updateStatus('Unable to copy code block.');
    }
  };

  return (
    <div className="markdown-editor">
      <div className="markdown-editor__toolbar">
        <div className="markdown-editor__toolbar-actions" aria-label="Markdown formatting toolbar">
          {TOOLBAR_ACTIONS.map(({ action, label, icon: IconComponent }) => (
            <button
              key={action}
              type="button"
              className="markdown-editor__toolbar-button"
              aria-label={label}
              title={label}
              onClick={() => applyToolbarAction(action)}
            >
              <IconComponent size={14} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="markdown-editor__toolbar-right">
          <button type="button" className="markdown-editor__action-button" onClick={handleImport}>
            <Upload size={14} aria-hidden="true" /> Import
          </button>
          <button type="button" className="markdown-editor__action-button" onClick={handleDownload}>
            <Download size={14} aria-hidden="true" /> Download
          </button>
          <button type="button" className="markdown-editor__action-button" onClick={handleCopyMarkdown}>
            <Copy size={14} aria-hidden="true" /> Copy MD
          </button>
          <button type="button" className="markdown-editor__action-button" onClick={handleClear}>
            <Trash2 size={14} aria-hidden="true" /> Clear
          </button>
        </div>
      </div>

      <div className="markdown-editor__stats">
        <div className="markdown-editor__stat-pill">
          <span>Words</span>
          <strong>{stats.words}</strong>
        </div>
        <div className="markdown-editor__stat-pill">
          <span>Characters</span>
          <strong>{stats.characters}</strong>
        </div>
        <div className="markdown-editor__stat-pill">
          <span>Characters (no spaces)</span>
          <strong>{stats.charactersNoSpaces}</strong>
        </div>
        <div className="markdown-editor__stat-pill">
          <span>Lines</span>
          <strong>{stats.lines}</strong>
        </div>
      </div>

      <div className="markdown-editor__templates">
        <span className="markdown-editor__templates-label">Templates</span>
        <div className="markdown-editor__template-list">
          {Object.entries(TEMPLATE_MARKDOWN).map(([name]) => (
            <button
              key={name}
              type="button"
              className="markdown-editor__template-button"
              onClick={() => handleTemplateLoad(name as keyof typeof TEMPLATE_MARKDOWN)}
              title={`Load ${name} template`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="markdown-editor__main-controls">
        <div className="markdown-editor__view-toggle" role="tablist" aria-label="Markdown view modes">
          <button type="button" className={viewMode === 'editor' ? 'is-active' : ''} onClick={() => setViewMode('editor')}>
            <FileText size={14} aria-hidden="true" /> Editor
          </button>
          <button type="button" className={viewMode === 'preview' ? 'is-active' : ''} onClick={() => setViewMode('preview')}>
            <Eye size={14} aria-hidden="true" /> Preview
          </button>
          <button type="button" className={viewMode === 'split' ? 'is-active' : ''} onClick={() => setViewMode('split')}>
            <SplitSquareVertical size={14} aria-hidden="true" /> Split
          </button>
        </div>

        {importedFileName && <div className="markdown-editor__file-meta">Imported: {importedFileName}</div>}
        <button type="button" className="markdown-editor__action-button" onClick={handleCopyRendered}>
          <Copy size={14} aria-hidden="true" /> Copy rendered text
        </button>
      </div>

      {statusMessage && <p className="markdown-editor__status" role="status">{statusMessage}</p>}

      <div className={`markdown-editor__workspace markdown-editor__workspace--${viewMode}`}>
        {(viewMode === 'editor' || viewMode === 'split') && (
          <section className="markdown-editor__panel markdown-editor__panel--editor" aria-label="Markdown editor">
            <div className="markdown-editor__panel-header">
              <h2>Markdown</h2>
            </div>
            <div className="markdown-editor__editor-shell">
              <div className="markdown-editor__line-numbers" aria-hidden="true">
                {lineNumbers.map((lineNumber) => (
                  <span key={lineNumber}>{lineNumber}</span>
                ))}
              </div>
              <textarea
                ref={textareaRef}
                className="markdown-editor__textarea"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                spellCheck
                placeholder="Write your Markdown here..."
                aria-label="Markdown editor"
              />
            </div>
          </section>
        )}

        {(viewMode === 'preview' || viewMode === 'split') && (
          <section className="markdown-editor__panel markdown-editor__panel--preview" aria-label="Markdown preview">
            <div className="markdown-editor__panel-header">
              <h2>Preview</h2>
            </div>
            <div className="markdown-editor__preview-content">
              <div className="markdown-editor__markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                  components={{
                    code({ children, className, ...props }) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre({ children }) {
                      const rawCode = getCodeText(children);
                      const label = 'text';
                      return (
                        <div className="markdown-editor__snippet">
                          <div className="markdown-editor__snippet-header">
                            <span>{label}</span>
                            <button type="button" onClick={() => handleCopyCode(rawCode)}>
                              <Copy size={12} aria-hidden="true" /> Copy code
                            </button>
                          </div>
                          <pre>{children}</pre>
                        </div>
                      );
                    },
                  }}
                >
                  {markdown || '## Preview\n\nStart typing to see your Markdown render here.'}
                </ReactMarkdown>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
