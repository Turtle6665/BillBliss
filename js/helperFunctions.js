// a js file containing toast, loading animations function and darkmode managment

//Some important functions initialisation
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

//make a popup/toast
async function ShowToast(text, color) {
  //ShowToast function
  // text a string that will show up on the toast
  // color a string for color : `red` (errors,...), `green` (Action performed), `Orange` (attention warning)
  color = color.trim();
  //append ToastsContainer to body if not present
  if (!document.getElementById("ToastsContainer")) {
    let ToastsContainer = document.createElement("section");
    Object.assign(ToastsContainer, { id: "ToastsContainer" });
    document.body.appendChild(ToastsContainer);
  } else {
    let ToastsContainer = document.getElementById("ToastsContainer");
  }
  let ToastDiv = document.createElement("div");
  Object.assign(ToastDiv, {
    textContent: text,
    classList: "ToastDiv ToastDiv" + color,
  });
  let ToastCross = document.createElement("strong");
  Object.assign(ToastCross, {
    textContent: "x",
    onclick: function () {
      RemoveToast(ToastDiv);
    },
  });
  ToastDiv.appendChild(ToastCross);
  ToastsContainer.appendChild(ToastDiv);
  //console.log("waiting")
  await sleep(5000);
  //console.log("waited")
  do {
    await sleep(100);
    //console.log("hoverd");
  } while (ToastDiv.matches(":hover"));
  RemoveToast(ToastDiv);
}

async function RemoveToast(ToastDiv) {
  ToastDiv.classList.add("ToastDivRemoved");
  await sleep(1000);
  ToastDiv.remove();
}

//
// make the loading animations
//

function startLoading() {
  //append loadingAnnim to body if not present
  if (!document.getElementById("loadingAnnim")) {
    let loadingAnnim = document.createElement("div");
    Object.assign(loadingAnnim, { id: "loadingAnnim", className: "lds-ring" });
    loadingAnnim.appendChild(document.createElement("div"));
    loadingAnnim.appendChild(document.createElement("div"));
    loadingAnnim.appendChild(document.createElement("div"));
    loadingAnnim.appendChild(document.createElement("div"));
    document.body.appendChild(loadingAnnim);
  } else {
    let loadingAnnim = document.getElementById("loadingAnnim");
  }
  [...document.body.getElementsByTagName("button")]
    .filter((button) => {
      return !button.classList.contains("leftPanelButton");
    })
    .forEach((i) => (i.disabled = true));
  loadingAnnim.classList.remove("hidden");
}

function endLoading() {
  [...document.body.getElementsByTagName("button")].forEach(
    (i) => (i.disabled = false)
  );
  document.getElementById("loadingAnnim").classList.add("hidden");
}

//
// Update currency list
//

function updateCurrencyList(DOMSelected, selectedCurrency = "XXX") {
  // DOMSelected should be a select dom elements.
  // selectedCurrency is a string.
  apiUrlCurrencies = apiUrl + "currencies";

  return fetch(apiUrlCurrencies, { method: "GET" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((currencyList) => {
      DOMSelected.innerHTML = "";
      currencyList.forEach((currency) => {
        let currencyOption = document.createElement("option");
        Object.assign(currencyOption, {
          value: currency,
          textContent: currency,
        });
        if (currency == "XXX") {
          currencyOption.textContent = "No currency";
        }
        if (currency == selectedCurrency) {
          currencyOption.selected = true;
        }
        DOMSelected.appendChild(currencyOption);
      });
    })
    .catch((error) => {
      ShowToast(error.message, "Red");
      console.error("Error:", error.message);
    });
}

//
// Verifie code and get login token
//
function VerifieAuthCode(projectID, ProjectCode, apiUrl) {
  //return Bool (false) if not correct or Token if varification successful
  return fetch(apiUrl + "projects/" + projectID + "/token", {
    method: "GET",
    headers: {
      Authorization: `Basic ` + btoa(`${projectID}:${ProjectCode}`),
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        ShowToast("Failed to verifie your credentials.", "Red");
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      // Extract and handle the token from the response data
      const token = data.token;
      return token;
    })
    .catch((error) => {
      console.error("Error:", error.message);
      return false;
    });
}

function getFirstBoolean(values) {
  for (let value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }
  return false;
}

function switchDarkMode(forceChangeTo = null) {
  let defaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  let DarkMode = getFirstBoolean([
    forceChangeTo,
    storage.getItem("DarkMode"),
    defaultDark,
    false,
  ]);
  if (DarkMode) {
    document.documentElement.classList.remove("ligth");
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("ligth");
  }
}

switchDarkMode();

// other usefull function
function reverseChildren(parent) {
  for (var i = 1; i < parent.childNodes.length; i++) {
    parent.insertBefore(parent.childNodes[i], parent.firstChild);
  }
}

// update IHM urls
function updateIHMURL() {
  if (IhmUrl != "ihatemoney.org") {
    document.body.innerHTML = document.body.innerHTML.replaceAll(
      "ihatemoney.org",
      IhmUrl
    );
  }
  [...document.getElementsByClassName("IHMServerURLinputs")].forEach(
    (el) => (el.value = IhmUrl)
  );
}
