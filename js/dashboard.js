//import LS from "./localStorageAsked.js";
//import settle from "./deptsSettle.js";

//setup values
apiUrl = "https://ihatemoney.org/api/";
let base_apiUrl = apiUrl + "projects/";

//install the service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./serviceWorker.js")
    .then(function (registration) {
      // Registration was successful
      console.log(
        "ServiceWorker registration successful with scope: ",
        registration.scope,
      );
    })
    .catch(function (err) {
      // registration failed :(
      console.log("ServiceWorker registration failed: ", err);
    });
}

//Invitation links
const URLQueryParams = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
// Get the value of "project" in eg "https://example.com/?project=some_value"
let projectID = URLQueryParams.project;
let token = URLQueryParams.token;
if (URLQueryParams.localStorage) {
  storage.acceptLocalStorage();
}

let ProjectsList = storage.getItem("ProjectsList") || {};
if (projectID == "") {
  //to fix issues when the project id is set to "" (via ?project=&)
  projectID = null;
}
if (projectID == null) {
  //if no project selected :
  if (Object.keys(ProjectsList).length >= 1) {
    //select first project if present
    projectID = Object.keys(ProjectsList)[0];
  } else {
    //swap to project creation page if not
    window.location.href = "./AddProject.html";
  }
}

if (!(projectID == null) & !(token == null)) {
  //adding the projects token to localStorage
  ProjectsList[projectID] = { token: token };
  storage.setItem("ProjectsList", ProjectsList);
  bc.postMessage(["updateProjectList"]);
  //window.location.search = "?project="+projectID
  history.replaceState("", "", "?project=" + projectID);
} else if (
  !(projectID == null) &
  (token == null) &
  !(ProjectsList[projectID] == null)
) {
  token = ProjectsList[projectID]["token"];
} else if (
  !(projectID == null) &
  (token == null) &
  (ProjectsList[projectID] == null)
) {
  // the case when the Storage doesn't have the data, sync accros browser windows
  bc.postMessage(["syncProjectList"]);
  async function waitForSyncProjectList() {
    ProjectsList = storage.getItem("ProjectsList") || {};
    let i = 0
    while (!(ProjectsList[projectID])) {
      i = i + 1
      await sleep(1000*i^2); //make the sync exponentially longer
      ProjectsList = storage.getItem("ProjectsList") || {};
    }
    token = ProjectsList[projectID]["token"];
    //reload the page once the sync is performed
    document.location.href = document.location.href;
  }

  waitForSyncProjectList();
}

let apiUrl_Project = base_apiUrl + projectID;

//Get the informations of the project
let info = null;
let memberIDs = {};
let memberNames = {};
let memberTrueActivated = {}; //members are "TrueActivated" if they are truly activated (= referenced as is on the server)
let memberActivated = {}; //members are "activated" if they are truly activated or deactivated but a ballance different than 0

function updateInfo() {
  return fetch(apiUrl_Project, {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        return response.json(); // Parse the response JSON
      } else {
        throw new Error(
          "Failed to fetch information. Please check your credentials.",
        );
      }
    })
    .then((data) => {
      info = data;
      // Update the 'information' div with the project data
      // Update individual div elements with project data
      document.getElementById("projectName").textContent = data.name;
      ProjectsList = storage.getItem("ProjectsList");
      ProjectsList[projectID]["name"] = data.name;
      storage.setItem("ProjectsList", ProjectsList);
      bc.postMessage(["updateProjectList"]);
      document.getElementById("contactEmail").textContent = data.contact_email;
      document.getElementById("currency").textContent = data.default_currency;
      //set the project name in the title
      document
        .getElementById("NavigationTitle")
        .getElementsByTagName("H1")[0].textContent = data.name;
      document.title = "BillBliss | " + data.name;

      // Create a list of members
      const membersList = document.getElementById("membersList");
      memberIDs = {}; //Reset member list
      memberNames = {};
      memberTrueActivated = {};
      memberActivated = {};
      membersList.innerHTML = "";
      data.members
        .sort((a, b) => {
          return a.name > b.name;
        })
        .forEach((member) => {
          memberIDs[member.name] = member.id;
          memberNames[member.id] = member.name;
          memberTrueActivated[member.id] = member.activated;
          memberActivated[member.id] = !(
            !member.activated && Math.abs(member.balance) <= 0.01
          );
          const memberDiv = document.createElement("div");
          let weight = member.weight != 1 ? "(" + member.weight + "x) " : "";
          Object.assign(memberDiv, {
            textContent: member.name,
            id: member.id,
            onclick: function () {
              editMember(member.id);
            },
            style: "cursor: pointer;",
          });
          memberDiv.setAttribute("weight", weight);
          let img_edit = document.createElement("img");
          Object.assign(img_edit, {
            src: "assets/pen.svg",
            style: "height:0.8em; display:inline-block; margin:auto auto;",
          });
          memberDiv.appendChild(img_edit);
          if (memberActivated[member.id]) {
            if (!memberTrueActivated[member.id]) {
              memberDiv.classList.add("deactivated");
            }
            membersList.appendChild(memberDiv);
          }
        });
    })
    .catch((error) => {
      ShowToast(error, "Red");
      console.error("Error:", error);
    });
}

//get the bills
let allbills = null;
function updateBills() {
  return fetch(apiUrl_Project + "/bills", {
    method: "GET",
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => {
      if (response.status === 200) {
        return response.json(); // Parse the response JSON
      } else {
        ShowToast(
          "Failed to fetch bills. Please check your credentials.",
          "Red",
        );
        throw new Error(
          "Failed to fetch bills. Please check your credentials.",
        );
      }
    })
    .then((bills) => {
      const billsList = document.getElementById("bills_list");
      billsList.innerHTML = "";
      //for(let i = 0; i<50; i++){bills[bills.length+1] = bills[0]}
      allbills = bills;
      bills.forEach((bill) => {
        const billdiv = document.createElement("div");
        Object.assign(billdiv, {
          classList: "billdiv",
          id: "bill~" + bill.id,
          onclick: function () {
            editBill(bill.id);
          },
        });
        const name = document.createElement("div");
        Object.assign(name, { textContent: bill.what, classList: "billWhat" });
        billdiv.appendChild(name);
        const price = document.createElement("div");
        Object.assign(price, {
          textContent: amountToText(bill.amount, bill.original_currency),
          classList: "billAmount",
        });
        billdiv.appendChild(price);
        const payer = document.createElement("div");
        Object.assign(payer, {
          textContent: "payed by ",
          classList: "billPayer",
        });
        const payerName = document.createElement("strong");
        payerName.textContent = memberNames[bill.payer_id];
        payer.appendChild(payerName);
        billdiv.appendChild(payer);
        const date = document.createElement("div");
        Object.assign(date, { textContent: bill.date, classList: "billDate" });
        billdiv.appendChild(date);
        billsList.appendChild(billdiv);
      });
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

//get the settlement
let stats = null;
function updateSummary() {
  balances = info.members.reduce((a, b) => {
    a.push([b.id, b.balance]);
    return a;
  }, []);

  //add the BarPlot
  balances_sorted = balances.sort((a, b) => {
    return memberNames[a[0]] > memberNames[b[0]];
  });
  balances_sorted = balances_sorted.filter((a) => memberActivated[a[0]]);
  //balanceByID = stats.reduce((one,nex)=>{one[nex.member.id] = nex.balance; return one}, {});
  maxBalance = balances_sorted.reduce((one, nex) => {
    return Math.max(Math.abs(one), Math.abs(nex[1]));
  }, 0);
  maxBalance = maxBalance == 0 ? 0.01 : maxBalance;
  const BalanceTree = document.getElementById("balance_tree");
  BalanceTree.innerHTML = "";
  balances_sorted.forEach((member) => {
    const memberBranch = document.createElement("div");
    const memberName = document.createElement("div");
    const memberLeaf = document.createElement("div");
    const memberLeafContained = document.createElement("div");
    const Leafwidth = Math.abs(member[1] / maxBalance) * 50;
    const leafMargin = member[1] >= 0 ? 0 : 50 - Leafwidth;
    Object.assign(memberName, {
      textContent: memberNames[member[0]],
      classList: "memberName",
    });
    Object.assign(memberLeaf, {
      classList: "memberLeaf",
      style: `width : ${Leafwidth}%; margin-left: ${leafMargin}%`,
    });
    Object.assign(memberLeafContained, {
      textContent: amountToText(member[1], info.default_currency),
      classList: "memberLeafContained",
    });
    memberLeaf.appendChild(memberLeafContained);
    if (member[1] >= 0) {
      Object.assign(memberBranch, { classList: "memberBranch positiveMB" });
      memberBranch.appendChild(memberName);
      memberBranch.appendChild(memberLeaf);
    } else {
      Object.assign(memberBranch, { classList: "memberBranch NegativeMB" });
      memberBranch.appendChild(memberLeaf);
      memberBranch.appendChild(memberName);
    }
    BalanceTree.appendChild(memberBranch);
  });

  //add the settlements
  const settlements = settle(balances);
  const settlementslist = document.getElementById("settlements_list");
  settlementslist.innerHTML = "";
  settlements.forEach((transfer) => {
    const settlementdiv = document.createElement("div");
    Object.assign(settlementdiv, {
      classList: "settlementdiv",
      onclick: () => {
        addBill({
          what: "Payback",
          much: transfer[1],
          who: transfer[0],
          whom: [transfer[2]],
        });
      },
    });
    const settlementNames = document.createElement("div");
    Object.assign(settlementNames, {
      classList: "settlementNames",
      textContent: `${memberNames[transfer[0]]} pays ${memberNames[transfer[2]]}`,
    });
    const settlementAmount = document.createElement("div");
    Object.assign(settlementAmount, {
      classList: "settlementAmount",
      textContent: amountToText(transfer[1], info.default_currency),
    });

    settlementdiv.appendChild(settlementNames);
    settlementdiv.appendChild(settlementAmount);
    settlementslist.appendChild(settlementdiv);
  });
}

//functions about members
function addMember() {
  const newMemberData = {
    name: document.getElementById("addMemberInput").value,
  };
  return fetch(apiUrl_Project + "/members", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newMemberData),
  })
    .then(async (response) => {
      respJson = await response.json();
      if (response.status === 201) {
        ShowToast("New member added successfully.", "Green");
        console.log("New member added successfully.");
        updateInfo();
        document.getElementById("addMemberInput").value = "";
      } else {
        for (field in respJson) {
          ShowToast(
            "Failed to add member. " + field + ": " + respJson[field],
            "Red",
          );
        }
        throw new Error(response);
      }
    })
    .catch((error) => {
      console.error("Error adding new member:", error);
    });
}

//function to show the edit membertab
function editMember(memberID) {
  document.getElementById("editMemberInput").value = memberNames[memberID];
  document
    .getElementById("editMemberDiv")
    .getElementsByTagName("button")[1].onclick = function () {
    pushEditedMember(memberID);
  };
  document
    .getElementById("editMemberDiv")
    .getElementsByTagName("button")[3].onclick = function () {
    removeMember(memberID);
  };
  document
    .getElementById("editMemberDiv")
    .getElementsByTagName("button")[4].onclick = function () {
    pushEditedMember(memberID, true);
  };
  document.getElementById("editMemberPage").classList.remove("hidden");
  if (memberTrueActivated[memberID]) {
    document
      .getElementById("editMemberDiv")
      .getElementsByTagName("button")[3]
      .classList.remove("hidden"); //show the remove button
    document
      .getElementById("editMemberDiv")
      .getElementsByTagName("button")[4]
      .classList.add("hidden"); //hide the reactivate button
  } else {
    document
      .getElementById("editMemberDiv")
      .getElementsByTagName("button")[3]
      .classList.add("hidden"); //hide the remove button
    document
      .getElementById("editMemberDiv")
      .getElementsByTagName("button")[4]
      .classList.remove("hidden"); //show the reactivate button
  }
  document.getElementById("editMemberInput").focus();
}

function pushEditedMember(memberID, memberActiv = "", updateall = true) {
  //if memberActiv is set to true (to reactivate the member), the name is set to be the previus one, and not the one written
  name = document.getElementById("editMemberInput").value;
  let MemberInputData = {
    name: name,
    activated: memberTrueActivated[memberID],
  };
  if (memberActiv != "") {
    MemberInputData["activated"] = memberActiv;
    MemberInputData["name"] = memberNames[memberID];
  }
  return fetch(apiUrl_Project + "/members/" + memberID, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(MemberInputData),
  })
    .then(async (response) => {
      respJson = await response.json();
      if (response.status === 200) {
        if (memberActiv == true) {
          ShowToast(memberNames[memberID] + " reactivated.", "Green");
        } else {
          ShowToast(
            memberNames[memberID] + "'s informations updated.",
            "Green",
          );
        }
        document.getElementById("editMemberPage").classList.add("hidden");
        if (updateall) {
          updateAll();
        }
        return respJson; // Parse the response JSON
      } else if (response.status === 400) {
        console.log(respJson, response);
        for (field in respJson) {
          ShowToast(
            "Failed to update member. Please check the field '" + field + "'.",
            "Red",
          );
        }
        throw new Error(
          "Failed to Update member. Please check your input values.",
        );
      } else {
        throw new Error(
          "Failed to Update Member. Please check your credentials.",
        );
      }
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function removeMember(memberID, updateall = true) {
  //it removes if the member has no bills. It it has, the member is deactivated
  return fetch(apiUrl_Project + "/members/" + memberID, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => {
      //console.log(response)
      if (response.status === 200) {
        return response.json(); // Parse the response JSON
      } else {
        throw new Error(
          "Failed to remove the member. Please check your credentials.",
        );
      }
    })
    .then((data) => {
      ShowToast(memberNames[memberID] + " deactivated.", "Green");
      if (updateall) {
        document.getElementById("editMemberPage").classList.add("hidden");
        updateAll();
      }
      //document.getElementById('newBillPage').classList.add('hidden');
    })
    .catch((error) => {
      ShowToast(error, "Red");
    });
}

//edit the bills
function editBill(BillID) {
  //console.log(BillID);
  const bill = allbills.filter((bill) => {
    return bill.id === BillID;
  })[0]; //select the bill
  addBill({
    edit: true,
    BillID: bill.id,
    what: bill.what,
    much: bill.amount,
    date: bill.date,
    who: bill.payer_id,
    whom: bill.owers.reduce((a, b) => a.concat(b.id), []),
    currency: bill.original_currency,
    external_link: bill.external_link,
  });
}

let lastwho = ""; //a variable that stores the last person used as the payer

// show the pannel to add a new bill/edit an old one
function addBill({
  edit = false,
  BillID = "",
  what = "",
  much = "",
  date = "",
  who = "",
  whom = "",
  currency = "",
  external_link = "",
} = {}) {
  document.getElementById("newBillPage").classList.remove("hidden");
  document.getElementById("bill-when").focus();
  document.getElementById("bill-when").value =
    date == "" ? new Date().toISOString().split("T")[0] : date; //select the provided date and if no, the current date
  document.getElementById("bill-what").value = what;
  document.getElementById("bill-much").value = much;

  const who_input = document.getElementById("bill-who");
  who_input.innerHTML = "";
  const forWhom = document.getElementById("bill-forWhom");
  forWhom.innerHTML = "";
  info.members
    .sort((a, b) => {
      return a.name > b.name;
    })
    .forEach((member) => {
      //adding all member to who
      const memberSelect = document.createElement("option");
      Object.assign(memberSelect, {
        textContent: memberNames[member.id],
        value: member.id,
        id: "who~" + member.id,
        disabled: !memberActivated[member.id],
      });
      if (edit & (who == member.id) || memberActivated[member.id]) {
        who_input.appendChild(memberSelect);
      }
      //adding all member to whom
      const memberDiv = document.createElement("div");
      memberDiv.onclick = function () {
        SelectforWhom(member.id);
      };
      const memberInput = document.createElement("input");
      Object.assign(memberInput, {
        type: "checkbox",
        id: "whom~" + member.id,
        name: "whom~" + member.id,
        checked: true,
        disabled: !memberActivated[member.id],
      });
      memberInput.onclick = function () {
        SelectforWhom(member.id);
      };
      const memberLabel = document.createElement("label");
      memberLabel.onclick = function () {
        SelectforWhom(member.id);
      };
      Object.assign(memberLabel, {
        htmlFor: "whom~" + member.id,
        textContent: memberNames[member.id],
      });
      if (edit & whom.includes(member.id) || memberActivated[member.id]) {
        forWhom.appendChild(memberDiv);
        memberDiv.appendChild(memberInput);
        memberDiv.appendChild(memberLabel);
      }
    });
  who_input.value = who == "" ? lastwho : who; //select same as last for who payed the bill or the who if provided
  if (whom != "") {
    [
      ...document.getElementById("bill-forWhom").getElementsByTagName("input"),
    ].forEach((option) => {
      option.checked = false;
    }); //reset all checked
    whom.forEach((memberid) => {
      document.getElementById("whom~" + memberid).checked = true;
    }); //select only the required checked
  }
  // change the buttons if we edit a bill rather than creating a new one
  if (edit) {
    [...document.getElementsByClassName("editBill")].forEach((buttons) => {
      buttons.classList.remove("hidden");
    });
    [...document.getElementsByClassName("newBill")].forEach((buttons) => {
      buttons.classList.add("hidden");
    });
    document.getElementById("btn-UpdateBill").onclick = function () {
      pushEditedBill(BillID);
    };
    document.getElementById("btn-RemoveBill").onclick = function () {
      removeBill(BillID);
    };
  } else {
    [...document.getElementsByClassName("editBill")].forEach((buttons) => {
      buttons.classList.add("hidden");
    });
    [...document.getElementsByClassName("newBill")].forEach((buttons) => {
      buttons.classList.remove("hidden");
    });
  }
}

//make the button SelectAll and SelectNone
function SelectforWhom(SelectAll) {
  //SelectAll [id/bool] : if id, invert the one, if true, all selected, if false, none selected
  if (typeof SelectAll == "boolean") {
    [
      ...document.getElementById("bill-forWhom").getElementsByTagName("input"),
    ].forEach((memberCheck) => {
      if (!memberCheck.disabled) {
        memberCheck.checked = SelectAll;
      }
    });
  } else {
    let inp = document.getElementById("whom~" + SelectAll);
    if (!inp.disabled) {
      inp.checked = !inp.checked;
    }
  }
}

//push the bill to the server
let lastbillID = 0;
function pushNewBill(addNew = false) {
  startLoading();
  const billInputData = [
    ...document.getElementById("newBillPage").getElementsByTagName("input"),
    ...document.getElementById("newBillPage").getElementsByTagName("select"),
  ].reduce(
    (one, nex) => {
      if (nex.type === "checkbox") {
        if (nex.checked & !nex.disabled) {
          one["payed_for"].push(nex.name.split("~")[1]);
        }
      } else {
        one[nex.name.split("-")[1]] = nex.value;
      }
      return one;
    },
    { payed_for: [] },
  );
  const memberToActivate = [
    ...new Set(billInputData.payed_for.concat(billInputData.payer)),
  ].filter((id) => !memberTrueActivated[id]);
  let activateMember = memberToActivate.reduce((allmempush, memberID) => {
    return allmempush.concat(pushEditedMember(memberID, true, false));
  }, []);

  return Promise.all(activateMember)
    .then((a) => {
      return fetch(apiUrl_Project + "/bills", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billInputData),
      })
        .then(async (response) => {
          //console.log(response)
          respJson = await response.clone().json();
          if (response.status === 201) {
            return; // Parse the response JSON
          } else if (response.status === 400) {
            for (field in respJson) {
              ShowToast(
                "Failed to update bills. Please check the field '" +
                  field +
                  "'",
                "Red",
              );
            }
            throw new Error(
              "Failed to Update bills. Please check your input values.",
            );
          } else {
            throw new Error(
              "Failed to fetch bills. Please check your credentials.",
            );
          }
        })
        .then((data) => {
          lastbillID = data;
          lastwho = billInputData["payer"];
        })
        .catch((error) => {
          console.log(error);
          return false;
        });
    })
    .then((a) => {
      if (a === false) {
        endLoading();
        return a;
      }
      activateMember = memberToActivate.reduce((allmempush, memberID) => {
        return allmempush; // allmempush.concat(removeMember(memberID, false))
      }, []);
      return Promise.all(activateMember).then((a) => {
        endLoading();
        ShowToast("New bill added.", "Green");
        updateAll();
        document.getElementById("newBillPage").classList.add("hidden");
        if (addNew) {
          addBill();
        }
      });
    })
    .catch((error) => {
      endLoading();
      activateMember = memberToActivate.reduce((allmempush, memberID) => {
        return allmempush; //allmempush.concat(removeMember(memberID, false))
      }, []);
    });
}

//push the edits made for a bill
function pushEditedBill(billID) {
  const billInputData = [
    ...document.getElementById("newBillPage").getElementsByTagName("input"),
    ...document.getElementById("newBillPage").getElementsByTagName("select"),
  ].reduce(
    (one, nex) => {
      if (nex.type === "checkbox") {
        if (nex.checked) {
          // & !nex.disabled
          one["payed_for"].push(nex.name.split("~")[1]);
        }
      } else {
        one[nex.name.split("-")[1]] = nex.value;
      }
      return one;
    },
    { payed_for: [] },
  );

  const memberToActivate = [
    ...new Set(billInputData.payed_for.concat(billInputData.payer)),
  ].filter((id) => (id != "") & !memberTrueActivated[id]);
  let activateMember = memberToActivate.reduce((allmempush, memberID) => {
    return allmempush.concat(pushEditedMember(memberID, true, false));
  }, []);

  return Promise.all(activateMember)
    .then((data) => {
      return fetch(apiUrl_Project + "/bills/" + billID, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billInputData),
      })
        .then(async (response) => {
          //console.log(response)
          respJson = await response.json();
          if (response.status === 200) {
            return respJson; // Parse the response JSON
          } else if (response.status === 400) {
            for (field in respJson) {
              ShowToast(
                "Failed to update bills. Please check the field '" +
                  field +
                  "'",
                "Red",
              );
            }
            throw new Error("Failed to update bills.");
          } else {
            ShowToast(
              "Failed to Update bills. Please check your credentials.",
              "Red",
            );
            throw new Error(
              "Failed to Update bills. Please check your credentials.",
            );
          }
        })
        .then((data) => {
          lastbillID = data;
          lastwho = billInputData["payer"];
          return true;
        })
        .catch((error) => {
          console.log(error);
          return false;
        });
    })
    .then((a) => {
      //console.log(a)
      if (a === false) {
        endLoading();
        return a;
      }
      activateMember = memberToActivate.reduce((allmempush, memberID) => {
        return allmempush; // to reduce latency and some unknown bugs, the users are only reactivated and not redeactivated. old : allmempush.concat(removeMember(memberID, false))
      }, []);
      return Promise.all(activateMember).then((a) => {
        console.log("ok", a);
        ShowToast("Bill updated.", "Green");
        endLoading();
        updateAll();
        document.getElementById("newBillPage").classList.add("hidden");
      });
    })
    .catch((error) => {
      console.log(error);
      //endLoading();
      //activateMember = memberToActivate.reduce((allmempush,memberID)=>{
      //  return allmempush.concat(removeMember(memberID, false))
      //}, []);
    });
}

function removeBill(billID) {
  return fetch(apiUrl_Project + "/bills/" + billID, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + token,
    },
  })
    .then((response) => {
      //console.log(response)
      if (response.status === 200) {
        return response.json(); // Parse the response JSON
      } else {
        ShowToast(
          "Failed to remove the bill. Please check your credentials.",
          "Red",
        );
        throw new Error(
          "Failed to Update bills. Please check your credentials.",
        );
      }
    })
    .then((data) => {
      ShowToast("Bill removed successfully.", "Green");
      updateAll();
      document.getElementById("newBillPage").classList.add("hidden");
    });
}

//adding the project list
function updateProjectList() {
  let LeftPanelProjectList = document.getElementById("LeftPanelProjectList");
  LeftPanelProjectList.innerHTML = "";
  ProjectsList = storage.getItem("ProjectsList");
  projectButton = document.createElement("div");
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
    Object.keys(ProjectsList).forEach((project) => {
      if (project != projectID) {
        projectButton = document.createElement("div");
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

//go to project invitation page
function toShareProject() {
  //show the page
  document.getElementById("shareProject").classList.remove("hidden");
  document.getElementById("showLeftPanelCheckbox").checked = false;
  //update the informations

  //invitation links
  ShareInvitationLinkDiv = document.getElementById("ShareInvitationLinkDiv");
  ShareInvitationLinkDiv.innerHTML = "";
  ShareInvitationLink =
    window.location.origin +
    window.location.pathname +
    "?project=" +
    projectID +
    "&token=" +
    token;
  sharedLinkA = document.createElement("a");
  Object.assign(sharedLinkA, {
    textContent: ShareInvitationLink,
    href: ShareInvitationLink,
  });
  sharedLinkBr = document.createElement("br");
  SharedQRcode = new QRCode({
    msg: ShareInvitationLink,
    pal: ["#000000", "#ffffff"],
  });
  ShareInvitationLinkDiv.appendChild(sharedLinkA);
  ShareInvitationLinkDiv.appendChild(sharedLinkBr);
  ShareInvitationLinkDiv.appendChild(SharedQRcode);

  //invitation ProjectID
  SharedProjectID = document.getElementById("SharedProjectID");
  Object.assign(SharedProjectID, {
    textContent: projectID,
    href: window.location.href,
  });
}

//go to edit project page
function toEditProject() {
  //show the page
  document.getElementById("editProject").classList.remove("hidden");
  document.getElementById("showLeftPanelCheckbox").checked = false;
  // reset the remove form text and functions
  document
    .getElementById("RemoveProjectForm")
    .setAttribute("onsubmit", "event.preventDefault(); DeleteProject(false)");
  document.getElementById("DeleteProjectSubmit").innerText = "Delete project";

  //update the informations
  document.getElementById("EditProjectName").value = info.name;
  document.getElementById("EditProjectMail").value = info.contact_email;
  document.getElementById("EditProjectCode").value = "";
  document.getElementById("EditCurrentProjectCode").value = "";
  document.getElementById("DeleteProjectCode").value = "";
  updateCurrencyList(
    document.getElementById("EditProjectCurrency"),
    info.default_currency,
  );
}

//Edit project settings
function EditProject() {
  // function to edit projects based on user inputed values
  startLoading();
  let projectData = {
    current_password: document.getElementById("EditCurrentProjectCode").value,
    name: document.getElementById("EditProjectName").value,
    contact_email: document.getElementById("EditProjectMail").value,
    logging_preference: info.logging_preference,
    default_currency: document.getElementById("EditProjectCurrency").value,
  };
  let NewProjectCode = document.getElementById("EditProjectCode").value;
  let isNewToken = false;
  if (NewProjectCode != "") {
    projectData["password"] = NewProjectCode;
    isNewToken = true;
  }
  fetch(apiUrl_Project, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(projectData),
  })
    .then(async (response) => {
      let response_json = await response.json();
      if (!response.ok) {
        if (response.status == 400) {
          for (field in response_json) {
            ShowToast(field + ": " + response_json[field], "Red");
          }
          throw new Error("Project data has not been updated");
        }
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response_json;
    })
    .then(async (data) => {
      if (!isNewToken) {
        ShowToast("Project settings updated", "Green");
        updateAll();
        document.getElementById("editProject").classList.add("hidden");
      } else {
        // Reset Auth token
        ShowToast(
          "Project settings updated. Fetching new auth token...",
          "Green",
        );
        let token = await VerifieAuthCode(projectID, NewProjectCode);
        if (!!token) {
          //is true if token is a non null string
          endLoading();
          window.location.href =
            "./dashboard.html?project=" +
            encodeURIComponent(projectID) +
            "&token=" +
            encodeURIComponent(token);
        } else {
          throw new Error("New token could not be fetched");
        }
      }
    })
    .catch((error) => {
      //show toast and save in log
      ShowToast(error.message, "Red");
      console.error("Error:", error.message);
      endLoading();
    });
}

//Delete a project from a disctance server
function DeleteProject(validated) {
  // function to delect a project from distance server
  // if validated == false, it asks for a validation
  // if validated == true, it delets the project from the distance server and the local storage
  if (!validated) {
    ShowToast(
      "Are you sure you want to delete the project?\
               This action can not be undone!",
      "Orange",
    );
    document
      .getElementById("RemoveProjectForm")
      .setAttribute("onsubmit", "event.preventDefault(); DeleteProject(true)");
    document.getElementById("DeleteProjectSubmit").innerText = "Are you sure?";
  } else {
    startLoading();
    let ProjectCode = document.getElementById("DeleteProjectCode").value;

    fetch(apiUrl_Project, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ` + btoa(`${projectID}:${ProjectCode}`),
      },
    })
      .then(async (response) => {
        let response_json = await response.json();
        if (!response.ok) {
          if (response.status == 401) {
            throw new Error("Project password is not correct");
          }
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response_json;
      })
      .then((data) => {
        ShowToast("Project successfully removed", "Green");
        //remove from Storage
        storage.removeSubItem("ProjectsList", projectID, true);
        //update the project list on all the other oppened pages (using bc from "localStorageAsked.js"
        bc.postMessage(["updateProjectList"]);
        window.location.search = "";
      })
      .catch((error) => {
        // reset the remove form text and functions
        document
          .getElementById("RemoveProjectForm")
          .setAttribute(
            "onsubmit",
            "event.preventDefault(); DeleteProject(false)",
          );
        document.getElementById("DeleteProjectSubmit").innerText =
          "Delete project";
        //show in toast and save in log
        ShowToast(error.message, "Red");
        console.error("Error:", error.message);
        endLoading();
      });
  }
}

//function to render amoney
function amountToText(amount, currency) {
  function round(v) {
    //to properly round negative value + round to 10E-2
    v = v * 100;
    return ((v >= 0 || -1) * Math.round(Math.abs(v))) / 100;
  }
  amount = round(amount).toFixed(2);
  if (currency == "EUR") {
    currency = "€";
  } else if (currency == "XXX") {
    return `${amount}`;
  }
  return `${amount} ${currency}`;
}

//the function to update all the page
function updateAll() {
  startLoading();
  updateProjectList();
  if (token != null && projectID != null) {
    updateInfo().then((t) => {
      const r1 = updateBills();
      const r2 = updateSummary();
      Promise.all([r1, r2]).then((resp) => {
        console.log("Alldata Updated");
        endLoading();
      });
    });
  } else {
    console.log("your token and/or project ID are not given");
    ShowToast("Your token and/or project ID are not given.", "Red");
  }
}

//function to load a different projet
function loadProject(project) {
  document.getElementById("showLeftPanelCheckbox").checked = false;
  window.location.search = "?project=" + project;
}

//the main run for all
updateAll();
