//allow communications of different tabs when using sessionStorage
const bc = new BroadcastChannel("BillBliss_channel");
//note :
//Messages should always be a list. The first elements says what is the action
//and the rest are data depending on the action

class LS {
  //a upgrated local storage. If the user agrees, it will save the data to localStorage.
  //If not, the data will be saved as a sessionstorage.
  constructor() {
    //check if previusly accepted or denied
    this.old_LS_accepted = JSON.parse(
      sessionStorage.getItem("old_LS_accepted"),
    );
    if (this.old_LS_accepted == null) {
      this.old_LS_accepted = JSON.parse(
        localStorage.getItem("old_LS_accepted"),
      );
    }
    if (this.old_LS_accepted == null) {
      this.old_LS_accepted = false;
    } else {
      this.old_LS_accepted = this.old_LS_accepted["data"];
    }
    let allItems = this.getItem("allItems");
    if (allItems == null) {
      allItems = ["allItems"];
    }
    this.setItem("allItems", allItems);
  }

  denieLocalStorage() {
    if (this.old_LS_accepted == true) {
      let allItems = this.getItem("allItems");
      bc.postMessage([
        "denieLocalStorage",
        allItems.reduce((itemList, item) => {
          itemList[item] = localStorage.getItem(item);
          return itemList;
        }, {}),
      ]);
      this.removeItem("old_LS_accepted", false);
      allItems.forEach((item) => {
        sessionStorage.setItem(item, localStorage.getItem(item));
        localStorage.removeItem(item);
      });
      this.old_LS_accepted = false;
      this.setItem("old_LS_accepted", false, false);
    } else {
      console.log("WARNING: Data is already in sessionStorage");
    }
  }

  acceptLocalStorage() {
    if (this.old_LS_accepted == false) {
      let allItems = this.getItem("allItems");
      this.removeItem("old_LS_accepted", false);
      allItems.forEach((item) => {
        localStorage.setItem(item, sessionStorage.getItem(item));
        sessionStorage.removeItem(item);
      });
      this.old_LS_accepted = true;
      localStorage.setItem("old_LS_accepted", true);
      bc.postMessage(["acceptLocalStorage"]);
    } else {
      console.log("WARNING: Data is already in localStorage");
    }
  }

  getItem(item, getDate = false) {
    let data = null;
    if (this.old_LS_accepted == true) {
      data = localStorage.getItem(item);
    } else {
      data = sessionStorage.getItem(item);
    }
    if (data == null) {
      return null;
    } else if (getDate) {
      return JSON.parse(data);
    } else {
      return JSON.parse(data)["data"];
    }
  }

  setItem(item, data, brodcast = true) {
    if (item == "ProjectsList") {
      //these are data that should have subdata with time saved in the sub layer
      Object.keys(data).forEach((projectID) => {
        if (data[projectID]["date"] == null) {
          //add a date if no date is provided
          data[projectID]["date"] = Date.now();
        }
      });
    }

    let fulldata = { data: data, date: Date.now() };
    let jsdata = JSON.stringify(fulldata);
    if (this.old_LS_accepted == true) {
      localStorage.setItem(item, jsdata);
    } else {
      sessionStorage.setItem(item, jsdata);
    }
    if (item != "allItems") {
      let allItems = this.getItem("allItems");
      allItems.push(item);
      this.setItem(
        "allItems",
        allItems.filter(
          (value, index, array) =>
            //to remove the duplicates
            array.indexOf(value) === index,
        ),
      );
      if ((this.old_LS_accepted == false) & brodcast) {
        bc.postMessage(["setItem", item, fulldata]);
      }
    }
  }

  removeItem(item, brodcast = true) {
    if (item != "allItems") {
      if (this.old_LS_accepted == true) {
        localStorage.removeItem(item);
      } else {
        sessionStorage.removeItem(item);
        if (brodcast) {
          bc.postMessage(["removeItem", item]);
        }
      }
      let allItems = this.getItem("allItems");
      allItems = allItems.filter((a) => a != item);
      this.setItem("allItems", allItems);
    } else {
      console.log(
        "WARNING: you cannot remove the item `allItems`,",
        "it's required for the storage API",
      );
    }
  }

  removeSubItem(item, subitem, brodcast = true) {
    let data = this.getItem(item);
    data = Object.keys(data).reduce((alldata, subitemi) => {
      if (subitemi != subitem) {
        alldata[subitemi] = data[subitemi];
      }
      return alldata;
    }, {});

    if ((this.old_LS_accepted == false) & brodcast) {
      bc.postMessage(["removeSubItem", item, subitem]);
    }
    this.setItem(item, data, false);
  }

  removeAllItems() {
    let allItems = this.getItem("allItems");
    allItems
      .filter((a) => a != "allItems")
      .forEach((item) => {
        this.removeItem(item, false);
      });
  }
}

storage = new LS();

bc.onmessage = (event) => {
  //console.log(event);
  if (tData[0] == "denieLocalStorage") {
    let allItemsAndData = tData[1];
    Object.keys(allItemsAndData).forEach((item) => {
      sessionStorage.setItem(item, allItemsAndData[item]);
    });
    storage.old_LS_accepted = false;
    storage.setItem("old_LS_accepted", false, false);
  } else if (tData[0] == "acceptLocalStorage") {
    let allItems = storage.getItem("allItems");
    storage.removeItem("old_LS_accepted", false);
    allItems.forEach((item) => {
      sessionStorage.removeItem(item);
    });
    storage.old_LS_accepted = true;
  } else if (tData[0] == "setItem") {
    if (tData[1] == "ProjectsList") {
      //this allows to syncronise the two ProjectsList if they are not identical
      //only a few back and forth ?
      let oldProjectList = storage.getItem(tData[1]);
      if (
        (JSON.stringify(Object.assign({}, oldProjectList, tData[2].data)) !=
          JSON.stringify(oldProjectList)) |
        (Object.keys(oldProjectList).length !=
          Object.keys(tData[2].data).length)
      ) {
        let allProjectIDs = Object.keys(
          Object.assign({}, oldProjectList, tData[2].data),
        );
        let data = allProjectIDs.reduce((ProjectsListData, projectID) => {
          if (tData[2].data[projectID] == null) {
            ProjectsListData[projectID] = oldProjectList[projectID];
          } else if (oldProjectList[projectID] == null) {
            ProjectsListData[projectID] = tData[2].data[projectID];
          } else if (
            tData[2].data[projectID].date >= oldProjectList[projectID].date
          ) {
            ProjectsListData[projectID] = tData[2].data[projectID];
          } else {
            ProjectsListData[projectID] = oldProjectList[projectID];
          }
          return ProjectsListData;
        }, {});

        //let data = Object.assign({}, storage.getItem("ProjectsList"), tData[2].data);
        storage.setItem(tData[1], data, true);
      }
    } else {
      let olddata = storage.getItem(tData[1], true);
      if (olddata == null) {
        //if no previus data, keep this data
        storage.setItem(tData[1], tData[2]["data"], false);
      } else if (tData[2]["date"] >= olddata["date"]) {
        //if the receieved data is younger than the saved one, I update the saved one
        // the saved date will be the date of saving not the original date
        storage.setItem(tData[1], tData[2]["data"], false);
      } else {
        //if receieved data is older than the saved one, I brodcast the saved one
        bc.postMessage(["setItem", tData[1], olddata]);
      }
    }
  } else if (tData[0] == "removeItem") {
    storage.removeItem(tData[1], false);
  } else if (tData[0] == "removeSubItem") {
    storage.removeSubItem(tData[1], tData[2], false);
  } else if (tData[0] == "updateProjectList") {
    // force an update on the project list displayed
    updateProjectList();
  } else {
    console.log(tData[0], "is not an expected value for the message");
  }
};
