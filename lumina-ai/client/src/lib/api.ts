const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

export interface LuminaImage {
  id: string;
  prompt: string;
  url: string;
  isFavorite: boolean;
  parentId: string | null;
  variations?: LuminaImage[];
  createdAt: string;
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string;
  images?: { image: LuminaImage; addedAt: string }[];
  _count?: { images: number };
}

type TokenGetter = () => Promise<string | null>;

function getGuestUserId(): string {
  try {
    let id = localStorage.getItem("lumina_guest_id");
    if (!id) {
      id = "guest-" + Math.random().toString(36).substring(2, 10);
      localStorage.setItem("lumina_guest_id", id);
    }
    return id;
  } catch {
    return "guest-user";
  }
}

/**
 * Thin fetch wrapper that attaches the Clerk session token (and user id header) and throws on non-2xx.
 * Instantiate once per component (or via the useApi hook) with Clerk's getToken and userId.
 */
export function createApiClient(
  getToken: TokenGetter,
  userId?: string | null,
  userEmail?: string | null
) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let token: string | null = null;
    try {
      token = await getToken();
    } catch {
      token = null;
    }

    const guestId = getGuestUserId();
    const effectiveUserId = userId || guestId;

    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "x-user-id": effectiveUserId,
        ...(userEmail ? { "x-user-email": userEmail } : {}),
        ...(guestId ? { "x-guest-id": guestId } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message ?? body?.error ?? `Request failed (${res.status})`);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  }

  return {
    generateImage: (prompt: string, size?: string, quality?: string) =>
      request<LuminaImage>("/api/images/generate", {
        method: "POST",
        body: JSON.stringify({ prompt, size, quality }),
      }),
    createVariation: (imageId: string) =>
      request<LuminaImage>(`/api/images/${imageId}/variations`, { method: "POST" }),
    getHistory: (params?: { favorite?: boolean; q?: string }) => {
      const qs = new URLSearchParams();
      if (params?.favorite) qs.set("favorite", "true");
      if (params?.q) qs.set("q", params.q);
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request<LuminaImage[]>(`/api/images${suffix}`);
    },
    toggleFavorite: (imageId: string) =>
      request<LuminaImage>(`/api/images/${imageId}/favorite`, { method: "PATCH" }),
    deleteImage: (imageId: string) =>
      request<void>(`/api/images/${imageId}`, { method: "DELETE" }),
    getCollections: () => request<Collection[]>("/api/collections"),
    getCollection: (id: string) => request<Collection>(`/api/collections/${id}`),
    createCollection: (name: string) =>
      request<Collection>("/api/collections", { method: "POST", body: JSON.stringify({ name }) }),
    deleteCollection: (id: string) => request<void>(`/api/collections/${id}`, { method: "DELETE" }),
    addToCollection: (collectionId: string, imageId: string) =>
      request(`/api/collections/${collectionId}/images`, {
        method: "POST",
        body: JSON.stringify({ imageId }),
      }),
    removeFromCollection: (collectionId: string, imageId: string) =>
      request<void>(`/api/collections/${collectionId}/images/${imageId}`, { method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
