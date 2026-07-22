import { useState } from "react";
import { useListImages } from "@workspace/api-client-react";
import { ImageCard } from "@/components/image-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const PRESETS = [
  "All Styles", "Realistic", "Anime", "Digital Art", "Oil Painting", 
  "Watercolor", "Pixel Art", "Cinematic", "Fantasy", "Cyberpunk", "Minimal"
];

export default function HistoryPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [style, setStyle] = useState<string>("All Styles");
  const [favorite, setFavorite] = useState(false);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListImages({
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    style: style !== "All Styles" ? style : undefined,
    favorite: favorite || undefined,
  });

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">History</h1>
          <p className="text-muted-foreground">Your complete creative archive.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search prompts..." 
              className="pl-9 bg-card/50 border-white/10 text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="w-[160px] bg-card/50 border-white/10 text-white">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-card/50 border border-white/10 px-3 py-2 rounded-md">
            <Switch id="favorites" checked={favorite} onCheckedChange={setFavorite} />
            <Label htmlFor="favorites" className="text-white cursor-pointer">Favorites only</Label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data?.images && data.images.length > 0 ? (
          <>
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-6 space-y-6">
              {data.images.map(img => (
                <div key={img.id} className="break-inside-avoid">
                  <ImageCard image={img} />
                </div>
              ))}
            </div>
            
            {/* Pagination basic */}
            <div className="flex justify-center gap-2 mt-12">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)}
                disabled={data.images.length < 20}
                className="border-white/10 text-white hover:bg-white/10"
              >
                Next
              </Button>
            </div>
          </>
        ) : (
          <div className="py-32 text-center">
            <h3 className="text-xl font-medium text-white mb-2">No images found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>
    </div>
  );
}
