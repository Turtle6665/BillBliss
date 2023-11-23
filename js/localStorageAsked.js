
//allow communications of different tabs when using sessionStorage
const bc = new BroadcastChannel("LS_channel");
//note :
//Messages should always be a list. The first elements says what is the action
//and the rest are data depending on the action

class LS{
  //a upgrated local storage. If the user agrees, it will save the data to localStorage.
  //If not, the data will be saved as a sessionstorage.
  constructor(){
    //check if previusly accepted or denied
    this.old_LS_accepted = JSON.parse(sessionStorage.getItem("old_LS_accepted"));
    if (this.old_LS_accepted == null){
      this.old_LS_accepted = JSON.parse(localStorage.getItem("old_LS_accepted"));
    };
    if (this.old_LS_accepted == null){
      this.old_LS_accepted = false;
    };
    let allItems = this.getItem("allItems");
    if (allItems == null){
      allItems = ["allItems"];
    };
    this.setItem("allItems", allItems);
  }

  denieLocalStorage(){
    if(this.old_LS_accepted==true){
      let allItems = this.getItem("allItems");
      bc.postMessage(["denieLocalStorage", allItems.reduce((itemList, item)=>{itemList[item]=localStorage.getItem(item); return itemList;},{})])
      this.removeItem("old_LS_accepted", false)
      allItems.forEach(item=>{
        sessionStorage.setItem(item,localStorage.getItem(item));
        localStorage.removeItem(item);
      });
      this.old_LS_accepted = false;
      this.setItem("old_LS_accepted",false, false);
    }else{
      console.log("WARNING: Data is already in sessionStorage")
    }
  }

  acceptLocalStorage(){
    if(this.old_LS_accepted==false){
      let allItems = this.getItem("allItems");
      this.removeItem("old_LS_accepted", false)
      allItems.forEach(item=>{
        localStorage.setItem(item,sessionStorage.getItem(item));
        sessionStorage.removeItem(item);
      });
      this.old_LS_accepted = true;
      localStorage.setItem("old_LS_accepted",true);
      bc.postMessage(["acceptLocalStorage"])
    }else{
      console.log("WARNING: Data is already in localStorage")
    }
  }

  getItem(item){
    let data = null
    if(this.old_LS_accepted==true){
      data = localStorage.getItem(item)
    }else{
      data = sessionStorage.getItem(item)
    }
    if(data==null){
      return(null)
    }else{
      return(JSON.parse(data))
    }
  }

  setItem(item, data, brodcast = true){
    let jsdata = JSON.stringify(data)
    if(this.old_LS_accepted==true){
      let data = localStorage.setItem(item, jsdata)
    }else{
      let data = sessionStorage.setItem(item, jsdata)
    }
    if (item != "allItems"){
      let allItems = this.getItem("allItems");
      allItems.push(item);
      this.setItem("allItems", allItems.filter((value, index, array) =>
                                                //to remove the duplicates
                                                array.indexOf(value) === index
                                              ));
      if(this.old_LS_accepted==false & brodcast){
        bc.postMessage(["setItem", item, data]);
      }
    }
  }

  removeItem(item, brodcast = true){
    if(item != "allItems"){
      if(this.old_LS_accepted==true){
        localStorage.removeItem(item);
      }else{
        sessionStorage.removeItem(item);
        if(brodcast){
          bc.postMessage(["removeItem", item]);
        }
      }
      let allItems = this.getItem("allItems");
      allItems = allItems.filter((a)=> a!=item);
      this.setItem("allItems", allItems);
    }else{
      console.log("WARNING: you cannot remove the item `allItems`,",
                  "it's required for the storage API")
    }
  }

  removeAllItems(){
    let allItems = this.getItem("allItems");
    allItems.filter((a)=> a!="allItems").forEach((item) => {
      this.removeItem(item, false);
    });
  }

}


storage = new LS()

//const bc = new BroadcastChannel("LS_channel");

bc.onmessage = (event) => {
  console.log(event);
  let tData = event.data
  if(tData[0]=="denieLocalStorage"){
    let allItemsAndData = tData[1];
    Object.keys(allItemsAndData).forEach(item=>{
      sessionStorage.setItem(item,allItemsAndData[item]);
    });
    storage.old_LS_accepted = false;
    storage.setItem("old_LS_accepted",false, false);

  }else if(tData[0]=="acceptLocalStorage"){
    let allItems = storage.getItem("allItems");
    storage.removeItem("old_LS_accepted", false)
    allItems.forEach(item=>{
      sessionStorage.removeItem(item);
    });
    storage.old_LS_accepted = true;

  }else if(tData[0]=="setItem"){
    if((tData[1]=="ProjectsList") &
       (JSON.stringify(tData[2])!=JSON.stringify(storage.getItem("ProjectsList")))){
      //this allows to syncronise the two ProjectsList if they are not identical
      // only one back and forth maximum ? No if they are 3 tabs, it doesn't work...
      // [TODO]
      let data = Object.assign({}, storage.getItem("ProjectsList"), tData[2]);
      storage.setItem(tData[1],data,true);
    }else{
      storage.setItem(tData[1],tData[2],false);
    }
  }else if(tData[0]=="removeItem"){
    storage.removeItem(tData[1],false);
  }else{
    console.log(tData[0], "is not an expected value for the message")
  }
};

//localStorage.getItem("allItems")
//storage.getItem("allItems")
//storage.setItem("Test",{"Hello":"it'sme"})
//storage.getItem("allItems")
//storage.acceptLocalStorage()
//storage.setItem("Test2",{"Hello":"it's me again"})
//storage.getItem("allItems")
//storage.getItem("Test2")
//localStorage.getItem("allItems")
//storage.removeAllItems()
