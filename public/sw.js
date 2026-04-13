const CACHE_VERSION = 'gimme-golf-v2'
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`

const APP_SHELL_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './Gimme-Golf-Grass.png',
  './Gimme-Golf-3D-Logo.png',
  './Gimme-Golf-3D-Logo-app.png',
  './splash_screen_app.png',
]

const INDEX_URL = './index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE)
      await cache.addAll(APP_SHELL_URLS.map((url) => new URL(url, self.registration.scope).toString()))
      await cacheBuiltAssetsFromIndex(cache)
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys()
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith('gimme-golf-') && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const requestUrl = new URL(request.url)
  if (requestUrl.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  if (isCacheableAssetRequest(request)) {
    event.respondWith(handleAssetRequest(request))
  }
})

async function cacheBuiltAssetsFromIndex(cache) {
  try {
    const indexUrl = new URL(INDEX_URL, self.registration.scope).toString()
    const indexResponse = await fetch(indexUrl, { cache: 'no-store' })
    if (!indexResponse.ok) {
      return
    }

    await cache.put(indexUrl, indexResponse.clone())
    const html = await indexResponse.text()
    const assetUrls = extractAssetUrls(html, indexUrl)
    await Promise.all(assetUrls.map((assetUrl) => cache.add(assetUrl)))
  } catch {
    // Ignore install-time asset discovery failures and rely on runtime caching.
  }
}

function extractAssetUrls(html, baseUrl) {
  const assetUrls = new Set()
  const urlPattern = /(src|href)=["']([^"']+)["']/g
  let match
  while ((match = urlPattern.exec(html)) !== null) {
    const rawUrl = match[2]
    if (!rawUrl || rawUrl.startsWith('data:') || rawUrl.startsWith('http')) {
      continue
    }
    const resolvedUrl = new URL(rawUrl, baseUrl)
    if (resolvedUrl.origin !== self.location.origin) {
      continue
    }
    assetUrls.add(resolvedUrl.toString())
  }
  return [...assetUrls]
}

function isCacheableAssetRequest(request) {
  const cacheableDestinations = new Set(['script', 'style', 'image', 'font', 'manifest'])
  return cacheableDestinations.has(request.destination)
}

async function handleNavigationRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const indexUrl = new URL(INDEX_URL, self.registration.scope).toString()
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      await cache.put(indexUrl, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cachedIndex = await cache.match(indexUrl)
    if (cachedIndex) {
      return cachedIndex
    }
    return new Response('Offline and app shell not cached yet.', { status: 503 })
  }
}

async function handleAssetRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    void refreshCacheInBackground(cache, request)
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    return new Response('Offline asset unavailable.', { status: 503 })
  }
}

async function refreshCacheInBackground(cache, request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put(request, response.clone())
    }
  } catch {
    // Ignore refresh failures while offline.
  }
}
