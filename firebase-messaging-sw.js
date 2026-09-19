importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCqvB5B9sH8zGo1VDupgahDQyGKK9MLMao',
  authDomain: 'midiacep-596a3.firebaseapp.com',
  projectId: 'midiacep-596a3',
  storageBucket: 'midiacep-596a3.firebasestorage.app',
  messagingSenderId: '918179980040',
  appId: '1:918179980040:web:a4890816b72badc1bcc2bd'
});

const messaging = firebase.messaging();
const PORTAL_CACHE = 'portal-cep-v6';
const OFFLINE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(PORTAL_CACHE).then(cache => cache.addAll(OFFLINE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('portal-cep-') && key !== PORTAL_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(PORTAL_CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Portal CEP Pirapozinho';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'Você tem um lembrete de escala.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: payload.data?.url || 'https://taynahodlich30-oss.github.io/midiaigreja/' }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || 'https://taynahodlich30-oss.github.io/midiaigreja/';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const opened = windows.find(client => client.url.startsWith(url));
    return opened ? opened.focus() : clients.openWindow(url);
  }));
});
