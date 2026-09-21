import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useApi } from "../hooks/useApi";
import { ImageCard } from "../components/ImageCard";
import { AddToCollectionModal } from "../components/AddToCollectionModal";
import { Search } from "../components/icons";
import type { LuminaImage } from "../lib/api";

export function History() {
  const api = useApi();
  const [images, setImages] = useState<LuminaImage[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(q?: string) {
    setLoading(true);
    try {
      const data = await api.getHistory(q ? { q } : undefined);
      setImages(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(id: string) {
    const updated = await api.toggleFavorite(id);
    setImages((prev) => prev.map((img) => (img.id === id ? updated : img)));
  }

  async function handleDelete(id: string) {
    await api.deleteImage(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-muted">Every image you've generated, newest first.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(query);
          }}
          className="flex items-center gap-2 rounded-full border border-line/60 bg-surface px-4 py-2"
        >
          <Search className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts…"
            className="w-48 bg-transparent text-sm placeholder:text-muted focus:outline-none"
          />
        </form>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl border border-line/60 bg-surface2" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">No images yet — go generate something.</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
                onAddToCollection={setAddingTo}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddToCollectionModal imageId={addingTo} onClose={() => setAddingTo(null)} />
    </div>
  );
}
