
// JS for the layout



const URLQueryParams = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});
// Get the value of "project" in eg "https://example.com/?project=some_value"
let projectID = URLQueryParams.project;
let token = URLQueryParams.token;

const apiUrl = 'https://ihatemoney.org/api/projects/'+projectID;

//Get the informations of the project
let info=null
let memberIDs = {}
let memberNames = {}
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
    memberIDs = {} //Reset member list
    memberNames = {}
    membersList.innerHTML = '';
    data.members.forEach(member => {
       const memberDiv = document.createElement('div');
       Object.assign(memberDiv, {"textContent":member.name,"id":member.id,  "onclick":function() {editMember(member.id)}, "style":"cursor: pointer;"})
       let img_edit = document.createElement('img');
       Object.assign(img_edit, {"src":"pen.svg", "style":"height:0.8em; display:inline-block; margin:auto auto;"})
       memberDiv.appendChild(img_edit);
       membersList.appendChild(memberDiv);
       memberIDs[member.name] = member.id;
       memberNames[member.id] = member.name;
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
        Object.assign(price, {"textContent":`${bill.amount} ${bill.original_currency}`, "classList":"billAmount"});
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
function updateSummary(){

}


//edit the informations of the project
function editMember(MemberID){
  console.log(MemberID);
};

function editBill(BillID){
  //console.log(BillID);
  const bill = allbills.filter(bill => {return bill.id===BillID})[0]; //select the bill
  addBill(edit=true,BillID=bill.id,what = bill.what, much=bill.amount,
          date=bill.date,who=bill.payer_id,whom=bill.owers.reduce((a,b) => a.concat(b.id),[]),
          currency=bill.original_currency,external_link=bill.external_link);

};

let lastwho = "";
function addBill(edit=false,BillID="",what = "", much="", date="",who="",whom="",currency="",external_link=""){
  document.getElementById("newBillPage").classList.remove("hidden");
  document.getElementById("bill-when").value= (date=="")? new Date().toISOString().split('T')[0] : date //select the provided date and if no, the current date
  document.getElementById("bill-what").value=what
  document.getElementById("bill-much").value=much

  const who_input = document.getElementById("bill-who");
  who_input.innerHTML="";
  const forWhom = document.getElementById("bill-forWhom");
  forWhom.innerHTML = "";
  info.members.forEach(member =>{
    //adding all member to who
    const memberSelect = document.createElement("option");
    Object.assign(memberSelect,{"textContent":memberNames[member.id], "value": member.id, "id":"who~"+member.id});
    who_input.appendChild(memberSelect);
    //adding all member to whom
    const memberInput = document.createElement("input");
    Object.assign(memberInput,{"type":"checkbox","id":"whom~"+member.id, "name":"whom~"+member.id, "checked":true});
    forWhom.appendChild(memberInput);
    const memberLabel = document.createElement("label");
    Object.assign(memberLabel,{"htmlFor":"whom~"+member.id, "textContent":memberNames[member.id]});
    forWhom.appendChild(memberLabel);
  });
  who_input.value=(who=="")? lastwho:who //select same as last for who payed the bill or the who if provided
  if(whom!=""){
    info.members.forEach(member =>{document.getElementById("whom~"+member.id).checked=false}) //reset all checked
    whom.forEach(memberid => {document.getElementById("whom~"+memberid).checked=true}) //select only the required checked
  };
  // change the buttons if we edit a bill rather than creating a new one
  if(edit){
    [...document.getElementsByClassName("editBill")].forEach(buttons => {buttons.classList.remove("hidden")});
    [...document.getElementsByClassName("newBill")].forEach(buttons => {buttons.classList.add("hidden")});
    document.getElementById("btn-UpdateBill").onclick=function(){updateBill(BillID)};
    document.getElementById("btn-RemoveBill").onclick=function(){removeBill(BillID)};
  }else{
    [...document.getElementsByClassName("editBill")].forEach(buttons => {buttons.classList.add("hidden")});
    [...document.getElementsByClassName("newBill")].forEach(buttons => {buttons.classList.remove("hidden")});
  }

}

let lastbillID = 0
function pushBill(addNew = false){
  const billInputData = [...document.getElementById('newBillPage').getElementsByTagName('input'),
                         ...document.getElementById('newBillPage').getElementsByTagName('select')].reduce((one,nex)=> {
                           if (nex.type==="checkbox"){
                             one["payed_for"].push(nex.name.split("~")[1])
                           }else{
                             one[nex.name.split("-")[1]] = nex.value;
                           }
                           return one;
                         },{"payed_for":[]})

  fetch(apiUrl+"/bills", {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body : JSON.stringify(billInputData)
  }).then(response => {
      console.log(response)
      if (response.status === 201) {
          return response.json(); // Parse the response JSON
      } else {
          throw new Error('Failed to fetch bills. Please check your credentials.');
      }
  }).then(data =>{
    lastbillID = data
    lastwho = billInputData["payer"]
    document.getElementById('newBillPage').classList.add('hidden')
    if(addNew){addBill()}
  })
}

//the main run for all
updateInfo().then(updateBills())
