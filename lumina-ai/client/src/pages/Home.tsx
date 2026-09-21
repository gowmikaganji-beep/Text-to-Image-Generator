import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApi } from "../hooks/useApi";
import { ImageCard } from "../components/ImageCard";
import { Sparkles } from "../components/icons";
import type { LuminaImage } from "../lib/api";

const SUGGESTIONS = [
  "a bioluminescent jellyfish drifting through a midnight coral reef",
  "a retro-futuristic diner on Mars at golden hour, matte painting",
  "an old lighthouse keeper reading by candlelight, watercolor",
  "a city built inside a giant glass terrarium, isometric illustration",
];

export function Home() {
  const api = useApi();
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"1024x1024" | "1024x1536" | "1536x1024">("1024x1024");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LuminaImage[]>([]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const image = await api.generateImage(prompt.trim(), size);
      setResults((prev) => [image, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleVariation(id: string) {
    setLoading(true);
    setError(null);
    try {
      const variation = await api.createVariation(id);
      setResults((prev) => [variation, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Variation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(id: string) {
    const updated = await api.toggleFavorite(id);
    setResults((prev) => prev.map((img) => (img.id === id ? updated : img)));
  }

  async function handleDelete(id: string) {
    await api.deleteImage(id);
    setResults((prev) => prev.filter((img) => img.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      {/* hero / thesis */}
      <section className="mb-12 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line/60 bg-surface/60 px-4 py-1.5 font-mono text-xs text-muted">
          <Sparkles className="text-cyan" />
          powered by gpt-image-1
        </div>
        <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Type a thought.
          <br />
          <span className="prism-text">Watch it split into light.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Lumina turns plain language into images — describe a scene, a style, a mood, and
          generate, refine, and collect the results.
        </p>
      </section>

      {/* prompt bar */}
      <form onSubmit={handleGenerate} className="mx-auto mb-4 max-w-3xl">
        <div className="rounded-2xl border border-line/60 bg-surface p-2 shadow-glow focus-within:border-violet/60">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to create…"
            rows={3}
            className="w-full resize-none bg-transparent px-3 py-2 text-ink placeholder:text-muted focus:outline-none"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1 pt-1">
            <div className="flex items-center gap-1 rounded-full border border-line/60 p-1 font-mono text-xs text-muted">
              {(["1024x1024", "1024x1536", "1536x1024"] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    size === s ? "bg-surface2 text-ink" : "hover:text-ink"
                  }`}
                >
                  {s === "1024x1024" ? "Square" : s === "1024x1536" ? "Portrait" : "Landscape"}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="rounded-full bg-prism px-6 py-2.5 text-sm font-semibold text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {/* suggestion chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setPrompt(s)}
              className="rounded-full border border-line/60 px-3 py-1.5 text-left text-xs text-muted transition-colors hover:border-violet/50 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-coral/40 bg-coral/10 px-4 py-2 text-sm text-coral">
            {error}
          </p>
        )}
      </form>

      {/* loading skeleton */}
      {loading && (
        <div className="mx-auto mb-6 max-w-3xl">
          <div className="aspect-square w-full max-w-sm animate-pulse rounded-2xl border border-line/60 bg-surface2 mx-auto" />
        </div>
      )}

      {/* results */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {results.map((image) => (
            <ImageCard
              key={image.id}
              image={image}
              onToggleFavorite={handleToggleFavorite}
              onVariation={handleVariation}
              onDelete={handleDelete}
              busy={loading}
            />
          ))}
        </AnimatePresence>
      </section>

      {!loading && results.length === 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-auto mt-16 max-w-sm text-center text-sm text-muted"
        >
          Nothing generated yet in this session — write a prompt above, or try one of the
          suggestions.
        </motion.p>
      )}
    </div>
  );
}
