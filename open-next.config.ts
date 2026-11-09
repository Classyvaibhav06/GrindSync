import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Default config: uses the Workers cache.
  // Add an R2-backed incremental cache later if you need ISR.
});
