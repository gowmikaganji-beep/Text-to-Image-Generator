import { GeneratedImage } from "@workspace/api-client-react";
import { Heart, Download, Copy, Trash2, Maximize2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  useToggleFavorite, 
  useDeleteImage, 
  getListImagesQueryKey,
  getListRecentImagesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function ImageCard({ 
  image, 
  onAddToCollection,
  onClick
}: { 
  image: GeneratedImage;
  onAddToCollection?: (image: GeneratedImage) => void;
  onClick?: (image: GeneratedImage) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const toggleFavorite = useToggleFavorite();
  const deleteImage = useDeleteImage();

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    queryClient.setQueriesData({ queryKey: getListImagesQueryKey() }, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        images: old.images.map((img: any) => 
          img.id === image.id ? { ...img, isFavorite: !img.isFavorite } : img
        )
      };
    });
    
    toggleFavorite.mutate({ id: image.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListImagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRecentImagesQueryKey() });
      }
    });
  };

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(image.prompt);
    toast({ description: "Prompt copied to clipboard", duration: 2000 });
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Error", description: "Failed to download image", variant: "destructive" });
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this image?")) {
      deleteImage.mutate({ id: image.id }, {
        onSuccess: () => {
          toast({ description: "Image deleted" });
          queryClient.invalidateQueries({ queryKey: getListImagesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListRecentImagesQueryKey() });
        }
      });
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative rounded-xl overflow-hidden cursor-pointer bg-card border border-white/5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick && onClick(image)}
    >
      <div className="aspect-square w-full bg-muted relative">
        <img 
          src={image.imageUrl} 
          alt={image.prompt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] p-4 flex flex-col justify-between transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex justify-end gap-2">
            <Button 
              size="icon" 
              variant="secondary" 
              className={`h-8 w-8 rounded-full ${image.isFavorite ? 'text-red-500' : 'text-white'}`}
              onClick={handleFavorite}
            >
              <Heart size={14} className={image.isFavorite ? "fill-current" : ""} />
            </Button>
            {onAddToCollection && (
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={(e) => { e.stopPropagation(); onAddToCollection(image); }}>
                <Plus size={14} />
              </Button>
            )}
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={handleDownload}>
              <Download size={14} />
            </Button>
          </div>
          
          <div>
            <p className="text-white text-sm line-clamp-3 mb-3 leading-snug">{image.prompt}</p>
            <div className="flex gap-2 justify-between items-center">
              <div className="flex gap-2">
                <span className="text-xs bg-white/20 px-2 py-1 rounded-md text-white/90">{image.style || "Auto"}</span>
                {image.size && <span className="text-xs bg-white/20 px-2 py-1 rounded-md text-white/90">{image.size}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white" onClick={handleCopyPrompt}>
                  <Copy size={14} />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-red-400" onClick={handleDelete}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
