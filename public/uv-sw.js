importScripts("./uv/uv.sw.js");

const sw = new UVServiceWorker();
sw.init(() => {
    const bc = new BroadcastChannel("sw-messages");
    bc.onmessage = (event) => {
        sw.setPayload(event.data);
    }; 
});

self.addEventListener("fetch", (event) => event.respondWith(sw.fetch(event)));
