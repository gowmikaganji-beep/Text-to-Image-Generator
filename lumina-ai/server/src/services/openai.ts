import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type ImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";

interface GenerateOptions {
  prompt: string;
  size?: ImageSize;
  quality?: "low" | "medium" | "high" | "auto";
  n?: number;
}

/**
 * Parses size string into width and height numbers.
 */
function parseDimensions(size: ImageSize = "1024x1024"): { width: number; height: number } {
  if (size === "1024x1536") return { width: 1024, height: 1536 };
  if (size === "1536x1024") return { width: 1536, height: 1024 };
  return { width: 1024, height: 1024 };
}

/**
 * Resilient AI fallback image generator using Flux.
 * Generates high-quality base64 image data URLs when OpenAI credits are exhausted or unavailable.
 */
async function generateFallbackImage({
  prompt,
  size = "1024x1024",
  n = 1,
}: GenerateOptions): Promise<string[]> {
  const { width, height } = parseDimensions(size);
  const images: string[] = [];

  for (let i = 0; i < n; i++) {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Fallback image generation failed with HTTP status ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mime = res.headers.get("content-type") || "image/jpeg";
    images.push(`data:${mime};base64,${base64}`);
  }

  return images;
}

/**
 * Generates images via OpenAI if available and funded;
 * seamlessly falls back to high-quality AI generation if OpenAI quota is exhausted or errors out.
 */
export async function generateImage({
  prompt,
  size = "1024x1024",
  quality = "high",
  n = 1,
}: GenerateOptions): Promise<string[]> {
  const hasKey = Boolean(process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes("xxxxxxxx"));

  if (hasKey) {
    try {
      let dalleSize: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024";
      if (size === "1024x1536") dalleSize = "1024x1792";
      else if (size === "1536x1024") dalleSize = "1792x1024";

      const result = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        size: dalleSize,
        quality: quality === "high" ? "hd" : "standard",
        response_format: "b64_json",
        n: 1,
      });

      const urls = (result.data ?? []).map((item) => {
        if (item.b64_json) {
          return `data:image/png;base64,${item.b64_json}`;
        }
        if (item.url) {
          return item.url;
        }
        throw new Error("OpenAI response did not include image data");
      });

      if (urls.length > 0) {
        return urls;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Lumina AI] OpenAI generation unavailable (${message}). Using high-quality AI fallback generator.`);
    }
  }

  // Resilient fallback: ensure the user always gets their image generated correctly
  return generateFallbackImage({ prompt, size, n });
}

/**
 * Generates a variation of an existing image by re-prompting with the
 * original prompt plus a steering instruction.
 */
export async function generateVariation(originalPrompt: string): Promise<string[]> {
  const variationPrompt = `Create a new variation of the following image concept, keeping the same subject and style but with different composition, lighting, or framing: ${originalPrompt}`;
  return generateImage({ prompt: variationPrompt, n: 1 });
}
