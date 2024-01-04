

//adding the project list
function updateProjectList(){
  let LeftPanelProjectList = document.getElementById("LeftPanelProjectList");
  LeftPanelProjectList.innerHTML = "";
  ProjectsList = storage.getItem("ProjectsList")
  projectButton = document.createElement("div");
  Object.assign(projectButton, {textContent : "Add projects", classList: "leftPanelButton", style: "--iconURL: url('../assets/icons/AddProjects.svg');", onclick: function(){window.location.href = './AddProject.html';}});
  LeftPanelProjectList.appendChild(projectButton);

  if(!!ProjectsList){
    Object.keys(ProjectsList).forEach(project => {
      projectButton = document.createElement("div");
      Object.assign(projectButton, {textContent : ProjectsList[project].name, classList: "leftPanelButton", onclick: function(){loadProject(project);}});
      LeftPanelProjectList.appendChild(projectButton);
    });
  }
}

//function to load a different projet
function loadProject(project){
  document.getElementById("showLeftPanelCheckbox").checked = false;
  window.location.href = "./dashboard.html?project="+project;
}



updateProjectList();
