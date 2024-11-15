// Variables
let dbIsReady = false;

// Event listerners
document.getElementById("manuell-vaxelkurs").addEventListener('click', setXRateMan);
document.getElementById("auto-vaxelkurs").addEventListener('click', setXRateAuto);
document.getElementById("bruttolon").addEventListener('change', updateOutput);
document.getElementById("tabellNr").addEventListener('change', tabellNrChanged);
document.getElementById("skatteAr").addEventListener('change', skatteArChanged);
document.getElementById("vaxelkurs").addEventListener('change', updateOutput);

// Bindings
const xRateField = document.getElementById("vaxelkurs");
const tabellNrSelector = document.getElementById("tabellNr");
const skatteArSelector = document.getElementById("skatteAr");

// Main
updateXRate();
openDB(() => {
    dbIsReady = true;
    updateSkattetabell();
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

function updateSkattetabell() {
    console.log("Updating skattetabeller");

    // Fill tabellNrSelector with options
    tabellNrSelector.replaceChildren();
    const selectedTabell = localStorage.getItem("tabellNr");
    getTabellNr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(`Skattetabell ${element}`);
        if (element == selectedTabell) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(text);
        tabellNrSelector.appendChild(option);
    });

    // Fill skatteArSelector with options
    skatteArSelector.replaceChildren();
    const selectedYear = localStorage.getItem("skatteAr") == null ? new Date().getFullYear() : localStorage.getItem("skatteAr");
    getSkatteAr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(element);
        if (element == selectedYear) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(text);
        skatteArSelector.appendChild(option);
    });

    updateOutput();
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
    const xRate = document.getElementById("vaxelkurs").value;
    const bruttoLonDKK = document.getElementById("bruttolon").value;

    const bruttoLonSEK = (xRate * bruttoLonDKK).toFixed(2);
    document.getElementById("brutto-sek-out").innerHTML = `SEK ${bruttoLonSEK}`.replace(/[0-9]{3}\./, s => " " + s);

    const tabellnr = getSelectedTabellNr();
    const ar = getSelectedAr();
    getPrelSkatt(tabellnr, ar, bruttoLonSEK, prelSkatt => {
        console.log(`Preliminärskatt för ${bruttoLonSEK} är ${prelSkatt}`);
        document.getElementById("skatt-sek-out").innerHTML = `SEK ${prelSkatt.toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
        document.getElementById("netto-sek-out").innerHTML = `SEK ${Number(bruttoLonSEK - prelSkatt).toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
    });
}

function setXRateAuto() {
    document.getElementById("manuell-vaxelkurs").checked = false;
    document.getElementById("vaxelkurs").disabled = true;
    updateXRate();
}

function setXRateMan() {
    document.getElementById("auto-vaxelkurs").checked = false;
    document.getElementById("vaxelkurs").disabled = false;
}

function getSelectedAr() {
    return skatteArSelector.value;
}

function getSelectedTabellNr() {
    return tabellNrSelector.value.match(/[0-9]+/)[0];
}