"use client";

import React, { useState } from "react";
import { ExternalLink, Download, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, FileText } from "lucide-react";

interface PdfViewerProps {
  fileUrl: string;
  title: string;
}

export default function PdfViewer({ fileUrl, title }: PdfViewerProps) {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleZoomReset = () => setZoom(100);

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${isFullscreen ? "fixed inset-4 z-50 rounded-xl" : "h-[750px] w-full"}`}>
      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200 truncate max-w-xs sm:max-w-md">{title}</h3>
            <p className="text-[10px] text-zinc-500 font-mono font-medium">Trình xem tài liệu PDF Trực tiếp</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-zinc-300 px-2 min-w-[42px] text-center">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-1.5 text-zinc-500 hover:text-zinc-300 border-l border-zinc-850 ml-0.5 transition-colors"
              title="Đặt lại zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          {/* Action buttons */}
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-violet-400" />
            <span className="hidden sm:inline">Mở tab mới</span>
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

      {/* PDF Viewport Frame */}
      <div className="flex-1 bg-zinc-900/40 relative overflow-hidden flex items-center justify-center p-2">
        <div
          className="w-full h-full transition-transform duration-200 ease-out origin-center"
          style={{ transform: `scale(${zoom / 100})` }}
        >
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1`}
            className="w-full h-full border-0 rounded-xl bg-white shadow-2xl"
            title={title}
          />
        </div>
      </div>
    </div>
  );
}
