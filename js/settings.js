

//adding the project list
function updateProjectList(){
  let LeftPanelProjectList = document.getElementById("LeftPanelProjectList");
  LeftPanelProjectList.innerHTML = "";
  ProjectsList = storage.getItem("ProjectsList")
  projectButton = document.createElement("div");
  Object.assign(projectButton, {textContent : "Add projects", classList: "leftPanelButton", style: "--iconURL: url('../assets/icons/AddProjects.svg');", onclick: function(){window.location.href = './AddProject.html'}});
  LeftPanelProjectList.appendChild(projectButton);

  Object.keys(ProjectsList).forEach(project => {
    projectButton = document.createElement("div");
    Object.assign(projectButton, {textContent : ProjectsList[project].name, classList: "leftPanelButton", onclick: function(){loadProject(project);}});
    LeftPanelProjectList.appendChild(projectButton);
  });
}

//function to load a different projet
function loadProject(project){
  document.getElementById("showLeftPanelCheckbox").checked = false;
  window.location.href = "./dashboard.html?project="+project;
}




// settgins
localStorageSettingSwitch = document.getElementById("localStorageSettingSwitch")

function saveSettings(){
  //localStorage acceptation
  if(localStorageSettingSwitch.getElementsByTagName("input")[0].checked & !storage.old_LS_accepted){
    storage.acceptLocalStorage();
  }else if(!localStorageSettingSwitch.getElementsByTagName("input")[0].checked & storage.old_LS_accepted){
    storage.denieLocalStorage();
  }

  ShowToast("Settings updated", "Green")
}

//to update the settings on the page
function updateSettings(toast = true){
  localStorageSettingSwitch.getElementsByTagName("input")[0].checked = storage.old_LS_accepted


  if(toast){
    ShowToast("Change in settings canceled", "Red")
  }
}



updateProjectList();
updateSettings(false);
