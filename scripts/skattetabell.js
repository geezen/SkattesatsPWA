const DB_NAME = "skattetabeller";
const DB_VERSION = 1;
const DB_STORE_NAME = "tabellrad";
const INITIAL_URL = "https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95?_limit=500";

let db;
let readyCallback;

let skattetabeller;
let years;

let sentRequests;
let fulfilledRequests;

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

function getPrelSkatt(tabellnr, ar, bruttolon, callback) {
    const objectStore = getObjectStore();
    const request = objectStore.index("skattetabell").getAll([tabellnr, ar]);
    bruttolon = bruttolon < 1 ? 1 : bruttolon;
    request.onsuccess = () => {
        console.log(`Letar skatt bland ${request.result.length} rader för ${bruttolon} SEK i tabell ${tabellnr} för år ${ar}`);
        for (const row of request.result) {
            if (Number(bruttolon) <= row["inkomst t.o.m."] && Number(bruttolon) >= row["inkomst fr.o.m."]) {
                console.log("Hittade rad", row);
                let result;
                if (/.*%/.test(row["antal dgr"])) {
                    result = bruttolon * Number(row["kolumn 1"]) / 100;
                } else {
                    result = Number(row["kolumn 1"]);
                }
                callback(result);
                break;
            } /* else {
                console.log("Fortsätter, rad var inte rätt för", bruttolon, row);
            }*/
        }
    };
}

//private functions
function cacheIfRequired() {
    const skattetabellerFetchDate = localStorage.getItem("skattetabellerFetchDate");
    const currentYear = new Date().getFullYear();
    if (skattetabellerFetchDate == null) {
        // fetch skattetabeller
        console.log("Laddar ner skattetabeller");
        downloadSkattetabeller();
    } else if (/*skattetabell är gammal */ Math.max(...JSON.parse(localStorage.getItem("years"))) < currentYear) {
        console.log(`Har inte skattetabeller för nuvarande år ${currentYear}. Laddar ner för nya året.`);
        downloadSkattetabellerForYear(currentYear);
    } else {
        console.log("Laddar inte nya skattetabeller");
        dbReady();
    }
};

function downloadSkattetabeller() {
    skattetabeller = new Set();
    years = new Set();
    console.log("fetching...");
    fetch("https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95?_limit=1")
        .then(rawResponse => rawResponse.json())
        .then(response => {
            const resultCount = response.resultCount;
            sentRequests = 0;
            fulfilledRequests = 0;
            for(let i = 0; i < resultCount; i += 500) {
                sentRequests++;
                const nextUrl = "https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95/json?_offset=" + i + "&_limit=500";
                console.log("Nästa URL", nextUrl);
                downloadSkattetabell(nextUrl);
            }
        });
}

function downloadSkattetabellerForYear(year) {
    skattetabeller = new Set(JSON.parse(localStorage.getItem("tabellnr")));
    years = new Set(JSON.parse(localStorage.getItem("years")));
    fetch(`https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95?_limit=1&%C3%A5r=${year}`)
        .then(rawResponse => rawResponse.json())
        .then(response => {
            const resultCount = response.resultCount;
            sentRequests = 0;
            fulfilledRequests = 0;
            for(let i = 0; i < resultCount; i += 500) {
                sentRequests++;
                const nextUrl = `https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95/json?_offset=${i}&_limit=500&%C3%A5r=${year}`;
                console.log("Nästa URL", nextUrl);
                downloadSkattetabell(nextUrl);
            }
        });
}

function downloadSkattetabell(url) {
    console.log(`Fetching skattetabeller från ${url}`);
    fetch(url)
        .then(rawResponse => rawResponse.json())
        .then(response => {
            fulfilledRequests++;
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

            const progress = fulfilledRequests * 100 / sentRequests;
            console.log(`Response received at offset ${response.offset}, ${progress.toFixed(1)}% complete`);

            if (fulfilledRequests == sentRequests) {
                downloadCompleted();
            }
    });
}

function downloadCompleted() {
    localStorage.setItem("tabellnr", JSON.stringify(Array.from(skattetabeller).sort()));
    localStorage.setItem("years", JSON.stringify(Array.from(years).sort()));
    dbReady();
}

function dbReady() {
    const countRequest = getObjectStore().count();
    countRequest.onsuccess = () => {
        console.log(`ObjectStore för skattetabeller har ${countRequest.result} rader`);
    };
    readyCallback();
}

function getObjectStore() {
    return db.transaction(DB_STORE_NAME, "readwrite").objectStore(DB_STORE_NAME);
}

// testing functions
function deleteYear(year) {
    years = new Set(JSON.parse(localStorage.getItem("years")));
    years.delete(year);
    localStorage.setItem("years", JSON.stringify(Array.from(years).sort()));

    const objectStore = getObjectStore();
    const cursorRequest = objectStore.openCursor();

    let deletedRecords = 0;
    cursorRequest.onsuccess = event => {
        const cursor = event.target.result;
        if (cursor) {
            if (cursor.value["år"] == year) {
                // Delete the record using its key
                objectStore.delete(cursor.key);
                deletedRecords++;
            }

            // Continue iterating through the next record
            cursor.continue();
        } else {
            console.log(`No more records to process. Deleted ${deletedRecords} records`);
            updateSkattetabell();
        }
    };
}