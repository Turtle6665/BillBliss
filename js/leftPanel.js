//adding the project list
function updateProjectList() {
  let LeftPanelProjectList = document.getElementById("LeftPanelProjectList");
  LeftPanelProjectList.innerHTML = "";
  ProjectsList = storage.getItem("ProjectsList");
  projectButton = document.createElement("button");
  Object.assign(projectButton, {
    textContent: "Add project",
    classList: "leftPanelButton",
    style: "--iconURL: url('../assets/icons/AddProjects.svg');",
    onclick: function () {
      window.location.href = "./AddProject.html";
    },
  });
  LeftPanelProjectList.appendChild(projectButton);
  if (!!ProjectsList) {
    let currentprojectID;
    if (typeof projectID == "undefined") {
      currentprojectID = "";
    } else {
      currentprojectID = projectID;
    }
    Object.keys(ProjectsList).forEach((project) => {
      if (project != currentprojectID) {
        projectButton = document.createElement("button");
        Object.assign(projectButton, {
          textContent: ProjectsList[project].name,
          classList: "leftPanelButton",
          onclick: function () {
            loadProject(project);
          },
        });
        LeftPanelProjectList.appendChild(projectButton);
      }
    });
  }
}

//function to load a different projet
function loadProject(project) {
  document.getElementById("showLeftPanelCheckbox").checked = false;
  window.location.href = "./dashboard.html?project=" + project;
}

updateProjectList();
