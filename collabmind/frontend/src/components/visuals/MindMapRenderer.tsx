"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Copy, Check, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface MindMapRendererProps {
  mermaidCode: string;
}

export const MindMapRenderer: React.FC<MindMapRendererProps> = ({ mermaidCode }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    let isMounted = true;

    const renderMermaid = async () => {
      try {
        setError(null);
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "Inter, sans-serif",
          themeVariables: {
            darkMode: true,
            background: "#090d16",
            primaryColor: "#6366f1",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#818cf8",
            lineColor: "#818cf8",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#312e81",
          },
        });

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, mermaidCode);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        if (isMounted) {
          setError("Failed to render mind map syntax. Inspect raw Mermaid markdown below.");
        }
      }
    };

    if (mermaidCode) {
      renderMermaid();
    }

    return () => {
      isMounted = false;
    };
  }, [mermaidCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collabmind-map-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Controls Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Interactive Mind Map
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-400 font-mono px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Reset Zoom"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>

          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDownloadSvg}
            className="p-1.5 text-indigo-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition"
            title="Download SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas / Raw View */}
      <div className="flex-1 overflow-auto p-6 flex items-center justify-center relative min-h-[350px]">
        {error ? (
          <div className="text-center p-4 max-w-md">
            <p className="text-amber-400 text-sm mb-2">{error}</p>
            <pre className="text-xs text-left bg-slate-900 p-3 rounded text-slate-300 font-mono overflow-x-auto">
              {mermaidCode}
            </pre>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease-out" }}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="flex flex-col items-center space-y-2 text-slate-500">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs">Synthesizing diagram nodes...</span>
          </div>
        )}
      </div>
    </div>
  );
};
