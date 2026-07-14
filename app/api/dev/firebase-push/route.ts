import { isFirebaseAdminConfigured, getFirebaseAdminMessaging } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

type FirebasePushRequest = {
  token?: unknown;
  title?: unknown;
  body?: unknown;
  data?: unknown;
};

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice("bearer ".length).trim();
  return token || null;
}

async function assertAdmin(request: Request) {
  const token = readBearerToken(request);
  if (!token) {
    return {
      ok: false as const,
      response: jsonResponse({ detail: "Missing admin bearer token." }, 401),
    };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/admin/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return {
      ok: false as const,
      response: jsonResponse({ detail: "Admin authorization failed." }, res.status),
    };
  }

  const admin = (await res.json().catch(() => null)) as
    | { is_active?: boolean }
    | null;

  if (!admin?.is_active) {
    return {
      ok: false as const,
      response: jsonResponse({ detail: "Admin account is inactive." }, 403),
    };
  }

  return { ok: true as const };
}

function normalizeData(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};

  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>)
      .filter(([key]) => key.trim().length > 0)
      .map(([key, value]) => [
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      ]),
  );
}

export async function GET(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin.ok) return admin.response;

  return jsonResponse({
    configured: isFirebaseAdminConfigured(),
    route: "/api/dev/firebase-push",
    mode: "firebase-direct-dev-only",
  });
}

export async function POST(request: Request) {
  const admin = await assertAdmin(request);
  if (!admin.ok) return admin.response;

  const payload = (await request.json().catch(() => null)) as
    | FirebasePushRequest
    | null;

  const token = typeof payload?.token === "string" ? payload.token.trim() : "";
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const data = normalizeData(payload?.data);

  if (!token) {
    return jsonResponse({ detail: "FCM token is required." }, 400);
  }

  if (!title || !body) {
    return jsonResponse({ detail: "Title and body are required." }, 400);
  }

  try {
    const messageId = await getFirebaseAdminMessaging().send({
      token,
      notification: { title, body },
      data: {
        source: "admin_web_direct_debug",
        ...data,
      },
      android: {
        priority: "high",
        notification: {
          channelId: "tri_am_firebase_direct_debug",
          priority: "high",
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    return jsonResponse({
      messageId,
      status: "sent",
      source: "admin_web_direct_debug",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Firebase send failed.";
    return jsonResponse({ detail: message }, 502);
  }
}
