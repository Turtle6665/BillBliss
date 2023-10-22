
// JS for the layout



const URLQueryParams = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
// Get the value of "project" in eg "https://example.com/?project=some_value"
let projectID = URLQueryParams.project;
let token = URLQueryParams.token;

const apiUrl = 'https://ihatemoney.org/api/projects/'+projectID;

//Get the informations of the project
let info=null;
let memberIDs = {};
let memberNames = {};
let memberTrueActivated = {}; //members are "TrueActivated" if they are truly activated (= referenced as is on the server)
let memberActivated = {}; //members are "activated" if they are truly activated or deactivated but a ballance different than 0
function updateInfo(){
  return fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(response => {
      if (response.status === 200) {
          return response.json(); // Parse the response JSON
      } else {
          throw new Error('Failed to fetch information. Please check your credentials.');
      }
  })
  .then(data => {
    info = data
    // Update the 'information' div with the project data
    // Update individual div elements with project data
    document.getElementById('projectName').textContent = data.name;
    document.getElementById('contactEmail').textContent = data.contact_email;
    document.getElementById('currency').textContent = data.default_currency;

    // Create a list of members
    const membersList = document.getElementById('membersList');
    memberIDs = {}; //Reset member list
    memberNames = {};
    memberTrueActivated = {};
    memberActivated = {};
    membersList.innerHTML = '';
    data.members.forEach(member => {
      memberIDs[member.name] = member.id;
      memberNames[member.id] = member.name;
      memberTrueActivated[member.id] = member.activated
      memberActivated[member.id] = !(!member.activated&&(Math.abs(member.balance)<=0.01));
      const memberDiv = document.createElement('div');
      Object.assign(memberDiv, {"textContent":member.name,"id":member.id, "onclick":function() {editMember(member.id)}, "style":"cursor: pointer;"})
      let img_edit = document.createElement('img');
      Object.assign(img_edit, {"src":"pen.svg", "style":"height:0.8em; display:inline-block; margin:auto auto;"})
      memberDiv.appendChild(img_edit);
      if(memberActivated[member.id]){
        membersList.appendChild(memberDiv);
      };
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

//get the bills
let allbills=null
function updateBills(){
  return fetch(apiUrl+"/bills", {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  })
  .then(response => {
      if (response.status === 200) {
          return response.json(); // Parse the response JSON
      } else {
          throw new Error('Failed to fetch bills. Please check your credentials.');
      }
  })
  .then(bills => {
    const billsList = document.getElementById("bills_list")
    billsList.innerHTML = '';
    //for(let i = 0; i<50; i++){bills[bills.length+1] = bills[0]}
    allbills = bills;
    bills.forEach(bill => {
        const billdiv = document.createElement('div');
        Object.assign(billdiv, {"classList":"billdiv","id":"bill~"+bill.id, "onclick":function(){editBill(bill.id)}});
        const name = document.createElement("div");
        Object.assign(name, {"textContent":bill.what, "classList":"billWhat"});
        billdiv.appendChild(name);
        const price = document.createElement("div");
        Object.assign(price, {"textContent":amountToText(bill.amount, bill.original_currency), "classList":"billAmount"});
        billdiv.appendChild(price);
        const payer = document.createElement("div");
        Object.assign(payer, {"textContent":"payed by ", "classList":"billPayer"});
        const payerName = document.createElement("strong");
        payerName.textContent = memberNames[bill.payer_id]
        payer.appendChild(payerName)
        billdiv.appendChild(payer);
        const date = document.createElement("div");
        Object.assign(date, {"textContent":bill.date, "classList":"billDate"});
        billdiv.appendChild(date);
        billsList.appendChild(billdiv);
    });
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

//get the settlement
let stats = null
function updateSummary(){
  balances = info.members.reduce((a,b)=>{a.push([b.id, b.balance]); return a},[])

  //add the BarPlot
  balances_sorted = balances.sort((a,b)=>{return memberNames[a[0]] > memberNames[b[0]]});
  balances_sorted = balances_sorted.filter(a => memberActivated[a[0]])
  //balanceByID = stats.reduce((one,nex)=>{one[nex.member.id] = nex.balance; return one}, {});
  maxBalance = balances_sorted.reduce((one,nex)=>{return Math.max(Math.abs(one),Math.abs(nex[1]))}, 0);
  maxBalance = maxBalance==0? 0.01 : maxBalance;
  const BalanceTree = document.getElementById("balance_tree")
  BalanceTree.innerHTML = "";
  balances_sorted.forEach(member => {
    const memberBranch = document.createElement("div")
    const memberName = document.createElement("div")
    const memberLeaf = document.createElement("div")
    const memberLeafContained = document.createElement("div")
    const Leafwidth = Math.abs(member[1] / maxBalance)*50
    const leafMargin = member[1] >=0? 0 : 50 - Leafwidth
    Object.assign(memberName, {"textContent": memberNames[member[0]], "classList":"memberName"})
    Object.assign(memberLeaf, {"classList":"memberLeaf", "style":`width : ${Leafwidth}%; margin-left: ${leafMargin}%`})
    Object.assign(memberLeafContained, {"textContent": amountToText(member[1], info.default_currency), "classList" : "memberLeafContained"})
    memberLeaf.appendChild(memberLeafContained);
    if(member[1] >= 0){
      Object.assign(memberBranch, {"classList":"memberBranch positiveMB"})
      memberBranch.appendChild(memberName);
      memberBranch.appendChild(memberLeaf);
    }else{
      Object.assign(memberBranch, {"classList":"memberBranch NegativeMB"})
      memberBranch.appendChild(memberLeaf);
      memberBranch.appendChild(memberName);
    };
    BalanceTree.appendChild(memberBranch)
  });

  //add the settlements
  const settlements = settle(balances)
  const settlementslist = document.getElementById("settlements_list");
  settlementslist.innerHTML = "";
  settlements.forEach(transfer => {
    const settlementdiv = document.createElement("div");
    Object.assign(settlementdiv, {"classList":"settlementdiv", "onclick":()=>{addBill({what:"payback", much:transfer[1], who:transfer[0],whom:[transfer[2]]})}});
    const settlementNames = document.createElement("div");
    Object.assign(settlementNames, {"classList":"settlementNames", "textContent":`${memberNames[transfer[0]]} pays ${memberNames[transfer[2]]}`});
    const settlementAmount = document.createElement("div");
    Object.assign(settlementAmount, {"classList":"settlementAmount", "textContent":amountToText(transfer[1], info.default_currency)});

    settlementdiv.appendChild(settlementNames);
    settlementdiv.appendChild(settlementAmount);
    settlementslist.appendChild(settlementdiv);
  });
}

//functions about members
function addMember(){
  const newMemberData = {
        "name": document.getElementById("addMemberInput").value
    };
  return fetch(apiUrl+ "/members", {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newMemberData)
  }).then(response => {
    if (response.status === 201) {
      console.log('New member added successfully.');
      updateInfo();
      document.getElementById("addMemberInput").value = ""
    } else {
      console.error('Error adding new member:', response.status);
    }
  }).catch(error => {
    console.error('Error:', error);
  });
}

//function to show the edit membertab
function editMember(memberID){
  document.getElementById("editMemberInput").value = memberNames[memberID];
  document.getElementById("editMemberDiv").getElementsByTagName("button")[0].onclick = function(){pushEditedMember(memberID);};
  document.getElementById("editMemberDiv").getElementsByTagName("button")[2].onclick = function(){removeMember(memberID);};
  document.getElementById("editMemberPage").classList.remove("hidden");
  document.getElementById("editMemberInput").focus();
}

function pushEditedMember(memberID, memberActiv = "", updateall=true){
  name = document.getElementById("editMemberInput").value
  let MemberInputData = {
    "name" : name==""? memberNames[memberID]:name
  }
  if (memberActiv !=""){
    MemberInputData["activated"] = memberActiv
  }
  return fetch(apiUrl+"/members/"+memberID,{
    method : "PUT",
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body : JSON.stringify(MemberInputData)
  }).then(response =>{
    if (response.status === 200) {
      document.getElementById("editMemberPage").classList.add("hidden");
      if(updateall){updateAll();}
      return response.json(); // Parse the response JSON
    }else if(response.status === 400){
      throw new Error('Failed to Update member. Please check your input values.')
    }else{
      throw new Error('Failed to Update Member. Please check your credentials.')
    }
  }).catch(error => {
    console.error('Error:', error);
  });
};

function removeMember(memberID, updateall=true){
  //it removes if the member has no bills. It it has, the member is deactivated
  return fetch(apiUrl+"/members/"+memberID,{
    method : "DELETE",
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }).then(response => {
      //console.log(response)
      if (response.status === 200) {
          return response.json(); // Parse the response JSON
      }else {
          throw new Error('Failed to remove the member. Please check your credentials.');
      }
  }).then(data =>{
    if(updateall){
      document.getElementById("editMemberPage").classList.add("hidden");
      updateAll();
    }
    //document.getElementById('newBillPage').classList.add('hidden');
  })
}



//edit the bills
function editBill(BillID){
  //console.log(BillID);
  const bill = allbills.filter(bill => {return bill.id===BillID})[0]; //select the bill
  addBill({edit:true,BillID:bill.id,what : bill.what, much:bill.amount,
          date:bill.date,who:bill.payer_id,whom:bill.owers.reduce((a,b) => a.concat(b.id),[]),
          currency:bill.original_currency,external_link:bill.external_link});
};

let lastwho = ""; //a variable that stores the last person used as the payer

// show the pannel to add a new bill/edit an old one
function addBill({edit = false, BillID = "", what = "", much = "", date = "", who = "", whom = "", currency = "", external_link = ""} = {}) {
  document.getElementById("newBillPage").classList.remove("hidden");
  document.getElementById("bill-when").focus()
  document.getElementById("bill-when").value= (date=="")? new Date().toISOString().split('T')[0] : date //select the provided date and if no, the current date
  document.getElementById("bill-what").value=what
  document.getElementById("bill-much").value=much

  const who_input = document.getElementById("bill-who");
  who_input.innerHTML="";
  const forWhom = document.getElementById("bill-forWhom");
  forWhom.innerHTML = "";
  info.members.sort(
    (a,b)=>{return a.name > b.name}
  ).forEach(member =>{
    //adding all member to who
    const memberSelect = document.createElement("option");
    Object.assign(memberSelect,{"textContent":memberNames[member.id], "value": member.id, "id":"who~"+member.id, "disabled": !memberActivated[member.id]});
    if((edit&(who == member.id))|| memberActivated[member.id]){
      who_input.appendChild(memberSelect);
    }
    //adding all member to whom
    const memberDiv   = document.createElement("div");
    memberDiv.onclick = function(){SelectforWhom(member.id)}
    const memberInput = document.createElement("input");
    Object.assign(memberInput,{"type":"checkbox","id":"whom~"+member.id, "name":"whom~"+member.id, "checked":true, "disabled": !memberActivated[member.id]});
    memberInput.onclick = function(){SelectforWhom(member.id)}
    const memberLabel = document.createElement("label");
    memberLabel.onclick = function(){SelectforWhom(member.id)}
    Object.assign(memberLabel,{"htmlFor":"whom~"+member.id, "textContent":memberNames[member.id]});
    if((edit&whom.includes(member.id))|| memberActivated[member.id]){
      forWhom.appendChild(memberDiv);
      memberDiv.appendChild(memberInput);
      memberDiv.appendChild(memberLabel);
    };
  });
  who_input.value=(who=="")? lastwho:who //select same as last for who payed the bill or the who if provided
  if(whom!=""){
    [...document.getElementById("bill-forWhom").getElementsByTagName("input")].forEach(option =>{option.checked=false}) //reset all checked
    whom.forEach(memberid => {document.getElementById("whom~"+memberid).checked=true}) //select only the required checked
  };
  // change the buttons if we edit a bill rather than creating a new one
  if(edit){
    [...document.getElementsByClassName("editBill")].forEach(buttons => {buttons.classList.remove("hidden")});
    [...document.getElementsByClassName("newBill")].forEach(buttons => {buttons.classList.add("hidden")});
    document.getElementById("btn-UpdateBill").onclick=function(){pushEditedBill(BillID)};
    document.getElementById("btn-RemoveBill").onclick=function(){removeBill(BillID)};
  }else{
    [...document.getElementsByClassName("editBill")].forEach(buttons => {buttons.classList.add("hidden")});
    [...document.getElementsByClassName("newBill")].forEach(buttons => {buttons.classList.remove("hidden")});
  }
}

//make the button SelectAll and SelectNone
function SelectforWhom(SelectAll){
  //SelectAll [id/bool] : if id, invert the one, if true, all selected, if false, none selected
  if(typeof SelectAll == "boolean"){
    [...document.getElementById("bill-forWhom").getElementsByTagName("input")].forEach(memberCheck=>{
      if(!memberCheck.disabled){
        memberCheck.checked = SelectAll;
      }
    });
  }else{
    let inp = document.getElementById("whom~"+SelectAll);
    if(!inp.disabled){
      inp.checked = !inp.checked;
    }
  }
}

//push the bill to the server
let lastbillID = 0
function pushNewBill(addNew = false){
  document.getElementById("loadingAnnim").classList.remove("hidden");
  const billInputData = [...document.getElementById('newBillPage').getElementsByTagName('input'),
                         ...document.getElementById('newBillPage').getElementsByTagName('select')].reduce((one,nex)=> {
                           if (nex.type==="checkbox"){
                              if(nex.checked & !nex.disabled){
                               one["payed_for"].push(nex.name.split("~")[1])
                             }
                           }else{
                             one[nex.name.split("-")[1]] = nex.value;
                           }
                           return one;
                         },{"payed_for":[]})
  const memberToActivate = billInputData.payed_for.concat(billInputData.payer).filter(id => !memberTrueActivated[id])
  let activateMember = memberToActivate.reduce((allmempush,memberID)=>{
    return allmempush.concat(pushEditedMember(memberID, true, false))
  }, []);

  return Promise.all(activateMember).then(
    fetch(apiUrl+"/bills", {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body : JSON.stringify(billInputData)
    }).then(response => {
        //console.log(response)
        if (response.status === 201) {
            return response.json(); // Parse the response JSON
        }else if(response.status === 400){

          throw new Error('Failed to Update bills. Please check your input values.')
        }else {
            throw new Error('Failed to fetch bills. Please check your credentials.');
        }
    }).then(data =>{
      lastbillID = data;
      lastwho = billInputData["payer"];
    })).then(a =>{
      activateMember = memberToActivate.reduce((allmempush,memberID)=>{
        return allmempush.concat(removeMember(memberID, false))
      }, []);
      return Promise.all(activateMember).then(a=> {
        document.getElementById("loadingAnnim").classList.add("hidden");
        updateAll();
        document.getElementById('newBillPage').classList.add('hidden');
        if(addNew){addBill()};
      })
    }).catch(error => {
      document.getElementById("loadingAnnim").classList.add("hidden");
      activateMember = memberToActivate.reduce((allmempush,memberID)=>{
        return allmempush.concat(removeMember(memberID, false))
      }, []);
    })
}

//push the edits made for a bill
function pushEditedBill(billID){
  const billInputData = [...document.getElementById('newBillPage').getElementsByTagName('input'),
                         ...document.getElementById('newBillPage').getElementsByTagName('select')].reduce((one,nex)=> {
                           if (nex.type==="checkbox"){
                              if(nex.checked){ // & !nex.disabled
                               one["payed_for"].push(nex.name.split("~")[1])
                             }
                           }else{
                             one[nex.name.split("-")[1]] = nex.value;
                           }
                           return one;
                         },{"payed_for":[]})

  const memberToActivate = billInputData.payed_for.concat(billInputData.payer).filter(id => !memberTrueActivated[id])
  let activateMember = memberToActivate.reduce((allmempush,memberID)=>{
    return allmempush.concat(pushEditedMember(memberID, true, false))
  }, []);

  return Promise.all(activateMember).then(
    fetch(apiUrl+"/bills/"+billID,{
      method : "PUT",
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body : JSON.stringify(billInputData)
    }).then(response => {
        //console.log(response)
        if (response.status === 200) {
            return response.json(); // Parse the response JSON
        }else if(response.status === 400){
          throw new Error('Failed to Update bills. Please check your input values.')
        }else {
          throw new Error('Failed to Update bills. Please check your credentials.');
        }
    }).then(data =>{
      lastbillID = data;
      lastwho = billInputData["payer"];
    })).then(a =>{
      activateMember = memberToActivate.reduce((allmempush,memberID)=>{
        return allmempush.concat(removeMember(memberID, false))
      }, []);
      return Promise.all(activateMember).then(a=> {
        document.getElementById("loadingAnnim").classList.add("hidden");
        updateAll();
        document.getElementById('newBillPage').classList.add('hidden');
        if(addNew){addBill()};
      })
    }).catch(error => {
      document.getElementById("loadingAnnim").classList.add("hidden");
      activateMember = memberToActivate.reduce((allmempush,memberID)=>{
        return allmempush.concat(removeMember(memberID, false))
      }, []);
    })
}

function removeBill(billID){
  return fetch(apiUrl+"/bills/"+billID,{
    method : "DELETE",
    headers: {
      'Authorization': 'Bearer ' + token
    }
  }).then(response => {
      //console.log(response)
      if (response.status === 200) {
          return response.json(); // Parse the response JSON
      }else {
          throw new Error('Failed to Update bills. Please check your credentials.');
      }
  }).then(data =>{
    updateAll()
    document.getElementById('newBillPage').classList.add('hidden');
  })
}


//function to render amoney
function amountToText(amount, currency){
  function round(v) { //to properly round negative value + round to 10E-2
    v = v*100
    return (v >= 0 || -1) * Math.round(Math.abs(v))/100;
  }
  amount = round(amount).toFixed(2)
  if (currency == "EUR") {
    currency = "€"
  }else if (currency == "XXX"){
    return `${amount}`
  }
  return `${amount} ${currency}`
}


//the function to update all the page
function updateAll(){
  document.getElementById("loadingAnnim").classList.remove("hidden");
  if((token != null)&&(projectID!= null)){
    updateInfo().then(t =>{
      const r1 = updateBills()
      const r2 = updateSummary();
      Promise.all([r1, r2]).then(resp =>{
        console.log("Alldata Updated")
        document.getElementById("loadingAnnim").classList.add("hidden")
      });
    })
  }else {
    console.log("your token and/or project ID are not given")
  }
}

// Example usage:
let balances = [['A', 100],['B', -50],['C', -20],['D',  10],['E', -40]];

//import settle from 'deptSettle.js';

//const results = settle(balances);
//console.log(results);



//the main run for all
updateAll()
