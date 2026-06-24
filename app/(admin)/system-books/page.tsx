"use client";

import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Database,
  FileUp,
  LibraryBig,
  ListChecks,
  LockKeyhole,
  PauseCircle,
  Rocket,
  Settings2,
} from "lucide-react";

const plannedApis = [
  "GET /api/v1/admin/system-books",
  "POST /api/v1/admin/system-books/upload",
  "POST /api/v1/admin/system-books/{book_id}/generate-plan",
  "PATCH /api/v1/admin/system-books/{book_id}/metadata",
  "POST /api/v1/admin/system-books/{book_id}/publish",
  "POST /api/v1/admin/system-books/{book_id}/unpublish",
];

const workflowSteps = [
  {
    title: "Upload sách hệ thống",
    description: "Admin tải lên PDF, EPUB hoặc DOCX có cấu trúc hợp lệ.",
    icon: FileUp,
    status: "BE pending",
  },
  {
    title: "Xử lý bằng pipeline hiện có",
    description: "Parser, planner, TTS và Celery document worker xử lý sách một lần.",
    icon: Settings2,
    status: "BE pending",
  },
  {
    title: "Kiểm tra metadata",
    description: "Admin chỉnh title, author, category, tags, mô tả và ngôn ngữ.",
    icon: ListChecks,
    status: "BE pending",
  },
  {
    title: "Publish ra catalog",
    description: "Chỉ publish sách đã sẵn sàng hoàn toàn để tránh trải nghiệm lỗi cho reader.",
    icon: Rocket,
    status: "BE pending",
  },
];

const backendDependencies = [
  "Thêm visibility/catalog fields cho bảng books.",
  "Backfill sách hiện có thành user_private.",
  "Thêm admin system-books endpoints.",
  "Audit log cho upload, metadata update, publish và unpublish.",
  "Fix logic user-specific reading plan trước khi mở catalog cho mobile.",
];

export default function SystemBooksPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 border-b border-zinc-850 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-300">
            <LibraryBig className="h-3.5 w-3.5" />
            Admin Phase 2
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sách hệ thống
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Khu vực chuẩn bị cho luồng admin ingest sách vào catalog chung của Tri Âm.
            Hiện UI này chưa gọi API Phase 2 vì backend system-book endpoints chưa được
            implement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/books")}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white active:scale-95"
          >
            <BookOpen className="h-4 w-4" />
            Xem tất cả sách
          </button>
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-500"
          >
            <FileUp className="h-4 w-4" />
            Upload sách hệ thống
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 lg:col-span-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-100">
                Chưa bật thao tác publish thật
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
                Phase 2 cần backend bổ sung model, migration và API riêng. FE không nên tự
                giả lập upload/publish bằng các endpoint Phase 1, vì sách hệ thống cần thêm
                quyền catalog, audit và logic nhiều user dùng chung.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                Trạng thái
              </h2>
              <p className="mt-1 text-xl font-bold text-white">Chờ BE Phase 2</p>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/15 p-6 shadow-lg backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Workflow sẽ triển khai</h2>
            <p className="mt-1 text-xs text-zinc-450">
              Đây là luồng sản phẩm chuẩn cho admin ingest sách vào hệ thống.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-xl border border-zinc-800 bg-zinc-950/60 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-violet-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                    {step.status}
                  </span>
                </div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Bước {index + 1}
                </span>
                <h3 className="font-bold text-zinc-100">{step.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-zinc-450">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/15 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">API dự kiến</h2>
              <p className="text-xs text-zinc-450">
                FE sẽ enable các action này sau khi BE implement.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {plannedApis.map((api) => (
              <div
                key={api}
                className="flex items-center justify-between rounded-lg border border-zinc-850 bg-zinc-950 px-3 py-2"
              >
                <code className="text-xs font-semibold text-zinc-300">{api}</code>
                <PauseCircle className="h-3.5 w-3.5 text-zinc-600" />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/15 p-6 shadow-lg backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-300">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">BE cần hoàn thành</h2>
              <p className="text-xs text-zinc-450">
                Không bỏ qua các điểm này trước khi mở catalog cho user mobile.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {backendDependencies.map((item) => (
              <div key={item} className="flex items-start gap-3 text-sm text-zinc-350">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/jobs?status=error")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
            >
              Xem job lỗi hiện tại
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/audit-logs?action=job.retry")}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-bold text-zinc-300 transition-all hover:bg-zinc-800 hover:text-white"
            >
              Xem audit retry
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
