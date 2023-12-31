// a js file containing toast and loading animations function


//Some important functions initialisation
const sleep = ms => new Promise(res => setTimeout(res, ms));

//make a popup/toast
async function ShowToast(text, color){
  //ShowToast function
  // text a string that will show up on the toast
  // color a string for color : `red` (errors,...), `green` (Action performed)
  color = color.trim()
  //append ToastsContainer to body if not present
  if(!document.getElementById("ToastsContainer")){
    let ToastsContainer = document.createElement("section")
    Object.assign(ToastsContainer, {id:"ToastsContainer"})
    document.body.appendChild(ToastsContainer)
  }else{
    let ToastsContainer = document.getElementById("ToastsContainer");
  }
  let ToastDiv = document.createElement("div");
  Object.assign(ToastDiv, {textContent : text, classList : "ToastDiv ToastDiv"+color});
  let ToastCross = document.createElement("strong");
  Object.assign(ToastCross, {textContent : "x", onclick: function(){RemoveToast(ToastDiv)}});
  ToastDiv.appendChild(ToastCross);
  ToastsContainer.appendChild(ToastDiv);
  //console.log("waiting")
  await sleep(5000);
  //console.log("waited")
  do {
    await sleep(100);
    //console.log("hoverd");
  }while(ToastDiv.matches(":hover"))
  RemoveToast(ToastDiv);
}

async function RemoveToast(ToastDiv){
  ToastDiv.classList.add("ToastDivRemoved");
  await sleep(1000);
  ToastDiv.remove();
}


function startLoading(){
  //append loadingAnnim to body if not present
  if(!document.getElementById("loadingAnnim")){
    let loadingAnnim = document.createElement("div")
    Object.assign(loadingAnnim, {id:"loadingAnnim", className:"lds-ring"})
    loadingAnnim.appendChild(document.createElement("div"))
    loadingAnnim.appendChild(document.createElement("div"))
    loadingAnnim.appendChild(document.createElement("div"))
    loadingAnnim.appendChild(document.createElement("div"))
    document.body.appendChild(loadingAnnim)
  }else{
    let loadingAnnim = document.getElementById("loadingAnnim");
  }
  [...document.getElementsByTagName("button")].forEach(i => i.disabled = true);
  loadingAnnim.classList.remove("hidden");
}

function endLoading(){
  [...document.getElementsByTagName("button")].forEach(i => i.disabled = false);
  document.getElementById("loadingAnnim").classList.add("hidden");
}
