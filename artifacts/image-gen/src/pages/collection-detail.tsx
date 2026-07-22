import { useGetCollection, useDeleteCollection, useRemoveImageFromCollection, getGetCollectionQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ImageCard } from "@/components/image-card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function CollectionDetailPage({ id }: { id: string }) {
  const collectionId = parseInt(id);
  const { data: collection, isLoading } = useGetCollection(collectionId, { 
    query: { enabled: !!collectionId, queryKey: getGetCollectionQueryKey(collectionId) } 
  });
  const deleteCollection = useDeleteCollection();
  const removeImage = useRemoveImageFromCollection();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleDeleteCollection = () => {
    if (confirm("Are you sure you want to delete this collection? The images will not be deleted.")) {
      deleteCollection.mutate({ id: collectionId }, {
        onSuccess: () => {
          toast({ description: "Collection deleted" });
          setLocation(`${basePath}/collections`);
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!collection) {
    return <div className="p-10 text-white">Collection not found</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="mb-6">
        <Link href={`${basePath}/collections`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-white transition-colors mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Collections
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{collection.name}</h1>
            {collection.description && <p className="text-muted-foreground max-w-2xl">{collection.description}</p>}
          </div>
          <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={handleDeleteCollection}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete Collection
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-10 mt-8">
        {collection.images && collection.images.length > 0 ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
            {collection.images.map(img => (
              <div key={img.id} className="break-inside-avoid relative group">
                <ImageCard image={img} />
                <Button 
                  size="sm"
                  variant="destructive" 
                  className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 h-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    if(confirm("Remove from collection?")) {
                      removeImage.mutate({ id: collectionId, imageId: img.id }, {
                        onSuccess: () => {
                          queryClient.invalidateQueries({ queryKey: getGetCollectionQueryKey(collectionId) });
                          toast({ description: "Image removed from collection" });
                        }
                      });
                    }
                  }}
                >
                  <Trash2 size={14} className="mr-1" /> Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-32 text-center glass-panel rounded-2xl border-dashed">
            <h3 className="text-xl font-medium text-white mb-2">Collection is empty</h3>
            <p className="text-muted-foreground mb-6">Go to your history or generate new images to add them here.</p>
            <Link href={`${basePath}/history`}>
              <Button className="bg-primary text-white">Browse History</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
