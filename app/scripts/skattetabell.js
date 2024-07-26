const DB_NAME = "skattetabeller";
const DB_VERSION = 1;
const DB_STORE_NAME = "tabellrad";
const INITIAL_URL = "https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95?_limit=500";

let db;

function openDB() {
    const openReq = indexedDB.open("skattetabeller", 1);

    openReq.onsuccess = event => {
        db = event.target.result;
        cacheIfRequired();
    };

    openReq.onerror = event => {
        console.error("Error opening DB:", event.target.errorCode);
    };

    openReq.onupgradeneeded = event => {
        const db = event.target.result;
        const objectStore = db.createObjectStore(DB_STORE_NAME, { autoIncrement: true });
    };
}

function cacheIfRequired() {
    const skattetabellerFetchDate = localStorage.getItem("skattetabellerFetchDate");
    if (skattetabellerFetchDate == null) {
        // fetch skattetabeller
        console.log("Laddar ner skattetabeller");
        downloadSkattetabeller(INITIAL_URL);
    } else if (/*skattetabell är gammal */false) {
        // använd + fetch ny + ta bort gamal
    } else {
        console.log("Laddar inte nya skattetabeller");
        const countRequest = getObjectStore().count();
        countRequest.onsuccess = () => {
            console.log(`ObjectStore har ${countRequest.result} rader`);
        };
    }
};

function downloadSkattetabeller(url) {
    console.log(`Fetching skattetabeller från ${url}`);
    fetch(url)
        .then(rawResponse => rawResponse.json())
        .then(response => {
            console.log(`Skattetabeller från ${url} mottagna med ${response.results.length} rader`);
            localStorage.setItem("skattetabellerFetchDate", Date.now());
            const objectStore = getObjectStore();
            response.results.forEach(row => {
                const addReq = objectStore.add(row);
                addReq.onerror = () => {
                    console.log(`Unable to add ${row}`);
                };
            });

            if (response.next != null) {
                downloadSkattetabeller(response.next);
            }
    });
}

function getObjectStore() {
    return db.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME);
}