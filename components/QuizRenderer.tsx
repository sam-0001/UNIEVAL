import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface QuestionRendererProps {
  content: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({ content }) => {
  return (
    <div className="prose-sm max-w-none text-slate-900 leading-relaxed overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline ? (
              <pre className="bg-slate-800 text-slate-100 p-3 rounded-lg overflow-x-auto text-sm my-3 font-mono">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          },
          table({ children, ...props }: any) {
            return (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-slate-200 border border-slate-200" {...props}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children, ...props }: any) {
            return <th className="px-4 py-2 bg-slate-50 text-left text-sm font-semibold text-slate-700" {...props}>{children}</th>;
          },
          td({ children, ...props }: any) {
            return <td className="px-4 py-2 text-sm text-slate-700 border-t border-slate-200" {...props}>{children}</td>;
          },
          img({ src, alt, ...props }: any) {
            return <img src={src} alt={alt} className="max-w-full h-auto rounded-lg my-3" {...props} />;
          },
          p({ children, ...props }: any) {
            return <p className="my-2" {...props}>{children}</p>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

interface OptionRendererProps {
  content: string;
}

export const OptionRenderer: React.FC<OptionRendererProps> = ({ content }) => {
  return (
    <div className="prose-sm max-w-none w-full overflow-x-auto">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p({ children, ...props }: any) {
            // Options usually don't need paragraph margins
            return <span className="" {...props}>{children}</span>;
          },
          code({ node, inline, className, children, ...props }: any) {
            return !inline ? (
              <pre className="bg-slate-800 text-slate-100 p-2 rounded overflow-x-auto text-xs my-2 font-mono">
                <code className={className} {...props}>{children}</code>
              </pre>
            ) : (
              <code className="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                {children}
              </code>
            );
          },
          img({ src, alt, ...props }: any) {
            return <img src={src} alt={alt} className="max-h-32 w-auto object-contain rounded my-1" {...props} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
