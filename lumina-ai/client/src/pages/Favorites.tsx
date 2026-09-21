import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useApi } from "../hooks/useApi";
import { ImageCard } from "../components/ImageCard";
import type { LuminaImage } from "../lib/api";

export function Favorites() {
  const api = useApi();
  const [images, setImages] = useState<LuminaImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getHistory({ favorite: true })
      .then(setImages)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleFavorite(id: string) {
    await api.toggleFavorite(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function handleDelete(id: string) {
    await api.deleteImage(id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Favorites</h1>
      <p className="mt-1 text-sm text-muted">Images you've marked to keep close.</p>

      {loading ? (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl border border-line/60 bg-surface2" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">
          No favorites yet — tap the heart on any image to save it here.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {images.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
