"use client";

import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Download, Maximize2, Minimize2, FileText, RefreshCw, AlertCircle, Eye } from "lucide-react";

interface DocxViewerProps {
  fileUrl: string;
  title: string;
}

export default function DocxViewer({ fileUrl, title }: DocxViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useGoogleFallback, setUseGoogleFallback] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!fileUrl || useGoogleFallback) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function loadDocx() {
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = "";
          const docxPreview = await import("docx-preview");
          await docxPreview.renderAsync(arrayBuffer, containerRef.current, undefined, {
            className: "docx-rendered-page",
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            ignoreFonts: false,
            breakPages: true,
            experimental: true,
          });
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to render DOCX with docx-preview:", err);
        if (isMounted) {
          setError(err.message || "Không thể render file DOCX trực tiếp.");
          setIsLoading(false);
        }
      }
    }

    loadDocx();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, useGoogleFallback]);

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${isFullscreen ? "fixed inset-4 z-50 rounded-xl" : "h-[750px] w-full"}`}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200 truncate max-w-xs sm:max-w-md">{title}</h3>
            <p className="text-[10px] text-zinc-500 font-mono font-medium">Trình xem tài liệu Microsoft Word (DOCX)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseGoogleFallback(!useGoogleFallback)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              useGoogleFallback
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
            title="Chuyển đổi giữa docx-preview và Google Docs Viewer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{useGoogleFallback ? "NATIVE RENDER" : "GOOGLE VIEWER"}</span>
          </button>

          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">Tab mới</span>
          </a>

          <a
            href={fileUrl}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tải về</span>
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4 text-amber-400" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 bg-zinc-900/30 overflow-auto relative p-4 scrollbar-thin">
        {useGoogleFallback ? (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
            className="w-full h-full border-0 rounded-xl bg-white shadow-xl"
            title={title}
          />
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 space-y-3">
                <RefreshCw className="h-6 w-6 text-violet-400 animate-spin" />
                <p className="text-xs font-semibold text-zinc-400">Đang đọc và render tài liệu Word (DOCX)...</p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                <AlertCircle className="h-10 w-10 text-amber-400" />
                <div>
                  <p className="text-sm font-bold text-zinc-200">Không thể render trực tiếp file Word này</p>
                  <p className="text-xs text-zinc-500 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setUseGoogleFallback(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-md"
                >
                  Chuyển sang Google Docs Viewer
                </button>
              </div>
            )}

            <div
              ref={containerRef}
              className={`docx-wrapper flex justify-center text-zinc-900 transition-opacity ${isLoading ? "opacity-0" : "opacity-100"}`}
            />
          </>
        )}
      </div>
    </div>
  );
}
