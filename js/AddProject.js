apiUrl = "https://ihatemoney.org/api/";
const apiUrlProjects = apiUrl + "projects/";
const apiUrlCreateProject = apiUrl + "projects";

//Verifie Connection informations
function VerifieAuthToken(projectID, projectToken) {
  //return true if token/projectID are correct, false if not.
  return fetch(apiUrlProjects + projectID, {
    method: "GET",
    headers: {
      Authorization: `Bearer ` + projectToken,
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
      console.log(data);
      return true;
    })
    .catch((error) => {
      console.error("Error:", error.message);
      return false;
    });
}
//Login page

//log in from code
async function logInByIHMCode() {
  startLoading();
  let projectIDInput = document.getElementById("projectID");
  let projectCodeInput = document.getElementById("projectCode");

  let projectID = projectIDInput.value.trim(); //remove start and end space
  let token = await VerifieAuthCode(projectID, projectCodeInput.value);
  if (!!token) {
    //is true if token is a non null string
    projectIDInput.value = "";
    projectCodeInput.value = "";
    endLoading();
    window.location.href =
      "./dashboard.html?project=" +
      encodeURIComponent(projectID) +
      "&token=" +
      encodeURIComponent(token);
  } else {
    endLoading();
  }
}

//log In from Link
let invitationLink = "";

function getProjectAuth(invitationLink) {
  let invitationURL = new URL(invitationLink);
  let splitedData = invitationURL.pathname.split("/");
  let projectID = splitedData[1];
  let projectToken = splitedData[3];
  return [projectID, projectToken];
}

async function logInByIHMInvitation() {
  startLoading();

  iHMinvitationLink = document.getElementById("IHMinvitationLink");
  iHMinvitationLinkvalue = iHMinvitationLink.value;
  if (
    !iHMinvitationLinkvalue.startsWith("https://") &
    !iHMinvitationLinkvalue.startsWith("http://")
  ) {
    iHMinvitationLinkvalue = "https://" + iHMinvitationLinkvalue;
  }

  //check if it's an invitation link:
  if (
    !/^https?:\/\/ihatemoney\.org\/.+\/join\/.+$/.test(iHMinvitationLinkvalue)
  ) {
    ShowToast("Invitation link not valid", "Red");
    endLoading();

    throw console.error("Invitation link not valid");
    return None;
  }

  projectAuth = getProjectAuth(iHMinvitationLinkvalue);
  let projectID = projectAuth[0];
  let projectToken = projectAuth[1];

  if (await VerifieAuthToken(projectID, projectToken)) {
    iHMinvitationLink.value = "";
    endLoading();
    window.location.href =
      "./dashboard.html?project=" +
      encodeURIComponent(projectID) +
      "&token=" +
      encodeURIComponent(projectToken);
  } else {
    endLoading();
    ShowToast("Invitation link not valid", "Red");
  }
}

//Create projects
function CreateNewProject() {
  //project data fetch
  let projectData = {
    name: document.getElementById("newProjectID").value,
    id: document.getElementById("newProjectID").value,
    password: document.getElementById("newProjectCode").value,
    contact_email: document.getElementById("newProjectEmail").value,
  };
  //Advance Options
  if (document.getElementById("newProjectCurrency").value != "") {
    projectData["default_currency"] = document.getElementById(
      "newProjectCurrency"
    ).value;
  }
  if (document.getElementById("newProjectId").value != "") {
    projectData["id"] = document.getElementById("newProjectId").value;
  }

  if (Object.values(projectData).some((el) => el == "")) {
    ShowToast("Please, fill all required field.", "Red");
    return false;
  }

  //post to create the project
  fetch(apiUrlCreateProject, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projectData),
  })
    .then(async (response) => {
      let response_json = await response.json();
      if (!response.ok) {
        //ShowToast("Failed to create a new project", "Red")
        if (response.status == 400) {
          throw new Error(response_json["id"][0]);
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response_json;
    })
    .then((data) => {
      ShowToast("New project created", "Green");
      if (projectData["id"] != data) {
        ShowToast(
          "The id of your project is " + JSON.stringify(data),
          "Orange"
        );
      }
      // Extract and handle the ID from the response data
      projectData["id"] = data;

      //Login to the project
      document.getElementById("projectID").value = projectData["id"];
      document.getElementById("projectCode").value = projectData["password"];
      logInByIHMCode();
    })
    .catch((error) => {
      ShowToast(error.message, "Red");
      console.error("Error:", error.message);
    });
}

updateCurrencyList(document.getElementById("newProjectCurrency"), "XXX");
