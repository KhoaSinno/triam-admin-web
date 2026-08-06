"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen, ExternalLink, Download, Maximize2, Minimize2, RefreshCw, AlertCircle } from "lucide-react";

interface EpubViewerProps {
  fileUrl: string;
  title: string;
}

interface TocItem {
  id: string;
  href: string;
  label: string;
  subitems?: TocItem[];
}

export default function EpubViewer({ fileUrl, title }: EpubViewerProps) {
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentSection, setCurrentSection] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!fileUrl || !viewerRef.current) return;

    let isMounted = true;
    let book: any = null;
    let rendition: any = null;
    setIsLoading(true);
    setIsReady(false);
    setError(null);
    setToc([]);
    setCurrentSection("");

    async function initEpub() {
      try {
        const ePub = (await import("epubjs")).default;
        if (!isMounted) return;

        book = ePub(fileUrl);

        rendition = book.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "auto",
        });
        renditionRef.current = rendition;

        await rendition.display();

        book.loaded.navigation
          .then((nav: any) => {
            if (isMounted && nav?.toc) {
              setToc(nav.toc);
            }
          })
          .catch(() => {
            // The book may be destroyed while its navigation is still loading.
          });

        rendition.on("relocated", (location: any) => {
          if (isMounted && location?.start?.href) {
            setCurrentSection(location.start.href);
          }
        });

        if (isMounted) {
          bookRef.current = book;
          renditionRef.current = rendition;
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Failed to load EPUB file:", err);
        if (isMounted) {
          setError(err.message || "Không thể đọc file EPUB.");
          setIsLoading(false);
        }
      }
    }

    initEpub();

    return () => {
      isMounted = false;
      if (rendition) {
        try {
          rendition.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
      if (book) {
        try {
          book.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
      }
      if (renditionRef.current === rendition) renditionRef.current = null;
      if (bookRef.current === book) bookRef.current = null;
    };
  }, [fileUrl]);

  const handleNext = () => {
    if (!isReady || !renditionRef.current) return;
    const rendition = renditionRef.current;
    void Promise.resolve(rendition.next()).catch(() => {
      if (renditionRef.current === rendition) setError("Không thể chuyển trang EPUB.");
    });
  };

  const handlePrev = () => {
    if (!isReady || !renditionRef.current) return;
    const rendition = renditionRef.current;
    void Promise.resolve(rendition.prev()).catch(() => {
      if (renditionRef.current === rendition) setError("Không thể chuyển trang EPUB.");
    });
  };

  const handleSelectToc = (href: string) => {
    if (isReady && renditionRef.current && href) {
      const rendition = renditionRef.current;
      void Promise.resolve(rendition.display(href)).catch(() => {
        if (renditionRef.current === rendition) setError("Không thể mở chương EPUB.");
      });
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(70, Math.min(160, fontSize + delta));
    setFontSize(newSize);
    if (isReady && renditionRef.current) {
      renditionRef.current.themes.fontSize(`${newSize}%`);
    }
  };

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl transition-all ${isFullscreen ? "fixed inset-4 z-50 rounded-xl" : "h-[750px] w-full"}`}>
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/90 border-b border-zinc-800 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-200 truncate max-w-xs sm:max-w-md">{title}</h3>
            <p className="text-[10px] text-zinc-500 font-mono font-medium">Trình đọc Sách điện tử (EPUB Reader)</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* TOC Selector */}
          {toc.length > 0 && (
            <select
              value={currentSection}
              onChange={(e) => handleSelectToc(e.target.value)}
              disabled={!isReady}
              className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-violet-500 max-w-[160px] truncate disabled:opacity-50"
            >
              <option value="">Chương sách...</option>
              {toc.map((item) => (
                <option key={item.id || item.href} value={item.href}>
                  {item.label.trim()}
                </option>
              ))}
            </select>
          )}

          {/* Font Size controls */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => handleFontSizeChange(-10)}
              disabled={!isReady}
              className="px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Giảm cỡ chữ"
            >
              A-
            </button>
            <span className="text-[10px] font-mono text-zinc-400 px-1">{fontSize}%</span>
            <button
              onClick={() => handleFontSizeChange(10)}
              disabled={!isReady}
              className="px-2 py-1 text-xs font-bold text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
              title="Tăng cỡ chữ"
            >
              A+
            </button>
          </div>

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

      {/* Main EPUB Canvas Viewport */}
      <div className="flex-1 bg-white relative overflow-hidden flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-sm z-10 space-y-3">
            <RefreshCw className="h-6 w-6 text-violet-400 animate-spin" />
            <p className="text-xs font-semibold text-zinc-400">Đang tải cấu trúc và trang sách EPUB...</p>
          </div>
        )}

        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3 bg-zinc-950">
            <AlertCircle className="h-10 w-10 text-amber-400" />
            <p className="text-sm font-bold text-zinc-200">Lỗi nạp file EPUB</p>
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        ) : (
          <>
            {/* Prev Button Overlay */}
            <button
              onClick={handlePrev}
              disabled={!isReady}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 text-zinc-200 hover:bg-violet-600 hover:text-white border border-zinc-700 shadow-2xl transition-all z-20 disabled:opacity-40 disabled:pointer-events-none"
              title="Trang trước"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            {/* Next Button Overlay */}
            <button
              onClick={handleNext}
              disabled={!isReady}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full bg-zinc-900/80 text-zinc-200 hover:bg-violet-600 hover:text-white border border-zinc-700 shadow-2xl transition-all z-20 disabled:opacity-40 disabled:pointer-events-none"
              title="Trang tiếp theo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            {/* EPUB Container */}
            <div ref={viewerRef} className="w-full h-full text-zinc-900" />
          </>
        )}
      </div>
    </div>
  );
}
