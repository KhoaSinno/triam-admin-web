"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { adminFetch, adminUploadBook, getErrorMessage, AdminBooksResponse, BookStatus, DocumentType } from "@/lib/api";
import { formatDateShort, truncateId, getPaginationRange, getInitials } from "@/lib/utils";
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
  Link2,
  Upload,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

function BooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial state from URL parameters (for deep linking)
  const initialStatus = searchParams.get("status") as BookStatus || "";
  const initialUser = searchParams.get("user_id") || "";
  const initialQuery = searchParams.get("q") || "";

  // State Management
  const [searchVal, setSearchVal] = useState(initialQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQuery);
  const [status, setStatus] = useState<BookStatus | "">(initialStatus);
  const [docType, setDocType] = useState<DocumentType | "">("");
  const [userId, setUserId] = useState(initialUser);
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);

  // Upload State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  // Formulate Query Path
  const buildQueryPath = () => {
    const params = new URLSearchParams();
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    if (status) params.set("status", status);
    if (docType) params.set("document_type", docType);
    if (userId.trim()) params.set("user_id", userId.trim());
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
    queryKey: ["adminBooks", limit, offset, debouncedSearch, status, docType, userId],
    queryFn: () => adminFetch<AdminBooksResponse>(buildQueryPath()),
    placeholderData: keepPreviousData,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminUploadBook(file),
    onSuccess: (data) => {
      toast.success("Tải sách thành công! Tiến trình bóc tách và sinh vector đang chạy ngầm ở góc màn hình.");
      localStorage.setItem("triam_admin_active_job_id", data.job_id);
      window.dispatchEvent(new Event("triam_admin_job_started"));
      setShowUploadModal(false);
      setSelectedFile(null);
      refetch();
    },
    onError: (err) => {
      toast.error("Không thể upload sách: " + getErrorMessage(err));
    },
  });

  const handleResetFilters = () => {
    setSearchVal("");
    setStatus("");
    setDocType("");
    setUserId("");
    setOffset(0);
    // Clear URL params
    router.replace("/books");
    toast.info("Đã cài đặt lại các bộ lọc");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã sao chép ID vào bộ nhớ tạm");
  };

  const handleUserFilter = (uid: string) => {
    setUserId(uid);
    setOffset(0);
    router.push(`/books?user_id=${uid}`);
  };

  const handlePageChange = (newOffset: number) => {
    if (newOffset >= 0) {
      setOffset(newOffset);
    }
  };

  const getStatusBadge = (statusVal: string | null) => {
    if (!statusVal) return null;
    
    const badges: Record<string, { label: string; style: string }> = {
      draft: { label: "Bản nháp", style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" },
      processing: { label: "Đang chạy", style: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
      partial_ready: { label: "Sẵn sàng một phần", style: "bg-cyan-500/10 text-cyan-400 border-cyan-550/20" },
      ready: { label: "Sẵn sàng", style: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      error: { label: "Lỗi", style: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
    };

    const badge = badges[statusVal] || { label: statusVal, style: "bg-zinc-500/10 text-zinc-400 border-zinc-800" };
    
    return (
      <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${badge.style}`}>
        {badge.label}
      </span>
    );
  };

  const items = booksData?.items || [];
  const total = booksData?.total || 0;

  const { hasNext, hasPrev, startNum, endNum } = getPaginationRange(
    offset,
    limit,
    total,
    items.length
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
            Quản lý Sách
          </h1>
          <p className="mt-1.5 text-sm text-zinc-450">
            Quản trị danh mục sách nói, cấu trúc tài liệu và trạng thái lập chỉ mục
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-violet-500 active:scale-95 shadow-lg shadow-violet-600/20"
          >
            <Upload className="h-4 w-4" />
            Upload book
          </button>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/10 p-5 shadow-lg backdrop-blur-xl md:grid-cols-2 lg:grid-cols-5 items-end">
        {/* Title Search */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Tìm kiếm sách
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-550" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Tên sách, tác giả…"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 py-2.5 pl-9 pr-4 text-xs text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20"
            />
          </div>
        </div>

        {/* Status Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Trạng thái
          </label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as BookStatus);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-300 outline-none transition-all focus:border-violet-500"
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
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Định dạng file
          </label>
          <select
            value={docType}
            onChange={(e) => {
              setDocType(e.target.value as DocumentType);
              setOffset(0);
            }}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-zinc-300 outline-none transition-all focus:border-violet-500"
          >
            <option value="">Tất cả định dạng</option>
            <option value="pdf">PDF</option>
            <option value="epub">EPUB</option>
            <option value="docx">DOCX</option>
          </select>
        </div>

        {/* User ID filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setOffset(0);
            }}
            placeholder="UUID người dùng…"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 p-2.5 text-xs text-white placeholder-zinc-650 outline-none transition-all focus:border-violet-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetFilters}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-white py-2.5 px-4 text-xs font-semibold transition-all active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            Làm lại
          </button>
        </div>
      </div>

      {/* Books Table Container */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 shadow-lg backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-8">
            <div className="h-8 w-full bg-zinc-850 rounded-lg animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 w-full bg-zinc-900/50 rounded-lg animate-pulse"></div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-white mb-2">Lỗi tải danh mục sách</h2>
            <p className="text-xs text-zinc-405 max-w-xs mb-6">
              {error instanceof Error ? error.message : "Hãy kiểm tra cấu hình kết nối mạng."}
            </p>
            <button
              onClick={() => refetch()}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-2 px-4 text-sm transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 mb-4">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-zinc-300">Không tìm thấy sách</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Không có cuốn sách nào khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefetching ? "opacity-50" : "opacity-100"}`}>
            <table className="responsive-data-table">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4">Sách</th>
                  <th className="px-6 py-4">Chủ sở hữu</th>
                  <th className="px-6 py-4">Xử lý nội dung</th>
                  <th className="px-6 py-4">Cập nhật</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {items.map((book) => (
                  <tr
                    key={book.id}
                    className="hover:bg-zinc-800/20 transition-colors group"
                  >
                    {/* Title and Author */}
                    <td data-label="Sách" data-primary className="px-6 py-4">
                      <div className="flex flex-col max-w-xs md:max-w-sm">
                        <span
                          onClick={() => router.push(`/books/${book.id}`)}
                          className="font-bold text-zinc-200 hover:text-violet-400 transition-colors cursor-pointer truncate"
                          title={book.title}
                        >
                          {book.title}
                        </span>
                        <span className="text-xs text-zinc-450 truncate">
                          {book.author || "Không rõ tác giả"}
                        </span>
                        <span className="mt-1 inline-flex w-max items-center gap-1 rounded-full bg-zinc-800/45 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                          <FileCode className="h-3 w-3" />
                          {book.document_type?.toUpperCase() || "Không rõ định dạng"}
                        </span>
                      </div>
                    </td>

                     {/* User ID with Copy and Filter */}
                    <td data-label="Người dùng" className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Avatar / Initials */}
                        {book.user_avatar_url ? (
                          <img
                            src={book.user_avatar_url}
                            alt="Avatar"
                            className="h-8 w-8 rounded-full border border-zinc-800 object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold text-[10px]">
                            {getInitials(book.user_display_name || book.user_email || book.user_id)}
                          </div>
                        )}
                        {/* 2 lines of details */}
                        <div className="flex flex-col min-w-0">
                          <span
                            onClick={() => handleUserFilter(book.user_id)}
                            className="truncate text-xs font-bold text-zinc-200 hover:text-violet-400 transition-colors cursor-pointer"
                            title={book.user_display_name || book.user_email || "Lọc theo người dùng này"}
                          >
                            {book.user_display_name || book.user_email || "Chưa thiết lập"}
                          </span>
                          <div className="flex items-center gap-1 font-mono text-[9px] text-zinc-550">
                            <span title={book.user_id}>{truncateId(book.user_id, 10, 6, 4)}</span>
                            <button
                              onClick={() => handleCopy(book.user_id)}
                              className="rounded p-0.5 text-zinc-650 hover:bg-zinc-850 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Copy className="h-2 w-2" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td data-label="Xử lý nội dung" className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(book.status)}
                        <span className="text-[10px] font-semibold text-zinc-500">
                          {book.total_sections ?? "—"} đề mục · {book.total_units ?? "—"} bài học
                        </span>
                        {book.status === "error" && book.error_message && (
                          <span
                            className="text-[10px] text-red-400 max-w-xs truncate"
                            title={book.error_message}
                          >
                            {book.error_message}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Updated At */}
                    <td data-label="Cập nhật" className="px-6 py-4 text-xs text-zinc-400 font-semibold font-variant-numeric: tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-650 shrink-0" />
                        <span>{formatDateShort(book.updated_at)}</span>
                      </div>
                    </td>

                    {/* Row Actions */}
                    <td data-label="Thao tác" data-actions className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {book.status === "error" && (
                          <button
                            onClick={() => router.push(`/jobs?book_id=${book.id}&status=error`)}
                            className="rounded-lg p-1.5 text-rose-450 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/10 transition-all"
                            title="Xem job lỗi liên quan"
                          >
                            <Link2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/books/${book.id}`)}
                          className="rounded-lg p-1.5 text-zinc-450 hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-700 transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination */}
        {!isLoading && !isError && total > 0 && (
          <div className="responsive-pagination border-t border-zinc-800 bg-zinc-950/40 px-6 py-4 text-xs font-semibold text-zinc-400 select-none">
            <div>
              Hiển thị <span className="text-zinc-200 font-bold">{startNum}</span> đến{" "}
              <span className="text-zinc-200 font-bold">{endNum}</span> trên tổng số{" "}
              <span className="text-zinc-200 font-bold">{total}</span> cuốn sách
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Upload className="h-5 w-5 text-violet-400" />
                Upload Sách Mới (Hệ thống)
              </h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Chọn file tài liệu sách mẫu dạng <span className="text-violet-400 font-bold">PDF, EPUB</span> hoặc <span className="text-violet-400 font-bold">DOCX</span>. Tiến trình bóc tách cấu trúc và tạo vector sẽ chạy ngầm không gây treo màn hình.
            </p>

            <div className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-xl p-6 text-center transition-all bg-zinc-950/50">
              <input
                type="file"
                accept=".pdf,.epub,.docx"
                id="admin-book-file-input"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="admin-book-file-input" className="cursor-pointer space-y-2 block">
                <BookOpen className="h-8 w-8 text-zinc-600 mx-auto" />
                <span className="text-xs text-zinc-300 font-semibold block truncate">
                  {selectedFile ? selectedFile.name : "Nhấp để chọn file từ máy tính"}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : "Tối đa 100MB per file"}
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="rounded-xl border border-zinc-850 bg-zinc-950 text-zinc-300 font-semibold py-2 px-4 text-xs hover:bg-zinc-850 hover:text-white"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (selectedFile) uploadMutation.mutate(selectedFile);
                }}
                disabled={!selectedFile || uploadMutation.isPending}
                className="rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-2 px-4 text-xs transition-all flex items-center gap-1.5 active:scale-95"
              >
                {uploadMutation.isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                {uploadMutation.isPending ? "Đang gửi..." : "Tải lên & Chạy ngầm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
        </div>
      }
    >
      <BooksContent />
    </Suspense>
  );
}
