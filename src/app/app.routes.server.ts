import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    // Server mode: renders on each request, avoiding the prerender issue
    // where authLoaded stays false because Supabase's onAuthStateChange
    // never fires during build-time prerendering in Node.js.
    renderMode: RenderMode.Server,
  },
];
