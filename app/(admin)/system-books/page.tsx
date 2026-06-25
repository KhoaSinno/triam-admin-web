"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { getClientToken } from "@/lib/supabase";
import {
  adminFetch,
  AdminBooksResponse,
  BookStatus,
  DocumentType,
  getErrorMessage,
  AdminBookListItem,
} from "@/lib/api";
import {
  BookOpen,
  Copy,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X,
  Calendar,
  AlertTriangle,
  Eye,
  FileCode,
  FileUp,
  Settings2,
  Rocket,
  CheckCircle2,
  Share2,
  Trash2,
  Sparkles,
  HelpCircle,
  FolderLock,
  Play,
} from "lucide-react";
import { toast } from "sonner";

function SystemBooksContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const adminUserId = profile?.user_id;

  // Tabs: 'admin' (Sách Admin upload - Mặc định), 'shared' (Thư viện chung đã chia sẻ), 'all' (Tất cả sách)
  const [activeTab, setActiveTab] = useState<"admin" | "shared" | "all">("admin");

  // State Management
  const [searchVal, setSearchVal] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<BookStatus | "">("");
  const [docType, setDocType] = useState<DocumentType | "">("");
  const [limit] = useState(15);
  const [offset, setOffset] = useState(0);

  // Modal States
  const [uploadOpen, setUploadOpen] = useState(false);
  const [processBook, setProcessBook] = useState<
    AdminBookListItem | { id: string; title: string; has_full_mode?: boolean; has_pareto_mode?: boolean } | null
  >(null);
  const [confirmDeleteBook, setConfirmDeleteBook] = useState<{ id: string; title: string } | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger processing state
  const [processMode, setProcessMode] = useState<"full" | "pareto" | "both">("both");
  const [autoShare, setAutoShare] = useState(true);
  const [isProcessingSubmit, setIsProcessingSubmit] = useState(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchVal);
      setOffset(0); // Reset page on search change
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchVal]);

  // Auto-select mode when modal opens based on already ready/processing modes
  useEffect(() => {
    if (processBook) {
      if (processBook.has_full_mode && !processBook.has_pareto_mode) {
        setProcessMode("pareto");
      } else if (processBook.has_pareto_mode && !processBook.has_full_mode) {
        setProcessMode("full");
      } else {
        setProcessMode("both");
      }
    }
  }, [processBook]);

  // Formulate Query Path
  const buildQueryPath = () => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (status) params.set("status", status);
    if (docType) params.set("document_type", docType);

    // Filter logic based on selected tab
    if (activeTab === "admin" && adminUserId) {
      params.set("user_id", adminUserId);
    } else if (activeTab === "shared") {
      // NOTE: Our backend doesn't support direct filtering of is_shared in the URL,
      // but we will do client-side filtering or fetch all. To get the best data,
      // we fetch all books.
    }
    
    return `/books?${params.toString()}`;
  };

  const {
    data: booksData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdminBooksResponse>({
    queryKey: ["systemBooks", limit, offset, debouncedSearch, status, docType, activeTab, adminUserId],
    queryFn: () => adminFetch<AdminBooksResponse>(buildQueryPath()),
    placeholderData: keepPreviousData,
  });

  // Client-side filtering when "shared" tab is selected (since backend has no is_shared query param)
  const allItems = booksData?.items || [];
  const items = activeTab === "shared" 
    ? allItems.filter(book => book.is_shared === true) 
    : allItems;

  const rawTotal = booksData?.total || 0;
  const total = activeTab === "shared" ? items.length : rawTotal;

  const hasNext = activeTab !== "shared" && (offset + allItems.length < rawTotal);
  const hasPrev = offset > 0;
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = offset + items.length;

  const handleResetFilters = () => {
    setSearchVal("");
    setStatus("");
    setDocType("");
    setOffset(0);
    toast.info("Đã cài đặt lại các bộ lọc");
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  };

  const handlePageChange = (newOffset: number) => {
    if (newOffset >= 0) {
      setOffset(newOffset);
    }
  };

  const truncateId = (id: string) => {
    if (id.length <= 10) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Upload Logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndUpload(e.target.files[0]);
    }
  };

  const validateAndUpload = (file: File) => {
    const allowedExtensions = [".pdf", ".epub", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    
    if (!allowedExtensions.includes(ext)) {
      toast.error("Định dạng file không hỗ trợ. Chỉ chấp nhận PDF, EPUB, DOCX.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      toast.error("Kích thước file quá lớn. Tối đa 50MB.");
      return;
    }

    performUpload(file);
  };

  const performUpload = (file: File) => {
    const token = getClientToken();
    if (!token) {
      toast.error("Hết phiên làm việc. Vui lòng đăng nhập lại.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    xhr.open("POST", `${apiBase}/api/v1/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          toast.success("Tải sách lên thành công!");
          queryClient.invalidateQueries({ queryKey: ["systemBooks"] });
          setUploadOpen(false);
          
          // Open process trigger modal for the newly created book
          const cleanTitle = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          setProcessBook({
            id: res.book_id,
            title: cleanTitle,
          });
        } catch {
          toast.error("Không thể phân tích phản hồi upload.");
        }
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          toast.error(res.detail || "Lỗi tải sách lên.");
        } catch {
          toast.error(`Tải lên thất bại với mã lỗi: ${xhr.status}`);
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast.error("Lỗi kết nối mạng khi upload.");
    };

    xhr.send(formData);
  };

  // Trigger processing mutation
  const handleTriggerProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processBook) return;

    setIsProcessingSubmit(true);
    try {
      if (processMode === "both") {
        // Send both calls in parallel asynchronously without UI freezing
        await Promise.all([
          adminFetch(`/books/${processBook.id}/process?mode=full&is_shared=${autoShare}`, {
            method: "POST",
          }),
          adminFetch(`/books/${processBook.id}/process?mode=pareto&is_shared=${autoShare}`, {
            method: "POST",
          }),
        ]);
        toast.success(`Đã khởi chạy song song 2 chế độ FULL & PARETO cho sách: "${processBook.title}"`);
      } else {
        await adminFetch(`/books/${processBook.id}/process?mode=${processMode}&is_shared=${autoShare}`, {
          method: "POST",
        });
        toast.success(`Đã khởi chạy chế độ ${processMode.toUpperCase()} cho sách: "${processBook.title}"`);
      }
      queryClient.invalidateQueries({ queryKey: ["systemBooks"] });
      setProcessBook(null);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Không thể kích hoạt tiến trình xử lý."));
    } finally {
      setIsProcessingSubmit(false);
    }
  };

  // Publish / Share toggle mutation
  const toggleShareMutation = useMutation({
    mutationFn: ({ bookId, share }: { bookId: string; share: boolean }) =>
      adminFetch<AdminBookListItem>(`/books/${bookId}/share?share=${share}`, {
        method: "PATCH",
      }),
    onSuccess: (data, variables) => {
      if (variables.share) {
        toast.success(`Đã xuất bản sách "${data.title}" ra thư viện hệ thống.`);
      } else {
        toast.success(`Đã thu hồi sách "${data.title}" khỏi thư viện hệ thống.`);
      }
      queryClient.invalidateQueries({ queryKey: ["systemBooks"] });
    },
    onError: (err: unknown, variables) => {
      const actionText = variables.share ? "chia sẻ" : "hủy chia sẻ";
      toast.error(getErrorMessage(err, `Không thể ${actionText} sách.`));
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (bookId: string) =>
      adminFetch<void>(`/api/v1/books/${bookId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Đã xóa sách mẫu thành công.");
      queryClient.invalidateQueries({ queryKey: ["systemBooks"] });
      setConfirmDeleteBook(null);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không thể xóa sách mẫu."));
      setConfirmDeleteBook(null);
    },
  });

  const getStatusBadge = (statusVal: string | null) => {
    if (!statusVal) return null;
    const badges: Record<string, { label: string; style: string }> = {
      draft: { label: "Bản nháp", style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" },
      processing: { label: "Đang chạy", style: "bg-blue-500/10 text-blue-400 border-blue-550/20" },
      partial_ready: { label: "Sẵn sàng 1 phần", style: "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" },
      ready: { label: "Sẵn sàng", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      error: { label: "Lỗi", style: "bg-rose-500/10 text-rose-450 border-rose-500/20" },
    };
    const badge = badges[statusVal] || { label: statusVal, style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" };
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${badge.style}`}>
        {badge.label}
      </span>
    );
  };

  const getSharedBadge = (isShared: boolean | undefined) => {
    if (isShared) {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          <Rocket className="h-3 w-3" />
          Đã xuất bản (Public)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-850 bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-zinc-500">
        <FolderLock className="h-3 w-3" />
        Nội bộ (Internal)
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("vi-VN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const isBothDisabled = !!(processBook?.has_full_mode || processBook?.has_pareto_mode);
  const isFullDisabled = !!processBook?.has_full_mode;
  const isParetoDisabled = !!processBook?.has_pareto_mode;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-850 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Sách Hệ Thống
          </h1>
          <p className="mt-1 text-sm text-zinc-450">
            Quản trị kho sách dùng chung, upload tài liệu mẫu, sinh audio/RAG và xuất bản lên thư viện
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Tải lại
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition-all active:scale-95 shadow-md shadow-violet-500/10"
          >
            <FileUp className="h-4 w-4" />
            Tải sách mới
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-zinc-850">
        <button
          onClick={() => { setActiveTab("admin"); setOffset(0); }}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === "admin"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-zinc-450 hover:text-zinc-200"
          }`}
        >
          Sách mẫu (Admin Upload)
        </button>
        <button
          onClick={() => { setActiveTab("shared"); setOffset(0); }}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === "shared"
              ? "border-violet-500 text-violet-400"
              : "border-transparent text-zinc-450 hover:text-zinc-200"
          }`}
        >
          Thư viện dùng chung (Shared Library)
        </button>
        <button
          onClick={() => { setActiveTab("all"); setOffset(0); }}
          className={`px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
            activeTab === "all"
              ? "border-transparent text-zinc-450 hover:text-zinc-200"
              : "border-transparent text-zinc-450 hover:text-zinc-200"
          }`}
          style={{ display: "none" }} // Hidden but kept for architectural sync
        >
          Tất cả sách
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-lg backdrop-blur-xl md:grid-cols-2 lg:grid-cols-4 items-end">
        {/* Title Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">
            Tìm kiếm tiêu đề
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Tên sách, tác giả…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">
            Trạng thái xử lý
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookStatus);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-350 outline-none transition-all focus:border-violet-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="draft">Bản nháp (Draft)</option>
            <option value="processing">Đang chạy (Processing)</option>
            <option value="partial_ready">Sẵn sàng một phần</option>
            <option value="ready">Sẵn sàng (Ready)</option>
            <option value="error">Lỗi (Error)</option>
          </select>
        </div>

        {/* Document Type Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-455 uppercase tracking-wider">
            Định dạng file
          </label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value as DocumentType);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-350 outline-none transition-all focus:border-violet-500"
          >
            <option value="">Tất cả định dạng</option>
            <option value="pdf">PDF</option>
            <option value="epub">EPUB</option>
            <option value="docx">DOCX</option>
          </select>
        </div>

        {/* Reset Filter Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetFilters}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white py-2.5 px-4 text-xs font-semibold transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
            Xóa bộ lọc
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 shadow-lg backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-8">
            <div className="h-8 w-full bg-zinc-850 rounded-lg animate-pulse"></div>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full bg-zinc-900/40 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
            <h2 className="text-base font-bold text-white mb-1">Lỗi tải danh sách sách hệ thống</h2>
            <p className="text-xs text-zinc-500 max-w-xs mb-4">
              {error instanceof Error ? error.message : "Vui lòng kiểm tra lại kết nối mạng."}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-4 text-xs transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-12 w-12 text-zinc-650 mb-3" />
            <h2 className="text-base font-bold text-zinc-400">Không tìm thấy sách mẫu nào</h2>
            <p className="text-xs text-zinc-600 mt-1 max-w-sm">
              {activeTab === "admin" 
                ? "Bạn chưa tải lên cuốn sách hệ thống nào hoặc sách không khớp bộ lọc." 
                : "Thư viện dùng chung chưa có cuốn sách nào ở trạng thái READY."}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-850 bg-zinc-950/40 text-[11px] font-bold uppercase tracking-wider text-zinc-450">
                  <th className="px-6 py-4">Tên Sách / Tác giả</th>
                  <th className="px-6 py-4 font-mono">Book ID</th>
                  <th className="px-6 py-4">Trạng thái xử lý</th>
                  <th className="px-6 py-4">Thư viện chung</th>
                  <th className="px-6 py-4 text-center">Định dạng</th>
                  <th className="px-6 py-4 text-center">Số chương</th>
                  <th className="px-6 py-4 text-center">Số Units</th>
                  <th className="px-6 py-4">Cập nhật lúc</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {items.map((book) => (
                  <tr key={book.id} className="hover:bg-zinc-850/10 transition-colors group">
                    {/* Title */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs md:max-w-sm">
                        <span
                          onClick={() => router.push(`/books/${book.id}`)}
                          className="font-bold text-zinc-200 hover:text-violet-400 transition-colors cursor-pointer truncate"
                          title={book.title}
                        >
                          {book.title}
                        </span>
                        <span className="text-xs text-zinc-500 truncate">
                          {book.author || "Không rõ tác giả"}
                        </span>
                      </div>
                    </td>

                    {/* Book ID */}
                    <td className="px-6 py-4 font-mono text-xs text-zinc-450">
                      <div className="flex items-center gap-1.5">
                        <span title={book.id}>{truncateId(book.id)}</span>
                        <button
                          onClick={() => handleCopy(book.id, "Book ID")}
                          className="rounded p-1 text-zinc-700 hover:bg-zinc-850 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </td>

                    {/* Processing status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(book.status)}
                        {book.status === "error" && book.error_message && (
                          <span className="text-[10px] text-red-400 max-w-xs truncate" title={book.error_message}>
                            {book.error_message}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Shared Status */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {getSharedBadge(book.is_shared)}
                        <div className="flex flex-wrap gap-1">
                          {book.has_full_mode && (
                            <span className="inline-flex items-center rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold">
                              FULL Mode
                            </span>
                          )}
                          {book.has_pareto_mode && (
                            <span className="inline-flex items-center rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold">
                              PARETO Mode
                            </span>
                          )}
                          {!book.has_full_mode && !book.has_pareto_mode && (
                            <span className="inline-flex items-center rounded bg-zinc-950 text-zinc-550 border border-zinc-850 px-1.5 py-0.5 text-[9px] font-bold">
                              Chưa xử lý
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Document Type */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 rounded bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-zinc-400 border border-zinc-850">
                        <FileCode className="h-3.5 w-3.5 text-zinc-655 shrink-0" />
                        {book.document_type?.toUpperCase()}
                      </span>
                    </td>

                    {/* Total Sections */}
                    <td className="px-6 py-4 text-center font-mono text-xs text-zinc-300 font-bold">
                      {book.total_sections !== null ? book.total_sections : "—"}
                    </td>

                    {/* Total Units */}
                    <td className="px-6 py-4 text-center font-mono text-xs text-zinc-300 font-bold">
                      {book.total_units !== null ? book.total_units : "—"}
                    </td>

                    {/* Updated At */}
                    <td className="px-6 py-4 text-xs text-zinc-400 font-semibold font-variant-numeric: tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                        <span>{formatDate(book.updated_at)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Trigger Processing Button */}
                        {book.status !== "processing" && (
                          <button
                            onClick={() => !(book.has_full_mode && book.has_pareto_mode) && setProcessBook(book)}
                            disabled={book.has_full_mode && book.has_pareto_mode}
                            className={`rounded-lg p-1.5 border border-transparent transition-all ${
                              book.has_full_mode && book.has_pareto_mode
                                ? "text-zinc-650 cursor-not-allowed"
                                : "text-zinc-450 hover:bg-zinc-800 hover:text-white hover:border-zinc-750"
                            }`}
                            title={
                              book.has_full_mode && book.has_pareto_mode
                                ? "Sách đã hoàn tất xử lý cả 2 chế độ học"
                                : "Chạy tiền xử lý (Audio/RAG)"
                            }
                          >
                            <Settings2 className={`h-4 w-4 ${book.has_full_mode && book.has_pareto_mode ? "text-zinc-650" : "text-violet-400"}`} />
                          </button>
                        )}
                        
                        {/* Publish manually button */}
                        {["ready", "partial_ready"].includes(book.status || "") && !book.is_shared && (
                          <button
                            onClick={() => toggleShareMutation.mutate({ bookId: book.id, share: true })}
                            className="rounded-lg p-1.5 text-zinc-450 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-750 transition-all"
                            title="Xuất bản ra Thư viện hệ thống"
                          >
                            <Share2 className="h-4 w-4 text-emerald-400" />
                          </button>
                        )}

                        {/* Unpublish manually button */}
                        {book.is_shared && (
                          <button
                            onClick={() => toggleShareMutation.mutate({ bookId: book.id, share: false })}
                            className="rounded-lg p-1.5 text-zinc-450 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-750 transition-all"
                            title="Hủy xuất bản khỏi Thư viện"
                          >
                            <FolderLock className="h-4 w-4 text-amber-500" />
                          </button>
                        )}

                        {/* Detail View */}
                        <button
                          onClick={() => router.push(`/books/${book.id}`)}
                          className="rounded-lg p-1.5 text-zinc-450 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-750 transition-all"
                          title="Xem chi tiết kỹ thuật"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Delete System Book */}
                        {activeTab === "admin" && (
                          <button
                            onClick={() => setConfirmDeleteBook({ id: book.id, title: book.title })}
                            className="rounded-lg p-1.5 text-zinc-450 hover:bg-rose-500/10 hover:text-rose-450 border border-transparent transition-all"
                            title="Xóa sách mẫu"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!isLoading && !isError && total > 0 && activeTab !== "shared" && (
          <div className="flex items-center justify-between border-t border-zinc-850 bg-zinc-950/40 px-6 py-4 text-xs font-semibold text-zinc-455 select-none">
            <div>
              Hiển thị <span className="text-zinc-200 font-bold">{startNum}</span> đến{" "}
              <span className="text-zinc-200 font-bold">{endNum}</span> trên tổng số{" "}
              <span className="text-zinc-200 font-bold">{total}</span> cuốn sách mẫu
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(offset - limit)}
                disabled={!hasPrev}
                className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white transition-all disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(offset + limit)}
                disabled={!hasNext}
                className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 p-2 hover:bg-zinc-800 hover:text-white transition-all disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Upload Sách Mẫu */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <FileUp className="h-5 w-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">Tải Lên Sách Mẫu Mới</h3>
              </div>
              <button
                onClick={() => !isUploading && setUploadOpen(false)}
                className="rounded-lg p-1 text-zinc-450 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isUploading ? (
              <div className="py-10 text-center space-y-4">
                <div className="relative inline-flex items-center justify-center h-16 w-16">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-500/10"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
                </div>
                <h4 className="font-bold text-zinc-200">Đang tải tài liệu lên Supabase...</h4>
                <div className="w-full bg-zinc-950 rounded-full h-2.5 max-w-xs mx-auto overflow-hidden border border-zinc-800">
                  <div 
                    className="bg-violet-500 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-zinc-500 font-mono font-bold block">{uploadProgress}%</span>
              </div>
            ) : (
              <div className="space-y-5">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
                    dragActive 
                      ? "border-violet-500 bg-violet-500/5" 
                      : "border-zinc-800 bg-zinc-950/30 hover:border-zinc-700 hover:bg-zinc-950/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".pdf,.epub,.docx"
                  />
                  <FileUp className="h-10 w-10 text-zinc-650 mx-auto mb-4 group-hover:scale-105 transition-transform" />
                  <p className="text-xs text-zinc-350 font-bold">Kéo thả tệp hoặc click để duyệt tìm</p>
                  <p className="text-[10px] text-zinc-650 mt-2">Hỗ trợ PDF, EPUB, DOCX (Tối đa 50MB)</p>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                  <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">Tự động hóa bóc tách mục lục & RAG</h5>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Ngay sau khi tải lên hoàn tất, hệ thống sẽ tự động bóc tách sơ đồ chương mục của sách gốc và kích hoạt task ngầm để sinh vector RAG (Embedding) sẵn trong DB.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Kích Hoạt Tiến Trình Xử Lý */}
      {processBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-violet-400" />
                <h3 className="text-base font-bold text-white">Khởi Chạy Tiền Xử Lý</h3>
              </div>
              <button
                onClick={() => !isProcessingSubmit && setProcessBook(null)}
                className="rounded-lg p-1 text-zinc-450 hover:bg-zinc-800 hover:text-white disabled:opacity-30"
                disabled={isProcessingSubmit}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTriggerProcessSubmit} className="space-y-5">
              <div>
                <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-wider block mb-1">
                  Cuốn sách đang cấu hình
                </span>
                <p className="text-sm font-bold text-zinc-200 truncate" title={processBook.title}>
                  {processBook.title}
                </p>
              </div>

              {/* Select Mode */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-405 uppercase tracking-wider block">
                  Chế độ xử lý bài học
                </label>
                <div className="grid gap-2">
                  <label className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 transition-all ${
                    isBothDisabled
                      ? "opacity-35 cursor-not-allowed pointer-events-none"
                      : "hover:bg-zinc-850/30 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="processMode"
                      value="both"
                      checked={processMode === "both"}
                      onChange={() => !isBothDisabled && setProcessMode("both")}
                      disabled={isBothDisabled}
                      className="mt-1 accent-violet-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">
                        Cả hai (FULL & PARETO) {isBothDisabled && <span className="text-[10px] text-zinc-500 font-normal ml-1.5">(Đã có một chế độ sẵn sàng)</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1 block leading-relaxed">
                        Chạy song song cả 2 chế độ. Tự động chuyển đổi mượt mà. Khuyên dùng cho Sách hệ thống.
                      </span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 transition-all ${
                    isFullDisabled
                      ? "opacity-35 cursor-not-allowed pointer-events-none"
                      : "hover:bg-zinc-850/30 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="processMode"
                      value="full"
                      checked={processMode === "full"}
                      onChange={() => !isFullDisabled && setProcessMode("full")}
                      disabled={isFullDisabled}
                      className="mt-1 accent-violet-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">
                        FULL Mode (Đầy đủ) {isFullDisabled && <span className="text-[10px] text-emerald-400 font-normal ml-1.5">(Đã hoàn tất xử lý)</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">Sinh toàn bộ các bài học trong sách (100% nội dung).</span>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 transition-all ${
                    isParetoDisabled
                      ? "opacity-35 cursor-not-allowed pointer-events-none"
                      : "hover:bg-zinc-850/30 cursor-pointer"
                  }`}>
                    <input
                      type="radio"
                      name="processMode"
                      value="pareto"
                      checked={processMode === "pareto"}
                      onChange={() => !isParetoDisabled && setProcessMode("pareto")}
                      disabled={isParetoDisabled}
                      className="mt-1 accent-violet-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">
                        PARETO Mode (Rút gọn) {isParetoDisabled && <span className="text-[10px] text-emerald-400 font-normal ml-1.5">(Đã hoàn tất xử lý)</span>}
                      </span>
                      <span className="text-[10px] text-zinc-500 mt-1 block">Chỉ sinh các bài học của 20% chương mục trọng tâm nhất.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Auto Share Toggle */}
              <label className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/20 p-3.5 hover:bg-zinc-850/20 cursor-pointer transition-all">
                <div className="flex items-start gap-2.5">
                  <Rocket className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Tự động xuất bản thư viện</span>
                    <span className="text-[10px] text-zinc-500 mt-0.5 block">Tự động chia sẻ công khai khi Celery hoàn tất xử lý.</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoShare}
                  onChange={(e) => setAutoShare(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500 accent-emerald-500 cursor-pointer"
                />
              </label>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setProcessBook(null)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800 py-2.5 text-xs font-semibold text-zinc-300 transition-all"
                  disabled={isProcessingSubmit}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 py-2.5 text-xs font-bold text-white transition-all disabled:opacity-50"
                  disabled={isProcessingSubmit}
                >
                  {isProcessingSubmit ? (
                    <>
                      <div className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      Kích hoạt
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Xác Nhận Xóa Sách Mẫu */}
      {confirmDeleteBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-450 border-b border-zinc-800 pb-3 mb-5">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Xác Nhận Xóa Sách Mẫu</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Bạn đang yêu cầu xóa cuốn sách mẫu hệ thống:
              </p>
              <p className="text-sm font-bold text-zinc-200 bg-zinc-950 p-3 rounded-xl border border-zinc-850 truncate" title={confirmDeleteBook.title}>
                {confirmDeleteBook.title}
              </p>
              <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-[10px] text-red-400 leading-relaxed">
                ⚠️ **Cảnh báo**: Hành động này sẽ xóa vĩnh viễn sách mẫu, toàn bộ cây mục lục và các vector nhúng (RAG). Mọi liên kết file âm thanh cũng sẽ bị dọn sạch.
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setConfirmDeleteBook(null)}
                  className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800 py-2 text-xs font-semibold text-zinc-300 transition-all"
                  disabled={deleteMutation.isPending}
                >
                  Hủy
                </button>
                <button
                  onClick={() => deleteMutation.mutate(confirmDeleteBook.id)}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-500 py-2 text-xs font-bold text-white transition-all disabled:opacity-50"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Đang xóa..." : "Đồng ý xóa"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SystemBooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center bg-zinc-950">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <SystemBooksContent />
    </Suspense>
  );
}
