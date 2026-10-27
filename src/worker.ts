/**
 * Cloudflare Worker in front of the static build.
 *
 * Workers static assets serve dist/, but they cannot set the two headers the
 * threaded WebAssembly build needs (SharedArrayBuffer requires cross-origin
 * isolation). With `run_worker_first` every request lands here; the asset server
 * still answers it, this only decorates the response.
 */
interface AssetFetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  ASSETS: AssetFetcher;
}

const ISOLATION: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "X-Content-Type-Options": "nosniff",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const asset = await env.ASSETS.fetch(request);

    // 304s and other null-body responses must not be rebuilt with a body.
    const headers = new Headers(asset.headers);
    for (const [name, value] of Object.entries(ISOLATION)) headers.set(name, value);

    if (url.pathname.startsWith("/assets/")) {
      // Vite content-hashes everything it emits.
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (url.pathname.startsWith("/pngdeer/")) {
      // The compressor is versioned by build, not by name: revalidate daily.
      headers.set("Cache-Control", "public, max-age=86400");
    }

    return new Response(asset.body, {
      status: asset.status,
      statusText: asset.statusText,
      headers,
    });
  },
};
