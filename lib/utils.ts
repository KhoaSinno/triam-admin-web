function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

export function formatDate(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "Chưa có hoạt động";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "Chưa có hoạt động";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1);
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

export function truncateId(
  id: string | null | undefined,
  maxLength = 12,
  startLen = 8,
  endLen = 4
): string {
  if (!id) return "-";
  if (id.length <= maxLength) return id;
  return `${id.slice(0, startLen)}...${id.slice(-endLen)}`;
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function getPaginationRange(
  offset: number,
  limit: number,
  total: number,
  itemsCount: number
) {
  const hasNext = offset + itemsCount < total;
  const hasPrev = offset > 0;
  const startNum = total === 0 ? 0 : offset + 1;
  const endNum = offset + itemsCount;
  return { hasNext, hasPrev, startNum, endNum };
}
