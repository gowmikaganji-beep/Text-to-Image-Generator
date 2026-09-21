import { motion } from "framer-motion";
import { Heart, Wand2, Trash2, FolderPlus, Download } from "./icons";
import type { LuminaImage } from "../lib/api";

interface Props {
  image: LuminaImage;
  onToggleFavorite?: (id: string) => void;
  onVariation?: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddToCollection?: (id: string) => void;
  busy?: boolean;
}

export function ImageCard({
  image,
  onToggleFavorite,
  onVariation,
  onDelete,
  onAddToCollection,
  busy,
}: Props) {
  return (
    <motion.figure
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="group relative overflow-hidden rounded-2xl border border-line/60 bg-surface"
    >
      <div className="aspect-square w-full overflow-hidden bg-surface2">
        <img
          src={image.url}
          alt={image.prompt}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <figcaption className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-canvas/95 via-canvas/70 to-transparent p-4 transition-transform duration-300 group-hover:translate-y-0">
        <p className="mb-3 line-clamp-2 font-mono text-xs text-muted">{image.prompt}</p>
        <div className="flex items-center gap-2">
          {onToggleFavorite && (
            <button
              onClick={() => onToggleFavorite(image.id)}
              aria-label={image.isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`rounded-full p-2 transition-colors ${
                image.isFavorite ? "bg-coral/20 text-coral" : "bg-surface2 text-muted hover:text-ink"
              }`}
            >
              <Heart filled={image.isFavorite} />
            </button>
          )}
          {onVariation && (
            <button
              onClick={() => onVariation(image.id)}
              disabled={busy}
              aria-label="Generate variation"
              className="rounded-full bg-surface2 p-2 text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              <Wand2 />
            </button>
          )}
          {onAddToCollection && (
            <button
              onClick={() => onAddToCollection(image.id)}
              aria-label="Add to collection"
              className="rounded-full bg-surface2 p-2 text-muted transition-colors hover:text-ink"
            >
              <FolderPlus />
            </button>
          )}
          <a
            href={image.url}
            download={`lumina-${image.id}.png`}
            aria-label="Download image"
            className="rounded-full bg-surface2 p-2 text-muted transition-colors hover:text-ink"
          >
            <Download />
          </a>
          {onDelete && (
            <button
              onClick={() => onDelete(image.id)}
              aria-label="Delete image"
              className="ml-auto rounded-full bg-surface2 p-2 text-muted transition-colors hover:text-coral"
            >
              <Trash2 />
            </button>
          )}
        </div>
      </figcaption>
    </motion.figure>
  );
}
