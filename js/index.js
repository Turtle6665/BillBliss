const apiUrl = 'https://ihatemoney.org/api/projects/'


let invitationLink = "";


function getProjectAuth(invitationLink){
  let invitationURL = new URL(invitationLink)
  let splitedData = invitationURL.pathname.split("/");
  let projectID = splitedData[1];
  let projectToken = splitedData[3];
  return([projectID, projectToken])
}

function accessByInvitation(){
  iHMinvitationLink = document.getElementById("IHMinvitationLink")
  iHMinvitationLinkvalue = iHMinvitationLink.value;
  if (!iHMinvitationLinkvalue.startsWith("https://")&!iHMinvitationLinkvalue.startsWith("http://")) {
    iHMinvitationLinkvalue = "https://" + iHMinvitationLinkvalue;
  }

  //check if it's an invitation link:
  if(!/^https?:\/\/ihatemoney\.org\/.+\/join\/.+$/.test(iHMinvitationLinkvalue)){
    ShowToast("Invitation link not valid","Red")
    throw console.error("Invitation link not valid");
    return None;
  }

  projectAuth = getProjectAuth(iHMinvitationLinkvalue);
  let projectID=projectAuth[0] ;
  let projectToken = projectAuth[1] ;

  iHMinvitationLink.value = "";
  window.location.href = "./dashboard.html?project="+projectID+"&token="+projectToken;
}
