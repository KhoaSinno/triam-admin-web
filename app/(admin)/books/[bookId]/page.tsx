"use client";

import React, { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  adminFetch, 
  AdminBookDetailResponse, 
  getErrorMessage, 
  getBookSections, 
  getBookSectionDetail, 
  getBookJobs,
  exportBookJson,
  getAdminBookAudioUnits,
  updateAdminBookMetadata,
  regenerateAdminBookSummary,
  AdminBookSectionListItem,
  AdminJobListItem,
  AdminBookAudioUnitsResponse,
  AdminLearningUnitItem,
  AdminSegmentItem,
} from "@/lib/api";
import { formatDate, formatDateShort, truncateId, getInitials } from "@/lib/utils";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileCode,
  Info,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Copy,
  Clock,
  Coins,
  History,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  Database,
  FileText,
  User,
  Headphones,
  Edit3,
  Sparkles,
  Volume2,
  VolumeX,
  Download,
  RotateCw,
  CheckCircle2,
  XCircle,
  Globe,
  Lock,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import PdfViewer from "@/components/book-preview/pdf-viewer";
import DocxViewer from "@/components/book-preview/docx-viewer";
import EpubViewer from "@/components/book-preview/epub-viewer";

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookId = params.bookId as string;

  // Active Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "sections" | "audio" | "jobs" | "preview">("overview");

  // Selected outline section ID for Tab 2
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Job retry confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [retryJobId, setRetryJobId] = useState<string | null>(null);

  // Outline display mode filter & export state
  const [outlineModeFilter, setOutlineModeFilter] = useState<"full" | "pareto">("full");
  const [isExporting, setIsExporting] = useState(false);

  // Metadata edit modal state
  const [showEditMetadataModal, setShowEditMetadataModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editIsShared, setEditIsShared] = useState(false);

  // Audio Tab state
  const [audioMode, setAudioMode] = useState<"pareto" | "full">("pareto");
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [activeAudioTitle, setActiveAudioTitle] = useState<string>("");
  const [activeAudioScript, setActiveAudioScript] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Query 1: Fetch Book detail & Owner Info
  const {
    data: book,
    isLoading: isBookLoading,
    isError: isBookError,
    error,
    refetch: refetchBook,
    isRefetching: isBookRefetching,
  } = useQuery<AdminBookDetailResponse>({
    queryKey: ["adminBookDetail", bookId],
    queryFn: () => adminFetch<AdminBookDetailResponse>(`/books/${bookId}`),
  });

  // Query 2: Fetch Book sections outline tree
  const {
    data: sections = [],
    isLoading: isSectionsLoading,
    refetch: refetchSections,
  } = useQuery<AdminBookSectionListItem[]>({
    queryKey: ["adminBookSections", bookId],
    queryFn: () => getBookSections(bookId),
    enabled: activeTab === "sections",
  });

  // Query 3: Fetch detail contents of selected section
  const {
    data: sectionDetail,
    isLoading: isSectionDetailLoading,
  } = useQuery({
    queryKey: ["adminBookSectionDetail", bookId, selectedSectionId],
    queryFn: () => getBookSectionDetail(bookId, selectedSectionId!),
    enabled: activeTab === "sections" && !!selectedSectionId,
  });

  // Query 4: Fetch book historical processing jobs
  const {
    data: jobHistory = [],
    isLoading: isJobsLoading,
    refetch: refetchJobs,
  } = useQuery<AdminJobListItem[]>({
    queryKey: ["adminBookJobs", bookId],
    queryFn: () => getBookJobs(bookId),
    enabled: activeTab === "jobs",
  });

  // Query 5: Fetch Audio units and segments (Tab 4)
  const {
    data: audioUnitsData,
    isLoading: isAudioUnitsLoading,
    refetch: refetchAudioUnits,
  } = useQuery<AdminBookAudioUnitsResponse>({
    queryKey: ["adminBookAudioUnits", bookId, audioMode],
    queryFn: () => getAdminBookAudioUnits(bookId, audioMode),
    enabled: activeTab === "audio",
  });

  // Mutation: Update book metadata
  const updateMetadataMutation = useMutation({
    mutationFn: (payload: { title?: string; author?: string; is_shared?: boolean }) =>
      updateAdminBookMetadata(bookId, payload),
    onSuccess: () => {
      toast.success("Đã cập nhật thông tin sách thành công!");
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail", bookId] });
      setShowEditMetadataModal(false);
    },
    onError: (err) => {
      toast.error("Lỗi cập nhật sách: " + getErrorMessage(err));
    },
  });

  // Mutation: Trigger retry for failed jobs
  const retryMutation = useMutation({
    mutationFn: (jobId: string) =>
      adminFetch<{ message: string }>(`/jobs/${jobId}/retry`, { method: "POST" }),
    onSuccess: (data) => {
      toast.success(data.message || "Đã gửi yêu cầu chạy lại tiến trình!");
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail", bookId] });
      queryClient.invalidateQueries({ queryKey: ["adminBookJobs", bookId] });
      setShowConfirmModal(false);
    },
    onError: (err) => {
      toast.error("Không thể chạy lại Job: " + getErrorMessage(err));
    },
  });

  // Mutation: Regenerate AI Summary
  const regenerateSummaryMutation = useMutation({
    mutationFn: () => regenerateAdminBookSummary(bookId),
    onSuccess: (data) => {
      toast.success(data.message || "Đã gửi yêu cầu sinh lại tóm tắt AI dưới nền!");
      queryClient.invalidateQueries({ queryKey: ["adminBookDetail", bookId] });
    },
    onError: (err) => {
      toast.error("Lỗi tạo lại tóm tắt AI: " + getErrorMessage(err));
    },
  });

  // HTML5 Audio Event Listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [activeAudioUrl]);

  // Audio Control Handlers
  const handlePlayAudio = (url: string, title: string, scriptText: string) => {
    if (!url) {
      toast.error("File audio chưa được sinh hoặc bị thiếu đường dẫn URL.");
      return;
    }
    setActiveAudioUrl(url);
    setActiveAudioTitle(title);
    setActiveAudioScript(scriptText || "Không có kịch bản văn bản.");
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.playbackRate = playbackRate;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            if (e.name === "AbortError") return;
            console.warn("Audio play error:", e);
            setIsPlaying(false);
          });
      }
    } else {
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !activeAudioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((e) => {
            if (e.name === "AbortError") return;
            console.warn("Audio play error:", e);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const triggerRetry = (jobId: string) => {
    setRetryJobId(jobId);
    setShowConfirmModal(true);
  };

  const handleConfirmRetry = () => {
    if (retryJobId) {
      retryMutation.mutate(retryJobId);
    }
  };

  const openEditMetadataModal = () => {
    if (!book) return;
    setEditTitle(book.title || "");
    setEditAuthor(book.author || "");
    setEditIsShared(!!book.is_shared);
    setShowEditMetadataModal(true);
  };

  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.error("Tên sách không được để trống!");
      return;
    }
    updateMetadataMutation.mutate({
      title: editTitle.trim(),
      author: editAuthor.trim(),
      is_shared: editIsShared,
    });
  };

  const handleExportJson = async () => {
    if (!book) return;
    try {
      setIsExporting(true);
      const data = await exportBookJson(bookId);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${book.title}_rag_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Đã xuất tệp JSON cấu trúc sách thành công!");
    } catch (err) {
      toast.error("Lỗi xuất JSON: " + getErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  };

  const formatSecondsToTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const hasFullMode = sections.some((s) => s.modes.includes("full"));

  const filteredSections = sections.filter((sec) => {
    if (outlineModeFilter === "full") {
      return hasFullMode ? sec.modes.includes("full") : true;
    }
    if (outlineModeFilter === "pareto") {
      return sec.modes.includes("pareto");
    }
    return true;
  });

  if (isBookLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded-lg"></div>
        <div className="h-16 w-full bg-zinc-850 rounded-xl"></div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 h-96 bg-zinc-900/30 rounded-2xl border border-zinc-850"></div>
          <div className="h-96 bg-zinc-900/30 rounded-2xl border border-zinc-850"></div>
        </div>
      </div>
    );
  }

  if (isBookError || !book) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Lỗi tải chi tiết cuốn sách</h2>
        <p className="text-sm text-zinc-400 max-w-sm mb-6">
          {error instanceof Error ? error.message : "ID cuốn sách không tồn tại hoặc đã bị xóa."}
        </p>
        <button
          onClick={() => router.push("/books")}
          className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-4 text-sm transition-all"
        >
          Trở lại danh sách
        </button>
      </div>
    );
  }

  const getStatusColor = (statusVal: string | null) => {
    if (!statusVal) return "text-zinc-450 border-zinc-800 bg-zinc-500/10";
    const colors: Record<string, string> = {
      draft: "text-zinc-400 border-zinc-800 bg-zinc-500/10",
      processing: "text-blue-400 border-blue-500/20 bg-blue-500/10",
      partial_ready: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10",
      ready: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      error: "text-rose-400 border-rose-500/20 bg-rose-500/10",
      cancelled: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      queued: "text-zinc-450 border-zinc-800 bg-zinc-900/10",
      completed: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
      pending: "text-amber-400 border-amber-500/20 bg-amber-500/10",
      failed: "text-rose-400 border-rose-500/20 bg-rose-500/10",
    };
    return colors[statusVal] || "text-zinc-400 border-zinc-850 bg-zinc-500/10";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative text-sm pb-10">
      {/* Back / Refresh / Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/books")}
          className="flex items-center gap-2 text-xs font-semibold text-zinc-450 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Danh sách sách
        </button>

        <div className="flex items-center gap-2">
          {/* Edit Metadata Button */}
          <button
            onClick={openEditMetadataModal}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
          >
            <Edit3 className="h-3.5 w-3.5 text-violet-400" />
            Sửa Metadata
          </button>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <Database className={`h-3.5 w-3.5 ${isExporting ? "animate-pulse" : ""}`} />
            {isExporting ? "Đang xuất JSON..." : "Xuất JSON"}
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => {
              refetchBook();
              if (activeTab === "sections") refetchSections();
              if (activeTab === "jobs") refetchJobs();
              if (activeTab === "audio") refetchAudioUnits();
            }}
            disabled={isBookRefetching}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isBookRefetching ? "animate-spin" : ""}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Book Basic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {book.title}
            </h1>
            {book.is_shared ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-400 uppercase">
                <Globe className="h-3 w-3" /> Thư viện Mẫu
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/60 border border-zinc-700/40 px-2.5 py-0.5 text-[10px] font-bold text-zinc-400 uppercase">
                <Lock className="h-3 w-3" /> Cá nhân
              </span>
            )}
          </div>
          <p className="mt-1.5 text-zinc-450 text-xs">
            Tác giả: <span className="text-zinc-300 font-semibold">{book.author || "Không rõ"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-extrabold uppercase ${getStatusColor(book.status)}`}>
            {book.status}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-bold text-zinc-400">
            <FileCode className="h-3.5 w-3.5 text-zinc-500" />
            {book.document_type?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* 4 Tabs Selector */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-px">
        {[
          { id: "overview", name: "Tổng quan & Sở hữu", icon: LayoutGrid },
          { id: "sections", name: "Cấu trúc mục lục & Vector", icon: Database },
          { id: "audio", name: "Âm thanh & Bài học", icon: Headphones },
          { id: "jobs", name: "Lịch sử xử lý sách", icon: History },
          { id: "preview", name: "Đọc & Preview sách", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all relative border-b-2 ${
                isActive
                  ? "border-violet-500 text-violet-400 bg-violet-500/5 rounded-t-lg"
                  : "border-transparent text-zinc-450 hover:text-zinc-250 hover:bg-zinc-900/20"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & AI SUMMARY */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Metadata & AI Summary */}
          <div className="md:col-span-2 space-y-6">
            {/* Metadata Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4.5 w-4.5 text-violet-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Thông tin tài liệu</h2>
                </div>
                <button
                  onClick={openEditMetadataModal}
                  className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Chỉnh sửa
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block">ID Cuốn sách</span>
                  <div className="flex items-center gap-1.5 font-mono text-zinc-300">
                    <span className="truncate">{book.id}</span>
                    <button
                      onClick={() => handleCopy(book.id, "Book ID")}
                      className="p-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block">Loại file</span>
                  <p className="text-zinc-300 uppercase font-bold py-1">{book.document_type || "Không xác định"}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block">Ngày khởi tạo</span>
                  <div className="flex items-center gap-1.5 text-zinc-300 py-1">
                    <Calendar className="h-4 w-4 text-zinc-550" />
                    <span className="font-semibold">{formatDate(book.created_at)}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider block">Cập nhật lần cuối</span>
                  <div className="flex items-center gap-1.5 text-zinc-300 py-1">
                    <Calendar className="h-4 w-4 text-zinc-550" />
                    <span className="font-semibold">{formatDate(book.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Card (NEW FEATURE) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-amber-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tóm tắt AI (Executive Summary)</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-extrabold uppercase ${getStatusColor(book.ai_summary_status || "pending")}`}>
                    {book.ai_summary_status || "pending"}
                  </span>
                  <button
                    onClick={() => regenerateSummaryMutation.mutate()}
                    disabled={regenerateSummaryMutation.isPending || book.ai_summary_status === "processing"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-40"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${regenerateSummaryMutation.isPending || book.ai_summary_status === "processing" ? "animate-spin" : ""}`} />
                    Tạo lại tóm tắt AI
                  </button>
                </div>
              </div>

              {book.ai_summary_status === "processing" || book.ai_summary_status === "pending" ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-950/40 rounded-xl border border-zinc-850">
                  <RotateCw className="h-7 w-7 text-amber-400 animate-spin" />
                  <p className="text-xs font-semibold text-zinc-300">
                    Hệ thống AI Gemini đang tổng hợp tóm tắt nội dung cuốn sách...
                  </p>
                  <p className="text-[10px] text-zinc-500">Tiến trình chạy ngầm qua Celery task.</p>
                </div>
              ) : book.ai_summary_status === "failed" ? (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    Không thể tạo tóm tắt AI
                  </div>
                  <p className="text-[11px] leading-relaxed">{book.ai_summary_error || "Đã xảy ra lỗi trong quá trình xử lý LLM."}</p>
                </div>
              ) : book.ai_summary ? (
                <div className="space-y-4">
                  {book.ai_summary.summary && (
                    <div className="bg-zinc-950/60 border border-zinc-850 p-4 rounded-xl">
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Tóm tắt tổng quan</h4>
                      <p className="text-xs text-zinc-200 leading-relaxed font-sans">{book.ai_summary.summary}</p>
                    </div>
                  )}

                  {book.ai_summary.key_takeaways && Array.isArray(book.ai_summary.key_takeaways) && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Thông điệp & Bài học trọng tâm</h4>
                      <ul className="space-y-1.5 pl-4 list-disc text-xs text-zinc-300">
                        {book.ai_summary.key_takeaways.map((item: string, idx: number) => (
                          <li key={idx} className="leading-relaxed">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-zinc-500 italic bg-zinc-950/20 border border-zinc-850 rounded-xl">
                  Sách chưa có dữ liệu tóm tắt AI. Bấm "Tạo lại tóm tắt AI" để tiến hành tổng hợp.
                </div>
              )}
            </div>

            {/* Structure Summary Card */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                <BookOpen className="h-4.5 w-4.5 text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Cấu trúc và Học liệu</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-center">
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Tổng số Chương</span>
                  <span className="text-2xl font-bold text-white mt-1 block font-mono">
                    {book.total_sections !== null ? book.total_sections : "—"}
                  </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Tổng số Units</span>
                  <span className="text-2xl font-bold text-white mt-1 block font-mono">
                    {book.total_units !== null ? book.total_units : "—"}
                  </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Tổng Phân đoạn</span>
                  <span className="text-2xl font-bold text-white mt-1 block font-mono">
                    {book.segment_count || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Info Card */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
                <User className="h-4.5 w-4.5 text-violet-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Người dùng sở hữu</h2>
              </div>

              {!book.owner_info ? (
                <div className="py-6 text-center text-xs text-zinc-500 italic">
                  Không tìm thấy thông tin tài khoản chủ sở hữu.
                </div>
              ) : (
                <div className="space-y-5 text-xs">
                  <div className="flex items-center gap-3">
                    {book.owner_info.avatar_url ? (
                      <img
                        src={book.owner_info.avatar_url}
                        alt="Avatar"
                        className="h-11 w-11 rounded-full border border-zinc-800 object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 font-extrabold text-sm">
                        {getInitials(book.owner_info.display_name || book.owner_info.email || book.user_id)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate text-sm">
                        {book.owner_info.display_name || "Chưa cập nhật tên"}
                      </p>
                      <p className="text-zinc-450 truncate">{book.owner_info.email || "Không có email"}</p>
                    </div>
                  </div>

                  <div className="border-t border-zinc-850 pt-3.5 space-y-3 font-semibold">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">User UUID</span>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-300">
                        <span className="truncate">{book.owner_info.user_id}</span>
                        <button
                          onClick={() => handleCopy(book.owner_info!.user_id, "User UUID")}
                          className="p-1 rounded bg-zinc-950 hover:bg-zinc-800 text-zinc-450 hover:text-white"
                        >
                          <Copy className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Ngày tham gia</span>
                      <span className="text-zinc-300">{formatDateShort(book.owner_info.account_created_at)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Đăng nhập cuối</span>
                      <span className="text-zinc-300">{formatDateShort(book.owner_info.last_sign_in_at)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OUTLINE & VECTOR CHUNKS */}
      {activeTab === "sections" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left: Outline tree */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 shadow-md backdrop-blur-xl h-[560px] flex flex-col">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-850 pb-3 mb-3 shrink-0 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-violet-400" />
              Mục lục cuốn sách ({filteredSections.length})
            </h3>

            {/* Display Mode Segment buttons */}
            <div className="mb-3 shrink-0">
              <label className="text-[9px] text-zinc-550 font-bold uppercase tracking-wide block mb-1">
                Chế độ hiển thị mục lục
              </label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                {[
                  { value: "full", label: "Đầy đủ" },
                  { value: "pareto", label: "Tinh gọn" }
                ].map((modeOpt) => (
                  <button
                    key={modeOpt.value}
                    onClick={() => {
                      setOutlineModeFilter(modeOpt.value as any);
                      setSelectedSectionId(null);
                    }}
                    className={`py-1.5 text-[9px] font-bold rounded-md transition-all ${
                      outlineModeFilter === modeOpt.value
                        ? "bg-violet-600 text-white"
                        : "text-zinc-500 hover:text-zinc-200"
                    }`}
                  >
                    {modeOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {isSectionsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-550 border-t-transparent"></div>
              </div>
            ) : filteredSections.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic text-center px-4">
                Không tìm thấy mục lục nào trong cuốn sách này.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
                {filteredSections.map((sec) => {
                  const isSelected = selectedSectionId === sec.id;
                  const isIncluded =
                    outlineModeFilter === "pareto"
                      ? sec.modes.includes("pareto")
                      : hasFullMode
                      ? sec.modes.includes("full")
                      : true;

                  return (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSectionId(sec.id)}
                      style={{ paddingLeft: `${Math.max(12, sec.level * 12)}px` }}
                      className={`w-full text-left rounded-lg py-2 px-3 text-xs transition-all flex items-start gap-2 group ${
                        isSelected
                          ? "bg-violet-600/20 text-violet-300 font-bold border border-violet-500/20"
                          : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200 border border-transparent"
                      }`}
                    >
                      <ChevronRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 transition-transform ${isSelected ? "rotate-90 text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate leading-tight font-medium">{sec.title}</p>
                          {isIncluded ? (
                            <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Đã có
                            </span>
                          ) : (
                            <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-bold rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              Chưa có
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-zinc-550 mt-1 font-mono font-semibold">
                          Idx: {sec.section_index} · {sec.text_char_count.toLocaleString()} ký tự · {sec.chunk_count} chunks
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Section Text & Vector details */}
          <div className="md:col-span-2 space-y-6">
            {!selectedSectionId ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 shadow-md backdrop-blur-xl text-center text-zinc-500 italic h-full flex flex-col justify-center items-center">
                <BookOpen className="h-10 w-10 text-zinc-700 mb-4 animate-bounce" />
                Vui lòng chọn một mục lục ở cột bên trái để xem nội dung văn bản và cấu trúc Vector Embeddings.
              </div>
            ) : isSectionDetailLoading || !sectionDetail ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-6 h-[560px] animate-pulse">
                <div className="h-6 w-1/3 bg-zinc-800 rounded"></div>
                <div className="h-40 w-full bg-zinc-850 rounded"></div>
                <div className="h-56 w-full bg-zinc-850 rounded"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Text Content Window */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="h-4 w-4 text-violet-400" />
                      Văn bản trích xuất (Text Content)
                    </h3>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold">
                      Index: {sectionDetail.section_index} · Trang: {sectionDetail.page_start ?? "N/A"}-{sectionDetail.page_end ?? "N/A"}
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      readOnly
                      value={sectionDetail.text_content || "Không có nội dung văn bản."}
                      className="w-full h-44 rounded-xl bg-zinc-950/60 border border-zinc-850 p-4 font-sans text-xs text-zinc-300 leading-relaxed outline-none resize-none focus:border-zinc-800 scrollbar-thin"
                    />
                  </div>
                </div>

                {/* Chunks Embedding Metadata list */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Database className="h-4 w-4 text-violet-400" />
                      Các khối Vector nhúng (Knowledge Chunks - {sectionDetail.chunks.length})
                    </h3>
                  </div>

                  {sectionDetail.chunks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 italic bg-zinc-950/20 border border-zinc-850 rounded-xl">
                      Mục này chưa được sinh các chunk vector (chưa chạy RAG).
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {sectionDetail.chunks.map((chunk) => (
                        <div key={chunk.id} className="rounded-xl border border-zinc-850 bg-zinc-950/50 p-4 space-y-3">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold border-b border-zinc-900 pb-2">
                            <span className="text-violet-400">CHUNK INDEX: {chunk.chunk_index}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-550">Tokens: {chunk.token_count ?? "N/A"}</span>
                              <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${chunk.has_embedding ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                {chunk.has_embedding ? "VECTOR READY" : "NO VECTOR"}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-350 leading-relaxed italic bg-zinc-950/80 p-3 rounded-lg border border-zinc-900 select-all max-h-24 overflow-y-auto scrollbar-thin">
                            "{chunk.content}"
                          </p>

                          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[9px] text-zinc-500 font-semibold font-mono uppercase">
                            <div>Model: <span className="text-zinc-400 lowercase">{chunk.embedding_model}</span></div>
                            <div>Version: <span className="text-zinc-400">{chunk.embedding_version}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIO & LEARNING UNITS (NEW FEATURE) */}
      {activeTab === "audio" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Hidden HTML5 Audio Element */}
          <audio ref={audioRef} className="hidden" />

          {/* Left Column: Learning Units Accordion Tree */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4 shadow-md backdrop-blur-xl h-[620px] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-3 shrink-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Headphones className="h-4 w-4 text-violet-400" />
                Bài học & Audio ({audioUnitsData?.total_units || 0})
              </h3>
              {/* Mode Switcher: Pareto vs Full */}
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                <button
                  onClick={() => setAudioMode("pareto")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    audioMode === "pareto" ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  PARETO
                </button>
                <button
                  onClick={() => setAudioMode("full")}
                  className={`px-2.5 py-1 text-[9px] font-bold rounded-md transition-all ${
                    audioMode === "full" ? "bg-violet-600 text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  FULL
                </button>
              </div>
            </div>

            {isAudioUnitsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"></div>
              </div>
            ) : !audioUnitsData || audioUnitsData.units.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic text-center px-4">
                Chưa có dữ liệu bài học âm thanh nào được sinh cho chế độ {audioMode.toUpperCase()}.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                {audioUnitsData.units.map((unit) => {
                  const isExpanded = expandedUnitId === unit.id;
                  return (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-zinc-850 bg-zinc-950/60 overflow-hidden transition-all"
                    >
                      {/* Unit Header */}
                      <button
                        onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                        className="w-full text-left p-3 flex items-center justify-between hover:bg-zinc-900/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-violet-400">
                              BÀI {unit.unit_index + 1}
                            </span>
                            <span className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${getStatusColor(unit.status)}`}>
                              {unit.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-zinc-200 truncate mt-1">{unit.title}</p>
                          <div className="flex items-center gap-3 text-[9px] text-zinc-500 mt-1 font-mono">
                            <span>{Math.round(unit.estimated_audio_seconds / 60)} phút</span>
                            <span>·</span>
                            <span>{unit.segments.length} segments</span>
                          </div>
                        </div>

                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-zinc-500 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                        )}
                      </button>

                      {/* Unit Segments List */}
                      {isExpanded && (
                        <div className="border-t border-zinc-900 bg-zinc-950 p-2 space-y-1.5">
                          {/* Unit Review Audio if available */}
                          {unit.review_audio_url && (
                            <button
                              onClick={() => handlePlayAudio(unit.review_audio_url!, `Bài ${unit.unit_index + 1}: Tóm tắt ôn tập`, unit.review_text || "")}
                              className="w-full text-left p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                                <Play className="h-3.5 w-3.5 fill-amber-400" />
                                Ôn tập tổng kết
                              </div>
                              <span className="text-[9px] font-mono text-amber-400">REVIEW AUDIO</span>
                            </button>
                          )}

                          {unit.segments.length === 0 ? (
                            <p className="text-[10px] text-zinc-600 italic p-2 text-center">Chưa có đoạn audio segment.</p>
                          ) : (
                            unit.segments.map((seg) => {
                              const isCurrentPlaying = activeAudioUrl === seg.audio_url && isPlaying;
                              return (
                                <button
                                  key={seg.id}
                                  onClick={() => handlePlayAudio(seg.audio_url!, `Bài ${unit.unit_index + 1} - Phân đoạn ${seg.segment_index + 1}`, seg.text_content || "")}
                                  disabled={!seg.audio_url}
                                  className={`w-full text-left p-2 rounded-lg text-xs transition-all flex items-center justify-between group ${
                                    isCurrentPlaying
                                      ? "bg-violet-600/20 text-violet-300 font-bold border border-violet-500/30"
                                      : seg.audio_url
                                      ? "bg-zinc-900/30 hover:bg-zinc-800/40 text-zinc-300 border border-transparent"
                                      : "bg-zinc-950 text-zinc-600 opacity-50 cursor-not-allowed border border-transparent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {isCurrentPlaying ? (
                                      <Pause className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                    ) : (
                                      <Play className="h-3.5 w-3.5 text-zinc-500 group-hover:text-violet-400 shrink-0" />
                                    )}
                                    <span className="truncate">Đoạn {seg.segment_index + 1}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-[9px] font-mono shrink-0">
                                    {seg.duration_ms && (
                                      <span className="text-zinc-500">{formatSecondsToTime(seg.duration_ms / 1000)}</span>
                                    )}
                                    <span className={`px-1 rounded ${seg.audio_url ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                                      {seg.audio_url ? "AUDIO" : "NO AUDIO"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Built-in Custom Audio Player & Interactive Transcript */}
          <div className="md:col-span-2 space-y-6">
            {/* Audio Player Box */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-5">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4.5 w-4.5 text-violet-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Trình phát thanh Admin (Audio Player)</h3>
                </div>
                {activeAudioUrl && (
                  <a
                    href={activeAudioUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono font-bold text-violet-400 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> Tải file .mp3
                  </a>
                )}
              </div>

              {!activeAudioUrl ? (
                <div className="py-10 text-center text-xs text-zinc-500 italic bg-zinc-950/40 rounded-xl border border-zinc-850 flex flex-col items-center justify-center space-y-2">
                  <Headphones className="h-8 w-8 text-zinc-700 animate-pulse" />
                  <span>Vui lòng chọn một phân đoạn bài học ở cột bên trái để nghe thử audio.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Track Title */}
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white truncate">{activeAudioTitle}</p>
                    <span className="text-xs font-mono font-bold text-violet-400">
                      {formatSecondsToTime(currentTime)} / {formatSecondsToTime(duration)}
                    </span>
                  </div>

                  {/* Seek Bar */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />

                  {/* Player Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-850">
                    {/* Play/Pause Button */}
                    <button
                      onClick={togglePlayPause}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-500 text-white shadow-lg transition-all active:scale-95"
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white ml-0.5" />}
                    </button>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                      {[0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => handleSpeedChange(spd)}
                          className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${
                            playbackRate === spd ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>

                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                      <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
                        {isMuted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Transcript Panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-violet-400" />
                  Kịch bản đọc / Lời nói (Transcript Script)
                </h3>
                {activeAudioScript && (
                  <button
                    onClick={() => handleCopy(activeAudioScript, "Kịch bản đọc")}
                    className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition flex items-center gap-1 text-[10px]"
                  >
                    <Copy className="h-3 w-3" /> Sao chép lời đọc
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={activeAudioScript || "Vui lòng chọn một phân đoạn audio để xem kịch bản đọc tương ứng."}
                  className="w-full h-44 rounded-xl bg-zinc-950/60 border border-zinc-850 p-4 font-sans text-xs text-zinc-300 leading-relaxed outline-none resize-none scrollbar-thin"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HISTORICAL JOBS */}
      {activeTab === "jobs" && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 shadow-md backdrop-blur-xl space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
            <Cpu className="h-4.5 w-4.5 text-violet-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Lịch sử tiến trình xử lý ({jobHistory.length})</h2>
          </div>

          {isJobsLoading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-550 border-t-transparent"></div>
            </div>
          ) : jobHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 italic">
              Chưa có ghi nhận tiến trình lịch sử nào cho sách này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="responsive-data-table text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="px-6 py-3.5">ID / Thời gian</th>
                    <th className="px-6 py-3.5">Loại tiến trình</th>
                    <th className="px-6 py-3.5">Trạng thái</th>
                    <th className="px-6 py-3.5">Thông số sinh</th>
                    <th className="px-6 py-3.5">Lỗi / Bước chạy</th>
                    <th className="px-6 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {jobHistory.map((job) => {
                    const isJobRetryable = ["error", "cancelled"].includes(job.status) && ["generate_plan", "switch_mode"].includes(job.job_type);
                    return (
                      <tr key={job.id} className="hover:bg-zinc-800/15 transition-colors group">
                        <td className="px-6 py-4 font-mono text-zinc-400">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold">{truncateId(job.id, 10, 6, 4)}</span>
                            <button
                              onClick={() => handleCopy(job.id, "Job ID")}
                              className="p-1 hover:bg-zinc-850 text-zinc-500 hover:text-white rounded transition"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-zinc-550 mt-1 font-semibold flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>{formatDateShort(job.created_at)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-zinc-200 uppercase">{job.job_type}</span>
                            <span className="text-[10px] text-zinc-550 font-semibold capitalize">Chế độ: {job.mode || "Mặc định"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[9px] font-extrabold uppercase ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                          <div className="text-[9px] text-zinc-500 font-bold font-mono mt-1">{job.progress_percent}% hoàn thành</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1 text-[10px] text-zinc-450 font-semibold font-mono">
                            <div>Units: <span className="text-zinc-300">{job.done_units}/{job.total_units}</span></div>
                            {job.estimated_input_tokens && (
                              <div className="flex items-center gap-1">
                                <Coins className="h-3 w-3 text-zinc-550" />
                                <span>{new Intl.NumberFormat().format(job.estimated_input_tokens)}</span>
                              </div>
                            )}
                            {job.estimated_audio_seconds && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-zinc-550" />
                                <span>{(job.estimated_audio_seconds / 3600).toFixed(1)} giờ</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs font-mono text-[9px]">
                          {job.error_message ? (
                            <p className="text-rose-450 font-semibold leading-relaxed line-clamp-2" title={job.error_message}>
                              {job.error_message}
                            </p>
                          ) : job.current_step ? (
                            <p className="text-zinc-500 leading-relaxed line-clamp-2" title={job.current_step}>
                              {job.current_step}
                            </p>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => triggerRetry(job.id)}
                            disabled={!isJobRetryable || retryMutation.isPending}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-transparent hover:border-violet-500/10 text-violet-400 hover:bg-violet-500/10 disabled:opacity-30 disabled:pointer-events-none transition"
                            title={isJobRetryable ? "Chạy lại Job" : "Job không hỗ trợ chạy lại từ admin"}
                          >
                            <Play className="h-4 w-4 fill-violet-400/20" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FILE PREVIEW */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {book.file_url ? (
            <>
              {book.document_type === "pdf" && <PdfViewer fileUrl={book.file_url} title={book.title} />}
              {book.document_type === "epub" && <EpubViewer fileUrl={book.file_url} title={book.title} />}
              {book.document_type === "docx" && <DocxViewer fileUrl={book.file_url} title={book.title} />}
              {!["pdf", "epub", "docx"].includes(book.document_type?.toLowerCase() || "") && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-8 text-center space-y-4">
                  <FileCode className="h-10 w-10 text-amber-400 mx-auto" />
                  <div>
                    <p className="text-sm font-bold text-zinc-200">Định dạng file không hỗ trợ preview trực tiếp ({book.document_type})</p>
                    <p className="text-xs text-zinc-500 mt-1">Bạn có thể tải file gốc về máy hoặc mở trong tab mới.</p>
                  </div>
                  <a
                    href={book.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-md"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Mở file trong tab mới
                  </a>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-8 text-center space-y-3">
              <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-zinc-200">Không tìm thấy file gốc của cuốn sách này</p>
              <p className="text-xs text-zinc-500">Có thể file đã bị xóa khỏi kho lưu trữ hoặc sách khởi tạo không thành công.</p>
            </div>
          )}
        </div>
      )}

      {/* EDIT METADATA MODAL */}
      {showEditMetadataModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveMetadata}
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-violet-400" />
                Chỉnh sửa Thông tin Sách
              </h2>
              <button
                type="button"
                onClick={() => setShowEditMetadataModal(false)}
                className="text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Tên cuốn sách *</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-zinc-200 font-semibold outline-none focus:border-violet-500"
                  placeholder="Nhập tên sách..."
                  required
                />
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Tác giả</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-zinc-200 font-semibold outline-none focus:border-violet-500"
                  placeholder="Nhập tên tác giả..."
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-zinc-200">Thư viện Mẫu (Shared)</p>
                  <p className="text-[10px] text-zinc-500">Công khai cuốn sách này cho tất cả người dùng chọn dùng mẫu.</p>
                </div>
                <input
                  type="checkbox"
                  checked={editIsShared}
                  onChange={(e) => setEditIsShared(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 accent-violet-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
              <button
                type="button"
                onClick={() => setShowEditMetadataModal(false)}
                className="rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-300 font-semibold py-2 px-4 text-xs hover:bg-zinc-850 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={updateMetadataMutation.isPending}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 text-xs transition-all flex items-center gap-1"
              >
                {updateMetadataMutation.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* JOB RETRY CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white">Yêu cầu xác nhận</h2>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              Bạn có chắc chắn muốn chạy lại quy trình xử lý của Job này không? Thao tác này sẽ đưa trạng thái Job về hàng chờ xử lý lại.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3.5">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-300 font-semibold py-2 px-4 text-xs hover:bg-zinc-850 hover:text-white"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmRetry}
                disabled={retryMutation.isPending}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold py-2 px-4 text-xs transition-all flex items-center gap-1"
              >
                {retryMutation.isPending && <RefreshCw className="h-3 w-3 animate-spin" />}
                Xác nhận chạy lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
