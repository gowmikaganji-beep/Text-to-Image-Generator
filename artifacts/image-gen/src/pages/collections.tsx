import { useState } from "react";
import { useListCollections, useCreateCollection, getListCollectionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CollectionCard } from "@/components/collection-card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function CollectionsPage() {
  const { data: collections, isLoading } = useListCollections();
  const createCollection = useCreateCollection();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createCollection.mutate({
      data: { name, description: description || undefined }
    }, {
      onSuccess: () => {
        toast({ description: "Collection created" });
        queryClient.invalidateQueries({ queryKey: getListCollectionsQueryKey() });
        setOpen(false);
        setName("");
        setDescription("");
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full overflow-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Collections</h1>
          <p className="text-muted-foreground">Organize your inspirations.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Plus className="mr-2 h-4 w-4" /> New Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-white">Create Collection</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">Name</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-black/20 border-white/10 text-white" 
                  placeholder="e.g. Cyberpunk Cityscapes" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-white">Description (Optional)</Label>
                <Textarea 
                  id="desc" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-black/20 border-white/10 text-white" 
                  placeholder="A short description..." 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-white">Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim() || createCollection.isPending} className="bg-primary hover:bg-primary/90 text-white">
                {createCollection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : collections && collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {collections.map(c => (
            <CollectionCard key={c.id} collection={c} />
          ))}
        </div>
      ) : (
        <div className="py-32 text-center glass-panel rounded-2xl border-dashed">
          <h3 className="text-xl font-medium text-white mb-2">No collections yet</h3>
          <p className="text-muted-foreground mb-6">Create your first collection to start organizing your images.</p>
          <Button variant="outline" onClick={() => setOpen(true)} className="border-white/10 text-white hover:bg-white/10">
            Create Collection
          </Button>
        </div>
      )}
    </div>
  );
}
