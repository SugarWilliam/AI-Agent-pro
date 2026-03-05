/**
 * AI Agent Pro - Service Worker
 * 支持 PWA 安装与离线缓存
 */
const CACHE_NAME = 'ai-agent-pro-v8.4.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg',
  './css/style-new.css',
  './js/app.js',
  './js/ui.js',
  './js/events.js',
  './js/llm.js',
  './js/rag.js',
  './js/plan.js',
  './js/storage.js',
  './js/sync.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './vendor/fontawesome/css/all.min.css',
  './vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './vendor/fontawesome/webfonts/fa-brands-400.woff2',
  './vendor/highlightjs/atom-one-dark.min.css',
  './vendor/chartjs/chart.umd.min.js',
  './vendor/mermaid/mermaid.min.js',
  './vendor/html2canvas/html2canvas.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate' || e.request.url.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match('./index.html').then((r) => r || new Response('Offline'))
      )
    );
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
