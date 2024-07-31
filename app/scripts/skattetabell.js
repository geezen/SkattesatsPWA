const DB_NAME = "skattetabeller";
const DB_VERSION = 1;
const DB_STORE_NAME = "tabellrad";
const INITIAL_URL = "https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95?_limit=500";

let db;
let readyCallback;

let skattetabeller = new Set();
let years = new Set();

function openDB(callback) {
    readyCallback = callback;
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
        objectStore.createIndex("skattetabell", ["tabellnr", "år"], { unique: false });
    };
}

function getTabellNr() {
    return JSON.parse(localStorage.getItem("tabellnr"));
}

function getSkatteAr() {
    return JSON.parse(localStorage.getItem("years"));
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
        dbIsReady();
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
                skattetabeller.add(row["tabellnr"]);
                years.add(row["år"]);
            });

            if (response.next == null) {
                localStorage.setItem("expectedRows", response.resultCount);
                downloadCompleted();
            } else {
                downloadSkattetabeller(response.next);
            } 
    });
}

function downloadCompleted() {
    localStorage.setItem("tabellnr", JSON.stringify(Array.from(skattetabeller).sort()));
    localStorage.setItem("years", JSON.stringify(Array.from(years).sort()));
    dbIsReady();
}

function dbIsReady() {
    const countRequest = getObjectStore().count();
    countRequest.onsuccess = () => {
        expectedRows = localStorage.getItem("expectedRows");
        console.log(`ObjectStore för skattetabeller har ${countRequest.result} rader, borde ha ${expectedRows} rader`);
    };
    readyCallback();
}

function getObjectStore() {
    return db.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME);
}