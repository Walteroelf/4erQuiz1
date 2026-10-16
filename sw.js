/*
 * Service Worker: hält die App auf dem Gerät vor, damit sie auch
 * ohne (oder mit wackeligem) Schul-WLAN startet.
 *
 * - index.html: erst Netz (damit Updates ankommen), nach 3 Sekunden
 *   ohne Antwort oder ohne Netz die gespeicherte Fassung
 * - opencv.js und Vorlagen: aus dem Speicher, sie ändern sich kaum
 * - Schriften von Google: aus dem Speicher, beim ersten Laden geholt
 *
 * Wird opencv.js oder eine Vorlage ausgetauscht, CACHE_NAME erhöhen,
 * damit alle Geräte die neue Datei laden.
 */
const CACHE_NAME = "4er-quiz-v1";

const CORE_FILES = [
  "./",
  "./index.html",
  "./opencv.js",
  "./vorlage/quiz-vorlage.pdf",
  "./vorlage/quiz-vorlage.svg"
];

const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.origin === self.location.origin ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);

    if (response.ok) {
      cache.put("./index.html", response.clone());
    }

    return response;
  } catch (error) {
    const cached =
      await cache.match(request, { ignoreSearch: true }) ||
      await cache.match("./index.html");

    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request, { ignoreSearch: true });

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  /*
   * Schriftdateien kommen ohne CORS als "opaque" Antwort (Status 0),
   * die dürfen trotzdem gespeichert werden.
   */
  if (response.ok || response.type === "opaque") {
    cache.put(request, response.clone());
  }

  return response;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Zeitüberschreitung")),
      ms
    );

    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
