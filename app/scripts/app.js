// Main
updateXRate();
openDB(updateSkattetabell);

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
    const xRateField = document.getElementById("vaxelkurs");
    const xRate = dkkObj.rates.SEK;
    xRateField.setAttribute("value", xRate);
}

function updateSkattetabell() {
    console.log("Updating skattetabeller");
    const tabellNr = document.getElementById("tabellNr");
    const skatteAr = document.getElementById("skatteAr");

    tabellNr.replaceChildren();
    const selectedTabell = localStorage.getItem("tabellNr");
    getTabellNr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(`Skattetabell ${element}`);
        if (element == selectedTabell) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(text);
        tabellNr.appendChild(option);
    });

    skatteAr.replaceChildren();
    const selectedYear = localStorage.getItem("skatteAr") == null ? new Date().getFullYear() : localStorage.getItem("skatteAr");
    getSkatteAr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(element);
        if (element == selectedYear) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(text);
        skatteAr.appendChild(option);
    });

    updateOutput();
    
    document.getElementById("bruttolon").addEventListener('change', updateOutput);
    document.getElementById("tabellNr").addEventListener('change', updateTabellNr);
    document.getElementById("skatteAr").addEventListener('change', updateSkatteAr);
}

function updateTabellNr() {
    localStorage.setItem("tabellNr", getSelectedTabellNr());
    updateOutput();
}

function updateSkatteAr() {
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
        console.log(`type för prelskatt är ${typeof prelSkatt}`);
        console.log(`Preliminärskatt för ${bruttoLonSEK} är ${prelSkatt}`);
        document.getElementById("skatt-sek-out").innerHTML = `SEK ${prelSkatt.toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
        document.getElementById("netto-sek-out").innerHTML = `SEK ${Number(bruttoLonSEK - prelSkatt).toFixed(2)}`.replace(/[0-9]{3}\./, s => " " + s);
    });
}

function getSelectedAr() {
    return document.getElementById("skatteAr").value;
}

function getSelectedTabellNr() {
    return document.getElementById("tabellNr").value.match(/[0-9]+/)[0];
}