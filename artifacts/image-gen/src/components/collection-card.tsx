import { Collection } from "@workspace/api-client-react";
import { Folder, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";

export function CollectionCard({ collection }: { collection: Collection }) {
  return (
    <Link href={`/collections/${collection.id}`}>
      <div className="group relative rounded-xl overflow-hidden cursor-pointer glass-panel border-white/5 transition-all hover:border-primary/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]">
        <div className="aspect-[4/3] w-full bg-muted relative overflow-hidden">
          {collection.coverImageUrl ? (
            <img 
              src={collection.coverImageUrl} 
              alt={collection.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-black/20">
              <Folder size={48} className="opacity-20 mb-2" />
              <span className="text-sm">Empty</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-semibold text-white text-lg truncate">{collection.name}</h3>
          <div className="flex items-center gap-2 text-white/60 text-sm mt-1">
            <ImageIcon size={14} />
            <span>{collection.imageCount} image{collection.imageCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
