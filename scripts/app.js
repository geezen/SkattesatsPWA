// Variables
let dbIsReady = false;

// Bindings
const xRateField = document.getElementById("vaxelkurs");
const tabellNrSelector = document.getElementById("tabellNr");
const skatteArSelector = document.getElementById("skatteAr");
const bruttoLonDKKField = document.getElementById("bruttolon");
const bruttoSekOut = document.getElementById("brutto-sek-out");
const skattSekOut = document.getElementById("skatt-sek-out");
const nettoSekOut = document.getElementById("netto-sek-out");
const manXRateRadio = document.getElementById("manuell-vaxelkurs");
const autoXRateRadio = document.getElementById("auto-vaxelkurs");

// Event listerners
manXRateRadio.addEventListener('click', setXRateMan);
autoXRateRadio.addEventListener('click', setXRateAuto);
bruttoLonDKKField.addEventListener('change', updateOutput);
tabellNrSelector.addEventListener('change', tabellNrChanged);
skatteArSelector.addEventListener('change', skatteArChanged);
xRateField.addEventListener('change', updateOutput);

// Main
updateXRate();
openDB(() => {
    dbIsReady = true;
    updateSkattetabellFieldSet();
});

// Functions
function updateXRate() {
    console.log("Updating X-rate");
    const dkkObj = JSON.parse(localStorage.getItem("dkkObj"));
    if (dkkObj == null) {
        console.log("No existing X-rate found");
        fetchXRate();
    } else if (dkkObj.time_next_update_unix < Date.now() / 1000){
        console.log("Existing X-rate found but out of date", dkkObj);
        setNewXRate(dkkObj);
        fetchXRate();
    } else {
        console.log("Using existing X-rate", dkkObj);
        setNewXRate(dkkObj);
    }
}

function fetchXRate() {
    console.log("Fetching new X-rate");
    fetch("https://open.er-api.com/v6/latest/DKK")
        .then(response => response.json())
        .then(obj => {
            console.log("New X-rate fetched", obj);
            setNewXRate(obj);
            localStorage.setItem("dkkObj", JSON.stringify(obj));
        });
}

function setNewXRate(dkkObj) {
    const xRate = dkkObj.rates.SEK;
    xRateField.value = xRate;
    if (dbIsReady) {
        updateOutput();
    }
}

function updateSkattetabellFieldSet() {
    console.log("Updating skattetabeller");

    // Fill tabellNrSelector with options
    const selectedTabell = localStorage.getItem("tabellNr");
    fillSelector(tabellNrSelector, getAllTabellNr(), item => `Skattetabell ${item}`, selectedTabell);

    // Fill skatteArSelector with options
    const selectedYear = localStorage.getItem("skatteAr") == null ? new Date().getFullYear() : localStorage.getItem("skatteAr");
    fillSelector(skatteArSelector, getAllSkatteAr(), item => item, selectedYear);

    updateOutput();
}

function fillSelector(selector, items, nodeTextCreator, initSelected) {
    selector.replaceChildren();
    items.forEach(item => {
        const option = document.createElement("option");
        const text = nodeTextCreator(item);
        const textNode = document.createTextNode(text);
        if (item == initSelected) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(textNode);
        selector.appendChild(option);
    });
}

function tabellNrChanged() {
    localStorage.setItem("tabellNr", getSelectedTabellNr());
    updateOutput();
}

function skatteArChanged() {
    localStorage.setItem("skatteAr", getSelectedAr());
    updateOutput();
}

function updateOutput() {
    console.log("Updating output");
    const xRate = xRateField.value;
    const bruttoLonDKK = bruttoLonDKKField.value;

    const bruttoLonSEK = (xRate * bruttoLonDKK).toFixed(2);
    bruttoSekOut.innerHTML = `SEK ${bruttoLonSEK}`.replace(/[0-9]{3}\./, s => " " + s);

    const tabellnr = getSelectedTabellNr();
    const ar = getSelectedAr();
    getPrelSkatt(tabellnr, ar, bruttoLonSEK, prelSkatt => {
        console.log(`Preliminärskatt för ${bruttoLonSEK} är ${prelSkatt}`);
        skattSekOut.innerHTML = `SEK ${prelSkatt.toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
        nettoSekOut.innerHTML = `SEK ${Number(bruttoLonSEK - prelSkatt).toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
    });
}

function setXRateAuto() {
    manXRateRadio.checked = false;
    xRateField.disabled = true;
    updateXRate();
}

function setXRateMan() {
    autoXRateRadio.checked = false;
    xRateField.disabled = false;
}

function getSelectedAr() {
    return skatteArSelector.value;
}

function getSelectedTabellNr() {
    return tabellNrSelector.value.match(/[0-9]+/)[0];
}