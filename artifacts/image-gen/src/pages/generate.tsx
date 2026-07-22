import { useState, useRef } from "react";
import { useGenerateImage, getListImagesQueryKey, getListRecentImagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Image as ImageIcon, Settings2, Loader2, Check } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ImageCard } from "@/components/image-card";
import { GeneratedImage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

const PRESETS = [
  "Realistic", "Anime", "Digital Art", "Oil Painting", 
  "Watercolor", "Pixel Art", "Cinematic", "Fantasy", 
  "Cyberpunk", "Minimal"
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [style, setStyle] = useState<string>("Cinematic");
  const [size, setSize] = useState<"1024x1024" | "1536x1024" | "1024x1536">("1024x1024");
  const [highQuality, setHighQuality] = useState(false);
  const [seed, setSeed] = useState<string>("");
  const [resultImage, setResultImage] = useState<GeneratedImage | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const generateMutation = useGenerateImage();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({ description: "Please enter a prompt", variant: "destructive" });
      return;
    }

    generateMutation.mutate({
      data: {
        prompt,
        negativePrompt: negativePrompt || undefined,
        style,
        size,
        quality: highQuality ? "high" : "standard",
        seed: seed ? parseInt(seed) : undefined,
      }
    }, {
      onSuccess: (data) => {
        setResultImage(data);
        queryClient.invalidateQueries({ queryKey: getListImagesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRecentImagesQueryKey() });
        toast({ description: "Image generated successfully!" });
      },
      onError: () => {
        toast({ description: "Failed to generate image", variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full max-h-[100dvh]">
      {/* Left Panel: Controls */}
      <div className="w-full lg:w-[450px] border-r border-white/5 bg-card/30 flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b border-white/5 bg-background/50 sticky top-0 z-10 backdrop-blur-md">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
            <Sparkles className="text-primary" size={24} /> Generator
          </h1>
          <p className="text-sm text-muted-foreground">Craft your prompt and settings</p>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="space-y-3">
            <Label className="text-white font-medium text-base">Prompt</Label>
            <Textarea 
              placeholder="A futuristic city in the rain, neon lights, reflections, cinematic..." 
              className="min-h-[120px] bg-black/40 border-white/10 text-white placeholder:text-muted-foreground/50 resize-none text-base"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <Accordion type="multiple" className="w-full" defaultValue={["settings"]}>
            <AccordionItem value="settings" className="border-white/10">
              <AccordionTrigger className="text-white hover:no-underline hover:text-primary transition-colors">
                <div className="flex items-center gap-2 font-medium">
                  <Settings2 size={16} /> Advanced Settings
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                
                {/* Negative Prompt */}
                <div className="space-y-2">
                  <Label className="text-white/80">Negative Prompt</Label>
                  <Textarea 
                    placeholder="ugly, blurry, low res, bad anatomy..." 
                    className="h-20 bg-black/20 border-white/10 text-white text-sm resize-none"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>

                {/* Style Presets */}
                <div className="space-y-3">
                  <Label className="text-white/80">Style</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setStyle(p)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          style === p 
                            ? "bg-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.3)] border border-primary" 
                            : "bg-white/5 text-white/70 border border-white/5 hover:bg-white/10"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid for Size and Quality */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Aspect Ratio</Label>
                    <Select value={size} onValueChange={(v: any) => setSize(v)}>
                      <SelectTrigger className="bg-black/20 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-white/10 text-white">
                        <SelectItem value="1024x1024">Square (1:1)</SelectItem>
                        <SelectItem value="1536x1024">Landscape (3:2)</SelectItem>
                        <SelectItem value="1024x1536">Portrait (2:3)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-white/80">Seed (Optional)</Label>
                    <Input 
                      placeholder="Random" 
                      type="number"
                      className="bg-black/20 border-white/10 text-white"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-white">High Quality</Label>
                    <p className="text-xs text-muted-foreground">Takes longer but looks better</p>
                  </div>
                  <Switch checked={highQuality} onCheckedChange={setHighQuality} />
                </div>

              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="p-6 border-t border-white/5 bg-background/50 sticky bottom-0 z-10 backdrop-blur-md">
          <Button 
            className="w-full h-14 text-lg font-medium bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
            ) : (
              <><Wand2Icon className="mr-2 h-5 w-5" /> Generate Image</>
            )}
          </Button>
        </div>
      </div>

      {/* Right Panel: Results */}
      <div className="flex-1 bg-black/20 relative flex flex-col p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col justify-center min-h-[500px]">
          {generateMutation.isPending ? (
            <div className="w-full aspect-square md:aspect-[3/2] rounded-2xl glass-panel flex flex-col items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-blue-500/10 animate-pulse"></div>
              <div className="relative z-10 flex flex-col items-center text-center max-w-md mx-auto">
                <Loader2 size={48} className="text-primary animate-spin mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">Forging your vision...</h3>
                <p className="text-muted-foreground text-lg">"{prompt}"</p>
              </div>
            </div>
          ) : resultImage ? (
            <div className="w-full flex justify-center animate-in fade-in zoom-in duration-500">
              <div className="max-w-3xl w-full">
                <ImageCard image={resultImage} />
              </div>
            </div>
          ) : (
            <div className="w-full aspect-square md:aspect-[3/2] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center p-8 text-center bg-white/[0.02]">
              <ImageIcon size={64} className="text-white/10 mb-6" />
              <h3 className="text-2xl font-bold text-white/40 mb-2">Ready to create</h3>
              <p className="text-white/30 text-lg max-w-md">Enter a prompt on the left and hit generate to see the magic happen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Wand2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
      <path d="m14 7 3 3" />
      <path d="M5 6v4" />
      <path d="M19 14v4" />
      <path d="M10 2v2" />
      <path d="M7 8H3" />
      <path d="M21 16h-4" />
      <path d="M11 3H9" />
    </svg>
  );
}