import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import type { Collection } from "../lib/api";

export function Collections() {
  const api = useApi();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    api
      .getCollections()
      .then(setCollections)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const collection = await api.createCollection(newName.trim());
    setCollections((prev) => [collection, ...prev]);
    setNewName("");
  }

  async function handleDelete(id: string) {
    await api.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Collections</h1>
      <p className="mt-1 text-sm text-muted">Group your generations into curated sets.</p>

      <form onSubmit={handleCreate} className="mt-6 flex max-w-md gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name…"
          className="flex-1 rounded-lg border border-line/60 bg-surface px-4 py-2 text-sm placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="rounded-lg bg-prism px-5 py-2 text-sm font-semibold text-canvas disabled:opacity-40"
        >
          Create
        </button>
      </form>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-2xl border border-line/60 bg-surface2" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">
          No collections yet — create one above, or add an image to a collection from History.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <div
              key={c.id}
              className="group relative overflow-hidden rounded-2xl border border-line/60 bg-surface"
            >
              <Link to={`/collections/${c.id}`} className="block">
                <div className="grid aspect-video grid-cols-2 gap-0.5 bg-canvas">
                  {(c.images ?? []).slice(0, 4).map((entry) => (
                    <img
                      key={entry.image.id}
                      src={entry.image.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ))}
                  {(c.images ?? []).length === 0 && (
                    <div className="col-span-2 flex items-center justify-center text-xs text-muted">
                      Empty collection
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-display font-semibold">{c.name}</h3>
                  <p className="text-xs text-muted">{c._count?.images ?? 0} images</p>
                </div>
              </Link>
              <button
                onClick={() => handleDelete(c.id)}
                aria-label={`Delete ${c.name}`}
                className="absolute right-3 top-3 rounded-full bg-canvas/80 p-1.5 text-xs text-muted opacity-0 transition-opacity hover:text-coral group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
