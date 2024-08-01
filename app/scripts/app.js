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
    getTabellNr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(`Skattetabell ${element}`);
        option.appendChild(text);
        tabellNr.appendChild(option);
    });

    skatteAr.replaceChildren();
    const currentYear = new Date().getFullYear();
    getSkatteAr().forEach(element => {
        const option = document.createElement("option");
        const text = document.createTextNode(element);
        if (element == currentYear) {
            option.setAttribute("selected", "selected");
        }
        option.appendChild(text);
        skatteAr.appendChild(option);
    });

    updateOutput();
    
    document.getElementById("bruttolon").addEventListener('change', updateOutput);
    document.getElementById("tabellNr").addEventListener('change', updateOutput);
    document.getElementById("skatteAr").addEventListener('change', updateOutput);
}

function updateOutput() {
    console.log("Updating output");
    const xRate = document.getElementById("vaxelkurs").value;
    const bruttoLonDKK = document.getElementById("bruttolon").value;

    const bruttoLonSEK = (xRate * bruttoLonDKK).toFixed(2);
    document.getElementById("brutto-sek-out").innerHTML = `SEK ${bruttoLonSEK}`;

    const tabellnr = document.getElementById("tabellNr").value.match(/[0-9]+/)[0];
    const ar = document.getElementById("skatteAr").value;
    getPrelSkatt(tabellnr, ar, bruttoLonSEK, prelSkatt => {
        console.log(`type för prelskatt är ${typeof prelSkatt}`)
        console.log(`Preliminärskatt för ${bruttoLonSEK} är ${prelSkatt}`)
        document.getElementById("skatt-sek-out").innerHTML = `SEK ${prelSkatt.toFixed(2)}`;
        document.getElementById("netto-sek-out").innerHTML = `SEK ${Number(bruttoLonSEK - prelSkatt).toFixed(2)}`;
    });
}