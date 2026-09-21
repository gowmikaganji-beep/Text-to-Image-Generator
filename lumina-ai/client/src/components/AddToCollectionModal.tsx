import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { useApi } from "../hooks/useApi";
import type { Collection } from "../lib/api";

interface Props {
  imageId: string | null;
  onClose: () => void;
}

export function AddToCollectionModal({ imageId, onClose }: Props) {
  const api = useApi();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [savedTo, setSavedTo] = useState<string | null>(null);

  useEffect(() => {
    if (imageId) {
      api.getCollections().then(setCollections);
      setSavedTo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  async function addTo(collectionId: string) {
    if (!imageId) return;
    await api.addToCollection(collectionId, imageId);
    setSavedTo(collectionId);
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !imageId) return;
    const collection = await api.createCollection(newName.trim());
    setCollections((prev) => [collection, ...prev]);
    setNewName("");
    await addTo(collection.id);
  }

  return (
    <Modal open={!!imageId} onClose={onClose} title="Add to collection">
      <div className="max-h-56 space-y-1 overflow-y-auto">
        {collections.length === 0 && (
          <p className="py-2 text-sm text-muted">No collections yet — create your first one below.</p>
        )}
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => addTo(c.id)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              savedTo === c.id ? "bg-violet/20 text-violet" : "hover:bg-surface2"
            }`}
          >
            <span>{c.name}</span>
            {savedTo === c.id && <span className="text-xs">Added ✓</span>}
          </button>
        ))}
      </div>
      <form onSubmit={createAndAdd} className="mt-4 flex gap-2 border-t border-line/60 pt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New collection name"
          className="flex-1 rounded-lg border border-line/60 bg-canvas px-3 py-2 text-sm placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="rounded-lg bg-prism px-4 py-2 text-sm font-semibold text-canvas disabled:opacity-40"
        >
          Create
        </button>
      </form>
    </Modal>
  );
}
