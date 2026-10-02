import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = "plaintext", value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div
      id={`codeblock-${language}`}
      className="relative my-3.5 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-sm font-mono text-sm"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/50 border-b border-slate-800/80 text-slate-400">
        <span className="text-xs font-mono text-slate-400 lowercase">{language || "plaintext"}</span>
        <button
          id="copy-code-button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="p-4 overflow-x-auto text-slate-300 leading-relaxed font-mono text-[13.5px]">
        <pre className="m-0 p-0">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};
