/*
 * Service Worker: hält die App auf dem Gerät vor, damit sie auch
 * ohne (oder mit wackeligem) Schul-WLAN startet.
 *
 * - index.html: erst Netz (damit Updates ankommen), nach 3 Sekunden
 *   ohne Antwort oder ohne Netz die gespeicherte Fassung
 * - opencv.js und Vorlagen: aus dem Speicher, sie ändern sich kaum
 * - Schriften von Google: aus dem Speicher, beim ersten Laden geholt
 *
 * Wird opencv.js oder eine Vorlage ausgetauscht, CACHE_VERSION
 * erhöhen, damit alle Geräte die neue Datei laden.
 *
 * 4erQuiz1 und die Testumgebung liegen unter derselben Adresse
 * walteroelf.github.io und teilen sich den Cache-Speicher. Der Name
 * enthält deshalb den Ordner der App, und beim Aufräumen werden nur
 * die eigenen alten Fassungen gelöscht.
 */
const CACHE_VERSION = "v2";
const CACHE_PREFIX =
  "4er-quiz:" + new URL(self.registration.scope).pathname + ":";
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;

/*
 * Erste Fassung, die beide Apps gemeinsam benutzt haben.
 */
const LEGACY_CACHE_NAME = "4er-quiz-v1";

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
          .filter(name =>
            name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      ))
      .then(cleanUpLegacyCache)
      .then(() => self.clients.claim())
  );
});

/*
 * Aus dem gemeinsamen alten Speicher nur die eigenen Dateien
 * und die Schriften entfernen; die andere App braucht ihre
 * Dateien noch, bis sie selbst aktualisiert ist (fehlt ihr die
 * Schrift, nimmt sie die Systemschrift). Ist er danach leer,
 * wird er gelöscht.
 */
async function cleanUpLegacyCache() {
  if (!(await caches.has(LEGACY_CACHE_NAME))) {
    return;
  }

  const legacy = await caches.open(LEGACY_CACHE_NAME);
  const scope = self.registration.scope;

  for (const request of await legacy.keys()) {
    const isOwnFile = request.url.startsWith(scope);
    const isFont = !request.url.startsWith(self.location.origin);

    if (isOwnFile || isFont) {
      await legacy.delete(request);
    }
  }

  if ((await legacy.keys()).length === 0) {
    await caches.delete(LEGACY_CACHE_NAME);
  }
}

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
