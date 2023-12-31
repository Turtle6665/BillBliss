//
// Side pannel
//

//adding the project list
function updateProjectList(){
  let LeftPanelProjectList = document.getElementById("LeftPanelProjectList");
  LeftPanelProjectList.innerHTML = "";
  ProjectsList = storage.getItem("ProjectsList")
  projectButton = document.createElement("div");
  Object.assign(projectButton, {textContent : "Add projects", classList: "leftPanelButton", style: "--iconURL: url('../assets/icons/AddProjects.svg');", onclick: function(){window.location.href = './AddProject.html';}});
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

updateProjectList();


//
// Main page
//
const apiUrl = 'https://ihatemoney.org/api/projects/'



//Verifie Connection informations
function VerifieAuthToken(projectID, projectToken){
  //return true if token/projectID are correct, false if not.
  return(fetch(apiUrl+projectID, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer `+projectToken,
      'Content-Type': 'application/json',
    }
  })
  .then(response => {
    if (!response.ok) {
      ShowToast("Failed to verifie your credentials.", "Red")
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  }).then(data=>{
    console.log(data)
    return(true)
  })
  .catch(error => {
    console.error('Error:', error.message);
    return(false)
  }))
}

function VerifieAuthCode(projectID, ProjectCode){
  //return Bool (false) if not correct or Token if varification successful
  return(fetch(apiUrl+projectID+"/token",{
    method: 'GET',
    headers: {
      'Authorization': `Basic `+btoa(`${projectID}:${ProjectCode}`),
      'Content-Type': 'application/json',
    }
  })
  .then(response => {
    if (!response.ok) {
      ShowToast("Failed to verifie your credentials.", "Red")
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Extract and handle the token from the response data
    const token = data.token;
    return(token)
  })
  .catch(error => {
    console.error('Error:', error.message);
    return(false)
  }))
}

//Login page

//log in from code
async function logInByIHMCode(){
  startLoading()
  let projectIDInput = document.getElementById("projectID");
  projectIDInput.value = projectIDInput.value.trim(); //remove start and end space
  let projectCodeInput = document.getElementById("projectCode");

  let token = await VerifieAuthCode(projectIDInput.value, projectCodeInput.value)
  if(!!token){//is true if token is a non null string
    let projectID = projectIDInput.value
    projectIDInput.value = "";
    projectCodeInput.value = "";
    endLoading();
    window.location.href = "./dashboard.html?project="+projectID+"&token="+token;
  }else{
    endLoading();
  }
}


//log In from Link
let invitationLink = "";

function getProjectAuth(invitationLink){
  let invitationURL = new URL(invitationLink)
  let splitedData = invitationURL.pathname.split("/");
  let projectID = splitedData[1];
  let projectToken = splitedData[3];
  return([projectID, projectToken])
}

async function logInByIHMInvitation(){
  startLoading()

  iHMinvitationLink = document.getElementById("IHMinvitationLink")
  iHMinvitationLinkvalue = iHMinvitationLink.value;
  if (!iHMinvitationLinkvalue.startsWith("https://")&!iHMinvitationLinkvalue.startsWith("http://")) {
    iHMinvitationLinkvalue = "https://" + iHMinvitationLinkvalue;
  }

  //check if it's an invitation link:
  if(!/^https?:\/\/ihatemoney\.org\/.+\/join\/.+$/.test(iHMinvitationLinkvalue)){
    ShowToast("Invitation link not valid","Red")
    endLoading()

    throw console.error("Invitation link not valid");
    return None;
  }

  projectAuth = getProjectAuth(iHMinvitationLinkvalue);
  let projectID=projectAuth[0] ;
  let projectToken = projectAuth[1] ;

  if(await VerifieAuthToken(projectID, projectToken)){
    iHMinvitationLink.value = "";
    endLoading()
    window.location.href = "./dashboard.html?project="+projectID+"&token="+projectToken;
  }else{
    endLoading()
    ShowToast("Invitation link not valid","Red")
  }
}


//Create projects
function CreateProject(){
  ShowToast("The project creation has not yet been implemented. Please go to IHateMoney to create one before using this interface.","Red")
}
