import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useApi } from "../hooks/useApi";
import { ImageCard } from "../components/ImageCard";
import type { Collection } from "../lib/api";

export function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useApi();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .getCollection(id)
      .then(setCollection)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleRemove(imageId: string) {
    if (!id) return;
    await api.removeFromCollection(id, imageId);
    setCollection((prev) =>
      prev ? { ...prev, images: prev.images?.filter((e) => e.image.id !== imageId) } : prev
    );
  }

  async function handleToggleFavorite(imageId: string) {
    await api.toggleFavorite(imageId);
    setCollection((prev) =>
      prev
        ? {
            ...prev,
            images: prev.images?.map((e) =>
              e.image.id === imageId ? { ...e, image: { ...e.image, isFavorite: !e.image.isFavorite } } : e
            ),
          }
        : prev
    );
  }

  if (loading) {
    return <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted">Loading…</div>;
  }

  if (!collection) {
    return <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted">Collection not found.</div>;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <Link to="/collections" className="text-sm text-muted hover:text-ink">
        ← Collections
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{collection.name}</h1>
      <p className="mt-1 text-sm text-muted">{collection.images?.length ?? 0} images</p>

      {(collection.images?.length ?? 0) === 0 ? (
        <p className="mt-16 text-center text-sm text-muted">
          This collection is empty — add images to it from your History page.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {collection.images!.map((entry) => (
              <ImageCard
                key={entry.image.id}
                image={entry.image}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleRemove}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
