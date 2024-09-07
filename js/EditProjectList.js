//Based on https://www.darins.page/articles/designing-a-reorderable-list-component

let wrapper, oldList, items, buttons, listEnd, status, wrapperFrag;
let gapHeight, firstGap;
let curName, curItem, curButton, curDraggedEl;
let grabCoords;
let statusTimer;
let typeUI;

let debug = false;

const URLQueryParams = new Proxy(new URLSearchParams(window.location.search), {
  get: (searchParams, prop) => searchParams.get(prop),
});

let ProjectsList = storage.getItem("ProjectsList");

function debounce(func, delay) {
  let inDebounce;
  return function () {
    const context = this;
    const args = arguments;
    clearTimeout(inDebounce);
    inDebounce = setTimeout(() => func.apply(context, args), delay);
  };
}

function itemDragStart(e) {
  //console.log("dragstart");

  // add drag styling
  e.target.parentElement.classList.add("__itemDrag");

  items.forEach((item) => {
    item.classList.remove("__itemDragover");
  });

  // set currently dragged item
  curDraggedEl = e.target;

  // set mouse coords of grab
  grabCoords.x = e.layerX;
  grabCoords.y = e.layerY;

  // set drag data
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", curItem);

  // set drag image
  //e.dataTransfer.setDragImage(curDraggedEl,grabCoords.x,grabCoords.y);

  // feedback message
  announceStatus(`${curName} being dragged.`);
}

function itemDragEnd(e) {
  //console.log('dragend');

  // remove drag styling
  e.target.parentElement.classList.remove("__itemDrag");
  e.target.parentElement.classList.remove("__itemGrab");

  items.forEach((item) => {
    item.classList.remove("__itemDragover");
  });
}

function itemDragOver(e) {
  if (e.preventDefault) e.preventDefault();

  return false;
}

function itemDragEnter(e) {
  //console.log("dragenter");

  // get position of item dragged over
  let pos = parseInt(e.target.parentElement.dataset.pos) + 1;

  // check that item isn't being dragged over itself
  if (pos !== curItem + 1) {
    // add drag over styling
    e.target.parentElement.classList.add("__itemDragover");

    // set drag data
    e.dataTransfer.dropEffect = "move";

    // feedback message
    announceStatus(
      `Entered drag area for #${pos}, ${e.target.dataset.name}. Drop to swap positions.`
    );
  } else {
    // set drag data
    e.dataTransfer.dropEffect = "none";
  }
}

function itemDragLeave(e) {
  //console.log("dragleave");

  // remove drag over styling
  e.target.parentElement.classList.remove("__itemDragover");

  // feedback message
  //announceStatus(`Left drag area for ${e.target.dataset.name}.`);
}

function itemDrop(e) {
  //console.log("drop");

  // stop browser redirect
  e.preventDefault();
  e.stopPropagation();

  // remove drag styling
  curDraggedEl.parentElement.classList.remove("__itemDrag");
  curDraggedEl.parentElement.classList.remove("__itemGrab");
  //curDraggedEl.parentElement.classList = 'rankingsItem';

  // check that item was dropped on a different one
  if (curDraggedEl !== e.target) {
    // get #'s of items we're swapping
    let pos1 = parseInt(e.dataTransfer.getData("text/plain"));
    let pos2 = parseInt(e.target.parentElement.dataset.pos);

    // update grab coordinates
    grabCoords.x = grabCoords.x - e.layerX;
    grabCoords.y = grabCoords.y - e.layerY;

    // swap items
    swapItems(pos1, pos2);

    // move focus to item
    items[pos2].focus();

    // do drop transition
    transitionDropItem(pos2, grabCoords.x, grabCoords.y);

    // do slide transition
    transitionSlideItem(pos1, pos2 - pos1, false, 0.35);

    // feedback message
    // item [pos1] moved to [pos2], item [pos2] moved to [pos1]
    announceStatus(
      `Items ${pos1 + 1} and ${pos2 + 1} swapped: ${curName} moved to #${
        pos2 + 1
      }.`
    );
  }

  // some browsers need this to prevent redirect
  return false;
}

function gapDragEnter(e) {
  //console.log("gapdragenter");

  // get position of gap
  let pos = parseInt(e.target.dataset.pos);

  // check if gap is above or below item being dragged
  if (curItem !== pos && curItem !== pos - 1) {
    // show gap
    e.target.classList.add("__gapDragover");

    // set drag data
    e.dataTransfer.dropEffect = "move";

    // setup feedback message
    let message = "";

    // if first gap
    if (pos == 0) {
      message += `Entered drag area for gap before #1. Drop to move item to #1 and shift other items down.`;

      // if gap is last
    } else if (pos == items.length) {
      message += `Entered drag area for gap after #${items.length}. Drop to move item to #${items.length} and shift other items up.`;

      // if gap is in the middle
    } else {
      message = `Entered drag area for gap between ${pos} and ${pos + 1}. `;

      // if we're dragging item above where it originatetd
      if (pos < curItem) {
        message += `Drop to move item to #${
          pos + 1
        } and shift other items down.`;

        // if we're dragging item below where it originated
      } else {
        message += `Drop to move item to #${pos} and shift other items up.`;
      }
    }
    // announce feedback message
    announceStatus(message);
  } else {
    // set drag data
    e.dataTransfer.dropEffect = "none";
  }
}

function gapDragLeave(e) {
  //console.log("gapdragleave");

  // hide gap
  e.target.classList.remove("__gapDragover");
}

function gapDragOver(e) {
  if (e.preventDefault) e.preventDefault();

  return false;
}

function gapDrop(e) {
  // stop browser redirect
  e.preventDefault();
  e.stopPropagation();

  // remove drag styling on gap
  e.target.classList.remove("__gapDragover");

  // remove drag styling
  curDraggedEl.parentElement.classList.remove("__itemDrag");
  curDraggedEl.parentElement.classList.remove("__itemGrab");

  // get position of gap
  let pos = parseInt(e.target.dataset.pos);

  // get distance dragged item is moving
  let dis = pos - curItem;

  // check if gap is above or below item being dragged
  if (curItem !== pos && curItem !== pos - 1) {
    // update grab coordinates
    grabCoords.x = grabCoords.x - e.layerX;
    if (dis < 0) {
      grabCoords.y = gapHeight - e.layerY + grabCoords.y;
    } else {
      grabCoords.y =
        -items[curItem].getBoundingClientRect().height -
        e.layerY +
        grabCoords.y;
    }

    // shift items
    shiftItems(curItem, dis);
  }

  // some browsers need this to prevent redirect
  return false;
}

function transitionSlideItem(pos, dis, front = true, decay) {
  // vars
  let cls;
  // get item
  let item = items[pos];
  // get duration css var to use as setTimeout duration later
  let dur =
    parseFloat(getComputedStyle(item).getPropertyValue("--dur")) * 1000 || 0;

  // var to keep track of rate of change
  let rate;

  // check if we're moving an item more than 1 row and if a decay number was passed in
  if (Math.abs(dis) > 1 && decay) {
    rate = 0;
    // loop through number of rows we're moving item and add a decay to the rate of change
    for (let i = 0; i < Math.abs(dis); i++) {
      rate += 1 - i * decay;
    }
    // set duration to match rate
    dur *= rate;

    // if moving only one row
  } else {
    // set rate var to have no change
    rate = Math.abs(dis);
  }

  // determine if row should be in front or back and add relevant class
  if (front) {
    cls = "__slideFront";
  } else {
    cls = "__slideBack";
  }

  // set value of css vars so item knows which direction to move and how far
  item.style.setProperty("--dis", dis);
  item.style.setProperty("--abs", rate);

  // add class to kick off animationn
  item.classList.add(cls);

  // remove class after animation has finished so as to not affect future animations
  setTimeout(() => {
    item.classList.remove(cls);
  }, dur);
}

function transitionShakeItem(pos) {
  // get item
  let item = items[pos];

  // add class to kick off animation
  item.classList.add("__shake");

  // remove class after animation has finished
  setTimeout(() => {
    item.classList.remove("__shake");
  }, 400);
}

function transitionDropItem(pos, dropX = 0, dropY = 0) {
  // get item
  let item = items[pos];

  // update css vars so row will slide from dropped position
  item.style.setProperty("--dropX", -dropX);
  item.style.setProperty("--dropY", -dropY);

  // add class to kick off animation
  item.classList.add("__drop");

  // remove class after animation has finished
  setTimeout(() => {
    item.classList.remove("__drop");
  }, 300);
}

function moveItemUp(pos) {
  // convert pos to number so we can math
  pos = parseInt(pos);

  // check to make sure we're not in the first row
  if (pos > 0) {
    // get positions of items
    let pos1 = pos - 1;
    let pos2 = pos;

    // get ref to up button
    let button = items[pos2].querySelector(".rankingsItem--up");

    // swap items
    swapItems(pos2, pos1);

    // move focus to down button
    button.focus();

    // do slide transitions
    transitionSlideItem(pos1, 1);
    transitionSlideItem(pos2, -1, false);

    // feedback message
    // item [pos2] moved to [pos1], item [pos1] moved to [pos2]
    announceStatus(`${curName} moved up to #${pos2}.`);
  } else {
    // get ref to up button
    let button = items[pos].querySelector(".rankingsItem--up");

    // move focus to up button
    button.focus();

    // do shake animation
    transitionShakeItem(pos);

    // feedback message
    // item 1 is the first item and can't be moved up
    announceStatus(`${curName} is #1 and can't move up.`);
  }
}

function moveItemDown(pos) {
  // convert pos to number so we can math
  pos = parseInt(pos);

  // check to make sure we're not in the last row
  if (pos < items.length - 1) {
    // get positions of items
    let pos1 = pos;
    let pos2 = pos + 1;

    // get ref to down button
    let button = items[pos1].querySelector(".rankingsItem--down");

    // swap items
    swapItems(pos1, pos2);

    // move focus to down button
    button.focus();

    // do slide transitions
    transitionSlideItem(pos1, 1, false);
    transitionSlideItem(pos2, -1);

    // feedback message
    // item [pos1] moved to [pos2], item [pos2] moved to [pos1]
    announceStatus(`${curName} moved down to #${pos2 + 1}.`);
  } else {
    // get ref to down button
    let button = items[pos].querySelector(".rankingsItem--down");

    // move focus to down button
    button.focus();

    // do shake animation
    transitionShakeItem(pos);

    // feedback message
    // item [pos] is the last item and can't be moved down
    announceStatus(`${curName} is #${items.length} and can't move down.`);
  }
}

function shiftItems(pos, dis) {
  let inner, item1, item2, newPos, id, name, marker, message;

  // get temp copy of items
  let tempItems = Array.prototype.slice.call(items);

  // get inner of element being dragged
  inner = items[pos].querySelector(".rankingsItem--inner");

  // get original position of item we're moving
  id = inner.dataset.origin;

  // if we're moving an element up (+ shifting other elements down)
  if (dis < 0) {
    // get partial array containing only the items being shifted
    tempItems = tempItems.slice(pos + dis, pos + 1);

    // move inner to new item
    item1 = tempItems[0];
    item1.appendChild(inner);

    // update label
    updateLabel(pos + dis, id);

    // loop through array of partial items to take inner from one and place it inside the next
    for (let i = 0; i < tempItems.length - 1; i++) {
      // get references to items we'll be swapping inners of
      item1 = tempItems[i];
      item2 = tempItems[i + 1];

      // get inner so we can move it down one row
      inner = item1.querySelector(".rankingsItem--inner");

      // get label id for moved item
      id = inner.querySelector(".rankingsItem--text").id.substr(4);

      // move inner to next item
      item2.appendChild(inner);

      // update label
      marker = parseInt(item1.dataset.pos) + 1;
      updateLabel(marker, id);
    }

    // get new position of item that was dragged
    newPos = pos + dis;

    // feedback message
    message = `${curName} moved up to #${newPos + 1}`;
    if (Math.abs(dis) == 1) {
      message += `, item ${newPos + 1} shifted down.`;
    } else {
      message += `, items ${newPos + 1}-${
        newPos + Math.abs(dis)
      } shifted down.`;
    }
    announceStatus(message);

    // do drop transition on dragged item
    transitionDropItem(newPos, grabCoords.x, grabCoords.y);

    // loop through shifted items and slide transition them
    for (let i = newPos; i < newPos + Math.abs(dis); i++) {
      transitionSlideItem(i + 1, -1, false);
    }

    // if we're moving an element down (+ shifting other elements up)
  } else {
    // get partial array containing only the items being shifted
    tempItems = tempItems.slice(pos, pos + dis);

    // move inner to new item
    item1 = tempItems[tempItems.length - 1];
    item1.appendChild(inner);

    // update label
    updateLabel(pos + dis - 1, id);

    // loop through partial array and take inner from one item and place it inside the next
    for (let i = tempItems.length - 1; i > 0; i--) {
      // get references to items we're using
      item1 = tempItems[i];
      item2 = tempItems[i - 1];

      // get inner so we can move it up one row
      inner = item1.querySelector(".rankingsItem--inner");

      // get label id for next item
      id = inner.querySelector(".rankingsItem--text").id.substr(4);

      // move inner to next iteam
      item2.appendChild(inner);

      // update label
      marker = parseInt(item1.dataset.pos) - 1;
      updateLabel(marker, id);
    }

    // get new position of item that was dragged
    newPos = pos + dis - 1;

    // feedback message
    message = `${curName} moved down to #${newPos + 1}`;
    if (Math.abs(dis - 1) == 1) {
      message += `, item ${newPos + 1} shifted up.`;
    } else {
      message += `, items ${newPos + 1 - (dis - 1) + 1}-${
        newPos + 1
      } shifted up.`;
    }
    announceStatus(message);

    // do drop transition on dragged item
    transitionDropItem(newPos, grabCoords.x, grabCoords.y);

    // loop through changed rows and transition them
    for (let i = newPos - 1; i > newPos - dis; i--) {
      transitionSlideItem(i, 1, false);
    }
  }

  // move focus to dragged item
  items[newPos].focus();
}

function swapItems(pos1, pos2) {
  // get items in question
  let item1 = items[pos1];
  let item2 = items[pos2];

  // get inners we're swapping
  let inner1 = item1.querySelector(".rankingsItem--inner");
  let inner2 = item2.querySelector(".rankingsItem--inner");

  // update labels
  let id1 = inner1.dataset.origin;
  let id2 = inner2.dataset.origin;
  updateLabel(pos1, id2);
  updateLabel(pos2, id1);

  // move inners from one item to the other
  item1.appendChild(inner2);
  item2.appendChild(inner1);
}

function updateFocusInfo(pos) {
  // get name of item we're moving
  let name = items[pos].querySelector(".rankingsItem--inner").dataset.name;

  // check if prev item and new item are different (means new row was selected)
  if (curItem !== pos) {
    // get buttons within new item
    buttons = items[pos].querySelectorAll("button");

    // take prev item out of tab order and put new item in tab order
    items[curItem].tabIndex = -1;
    items[pos].tabIndex = 0;
  }

  // update current item vars
  curItem = parseInt(pos);
  curName = name;
  curButton = null;
}

function itemFocus(e) {
  updateFocusInfo(e.target.dataset.pos);
}

function buttonFocus(e) {
  // update focus info
  updateFocusInfo(
    e.target.parentElement.parentElement.parentElement.dataset.pos
  );

  // expose focused button to screen reader
  //e.target.setAttribute('aria-hidden','false');

  // update current button var
  curButton = e.target.dataset.pos;
}

function buttonBlur(e) {
  // hide button from screen reader
  //e.target.setAttribute('aria-hidden','true');
}

function itemKeyDown(e) {
  let keyCode = e.keyCode || e.which;

  switch (keyCode) {
    case 32: // space
    case 13: // enter
      break;

    case 27: // esc
      e.preventDefault();
      //list.focus();
      listEnd.focus();
      break;

    case 37: // left
      e.preventDefault();

      // check if curButton doesn't exist yet (meaning new item was selected)
      if (!curButton) curButton = buttons.length;

      // if we're not at first button
      if (curButton > 0) {
        // update current button var and move focus to it
        curButton--;
        buttons[curButton].focus();

        // if we're at first button
      } else {
        // set focus to button's parent
        items[curItem].focus();
      }

      // move focus to prev button
      //getPrevButton(curButton).focus();
      break;
    case 38: // up
      e.preventDefault();

      // move focus to prev item
      getPrevItem(curItem).focus();
      break;

    case 39: // right
      e.preventDefault();

      // check if curButton doesn't exist yet (meaning new item was selected)
      if (!curButton) curButton = -1;

      // if we're not at last button
      if (curButton < buttons.length - 1) {
        // update current button var and move focus to it
        curButton++;
        buttons[curButton].focus();

        // if we're at last button
      } else {
        // set focus to button's parent
        items[curItem].focus();
      }

      // move focus to next button
      //getNextButton(curButton).focus();
      break;
    case 40: // down
      e.preventDefault();

      // move focus to next item
      getNextItem(curItem).focus();
      break;

    case 9: // tab
      break;

    case 33: // page up
      e.preventDefault();

      // move focus to first item
      items[0].focus();
      break;

    case 34: // page down
      e.preventDefault();

      // move focus to last item
      items[items.length - 1].focus();
      break;

    default:
      break;
  }
}

function getPrevItem(pos) {
  if (pos > 0) {
    pos--;
  } else {
    pos = items.length - 1;
  }
  return items[pos];
}

function getNextItem(pos) {
  if (pos < items.length - 1) {
    pos++;
  } else {
    pos = 0;
  }
  return items[pos];
}

function getPrevButton(pos) {
  if (pos > 0) {
    pos--;
  } else {
    pos = buttons.length - 1;
  }
  return buttons[pos];
}

function getNextButton(pos) {
  if (pos < buttons.length - 1) {
    pos++;
  } else {
    pos = 0;
  }
  return buttons[pos];
}

function announceStatus(message) {
  if (debug == true) {
    ShowToast(message, "Green");
  }
}

function updateLabel(pos, num) {
  items[pos].setAttribute("aria-labelledby", `marker${pos + 1} name${num}`);
}

function setupItem(list, oldItem, pos) {
  // get elements
  let oldInner = oldItem.querySelector(".rankingsItem--inner");
  let oldImg = oldInner.querySelector("img.rankingsItem--photo");
  let oldText = oldInner.querySelector(".rankingsItem--text");
  let name = oldText.innerText;

  // set up new item
  let item = document.createElement("div");
  item.classList = "rankingsItem";
  item.setAttribute("aria-labelledby", `marker${pos + 1} name${pos + 1}`);
  item.setAttribute("role", "listitem");
  item.dataset.pos = pos;
  item.tabIndex = -1;

  // set up marker
  let marker = document.createElement("div");
  marker.id = `marker${pos + 1}`;
  marker.classList = "rankingsItem--marker";
  marker.innerText = `${pos + 1}.`;

  // set up inner
  let inner = document.createElement("div");
  inner.classList = "rankingsItem--inner";
  inner.dataset.name = name;
  inner.dataset.origin = pos + 1;
  inner.setAttribute("draggable", "true");
  inner.addEventListener("dragstart", itemDragStart, false);
  inner.addEventListener("dragend", itemDragEnd, false);
  inner.addEventListener("dragenter", itemDragEnter, false);
  inner.addEventListener("dragleave", itemDragLeave, false);
  inner.addEventListener("dragover", itemDragOver, false);
  inner.addEventListener("drop", itemDrop, false);
  inner.addEventListener(
    "mousedown",
    (e) => {
      e.target.parentElement.classList.add("__itemGrab");
    },
    false
  );
  inner.addEventListener(
    "mouseup",
    (e) => {
      e.target.parentElement.classList.remove("__itemGrab");
    },
    false
  );

  /* This event fixes a bug in Android Chrome where draging non-focused element does not assign focus and will result in wrong element being moved */
  inner.addEventListener(
    "pointerdown",
    (e) => {
      updateFocusInfo(e.target.parentElement.dataset.pos);
      e.target.focus();
    },
    false
  );

  // set up name and image elements
  let text = oldText.cloneNode(true);
  let img = oldImg.cloneNode(true);

  // set up buttons
  let buttons = [];
  let buttonSpan, buttonSvg, buttonUse;
  let ns = "http://www.w3.org/2000/svg";
  let ns2 = "http://www.w3.org/1999/xlink";
  // button wrapper
  let buttonWrapper = document.createElement("div");
  buttonWrapper.classList = "rankingsItem--buttons";
  // up button
  let upButton = document.createElement("button");
  upButton.classList = "rankingsItem--up";
  buttonSpan = document.createElement("span");
  buttonSpan.classList = "visuallyHidden";
  buttonSpan.innerText = "Move up";
  buttonSvg = document.createElementNS(ns, "svg");
  buttonSvg.setAttributeNS(ns, "width", "16");
  buttonSvg.setAttributeNS(ns, "height", "16");
  buttonSvg.setAttributeNS(ns, "focusable", "false");
  buttonSvg.setAttributeNS(ns, "aria-hidden", "true");
  buttonUse = document.createElementNS(ns, "use");
  buttonUse.setAttributeNS(ns2, "xlink:href", "#icon--up");
  buttonSvg.appendChild(buttonUse);
  upButton.appendChild(buttonSpan);
  upButton.appendChild(buttonSvg);
  buttons.push(upButton);
  // down button
  let downButton = document.createElement("button");
  downButton.classList = "rankingsItem--down";
  buttonSpan = document.createElement("span");
  buttonSpan.classList = "visuallyHidden";
  buttonSpan.innerText = "Move up";
  buttonSvg = document.createElementNS(ns, "svg");
  buttonSvg.setAttributeNS(ns, "width", "16");
  buttonSvg.setAttributeNS(ns, "height", "16");
  buttonSvg.setAttributeNS(ns, "focusable", "false");
  buttonSvg.setAttributeNS(ns, "aria-hidden", "true");
  buttonUse = document.createElementNS(ns, "use");
  buttonUse.setAttributeNS(ns2, "xlink:href", "#icon--down");
  buttonSvg.appendChild(buttonUse);
  downButton.appendChild(buttonSpan);
  downButton.appendChild(buttonSvg);
  buttons.push(downButton);

  // add elements to inner
  buttonWrapper.appendChild(upButton);
  buttonWrapper.appendChild(downButton);
  inner.appendChild(text);
  inner.appendChild(img);
  inner.appendChild(buttonWrapper);

  // add elements to item
  item.appendChild(marker);
  item.appendChild(inner);

  //updateLabel(pos,pos+1);

  // loop through buttons in each inner and set common functionality
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].type = "button";
    buttons[i].tabIndex = "-1";
    buttons[i].dataset.pos = i;

    // add event listener
    buttons[i].addEventListener("focus", buttonFocus);
    buttons[i].addEventListener("blur", buttonBlur);
  }

  // change label of move up/down buttons
  upButton.children[0].innerText = `Move up ${name}`;
  downButton.children[0].innerText = `Move down ${name}`;

  // add event listeners for move up/down buttons
  upButton.addEventListener("click", (e) => {
    moveItemUp(curItem);
  });
  upButton.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });
  downButton.addEventListener("click", (e) => {
    moveItemDown(curItem);
  });
  downButton.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
  });

  // add event listeners for item
  item.addEventListener("focus", itemFocus);
  item.addEventListener("keydown", itemKeyDown);

  // create gap below item
  let gap = setupGap(pos + 1);

  // add item and gap to list
  list.appendChild(item);
  list.appendChild(gap);
}

function setupGap(pos) {
  let gap = document.createElement("div");

  // set gap props
  gap.classList.add("rankingsGap");
  gap.dataset.pos = pos;
  gap.setAttribute("aria-hidden", "true");

  // set up gap event listeners
  gap.addEventListener("dragenter", gapDragEnter, false);
  gap.addEventListener("dragleave", gapDragLeave, false);
  gap.addEventListener("dragover", gapDragOver, false);
  gap.addEventListener("drop", gapDrop, false);

  return gap;
}

function setGapHeight() {
  // get gap height var from CSS
  let height = getComputedStyle(wrapper).getPropertyValue("--rowGap").trim();

  // get current base font size
  let fontSize = getComputedStyle(document.documentElement)
    .getPropertyValue("font-size")
    .substr(0, 2);

  // determine actual height of gap
  gapHeight =
    parseInt(height.substr(0, height.length - 2)) * parseInt(fontSize);

  //gapHeight = firstGap.getBoundingClientRect().height;
  //console.log(gapHeight);
}

function updateOrder() {
  // get wrapper and list element
  wrapper = document.querySelector(".rankings");
  oldList = wrapper.querySelector("ol");

  let shifts = [...oldList.querySelectorAll("input")].map((item, i) => {
    return Number(item.value);
  });
  if (shifts.some((i) => (i > shifts.length) | (i < 0))) {
    ShowToast("Your inputs should be between 1 and " + shifts.length, "Red");
    shifts.forEach((item, i) => {
      if ((item > shifts.length) | (item < 0)) {
        transitionShakeItem(i);
      }
    });

    return null;
  } else {
    // if two items have the same id, order them based on the old id
    let rawOrder = shifts
      .map((a, b) => {
        return { value: a, inputOrder: b };
      })
      .sort((a, b) => a.value - b.value);
    let maxValue = 0;
    let minVal = shifts.length + 1;
    let NewOrder_Temp = rawOrder
      .filter((a) => a.value > 0)
      .map((entry) => {
        newEntry = {
          newValue: Math.max(maxValue + 1, entry.value),
          inputOrder: entry.inputOrder,
        };
        maxValue = newEntry.newValue;
        return newEntry;
      })
      .sort((a, b) => b.newValue - a.newValue)
      .reduce((agg, elem, key) => {
        agg[key] = {
          newValue: Math.min(elem.newValue, minVal - 1),
          inputOrder: elem.inputOrder,
        };
        if (agg[key].newValue > 0) {
          minVal = agg[key].newValue;
        }
        return agg;
      }, []);

    let NewShift_temp = [...Array(shifts.length).keys()].map((i) => {
      let line = NewOrder_Temp.filter((al) => al.inputOrder == i)[0];
      line = line || { newValue: 0 };
      return line.newValue;
    });

    // fill the gaps with the note inputed one
    nonGivenID = [...Array(shifts.length).keys()]
      .map((v) => v + 1)
      .filter((n) => !NewShift_temp.includes(n));

    shifts = NewShift_temp.map((v) => {
      if (v > 0) {
        return v;
      }
      // as nonGivenID is order from lower to highest, it will give the lower
      //    value first and remove it from the pool of nonGivenID
      return nonGivenID.splice(0, 1)[0];
    });
    console.log(shifts);
    // Reorder the list based on the new idex and then the old one (TODO : Not working if [3, 0, 2, 0, 0])
    NewOrder = [...Array(shifts.length).keys()];
    shifts.map((v, i) => {
      pos1 = NewOrder[i];
      pos2 = v - 1;
      //console.log(pos1, pos2);
      if (pos1 != pos2) {
        // swap items in DOM
        swapItems(pos1, pos2);
        //change place in NewOrder
        NewOrder[pos1] = pos2;
        NewOrder[pos2] = pos1;

        // do top slide transition
        transitionSlideItem(pos2, pos1 - pos2, true, 0.35);

        // do bottom slide transition
        transitionSlideItem(pos1, pos2 - pos1, false, 0.35);

        //focus the new modified possition
        items[pos2].querySelector("input").focus();
      }
    });
  }
}

function setupDragable() {
  // get wrapper and list element
  wrapper = document.querySelector(".rankings");
  oldList = wrapper.querySelector("ol");

  // get gap height
  setGapHeight();

  // create document fragment to build new DOM structure
  wrapperFrag = document.createDocumentFragment();

  // create application element
  let app = document.createElement("div");
  app.setAttribute("role", "application");
  app.setAttribute("aria-roledescription", "Reorderable List widget");
  app.setAttribute("aria-labelledby", "heading");
  //app.setAttribute('aria-describedby','instructions');
  wrapperFrag.appendChild(app);

  // create list element
  let list = document.createElement("div");
  list.setAttribute("role", "list");
  app.appendChild(list);

  // set up gap above list
  firstGap = setupGap(0);
  list.appendChild(firstGap);

  // loop through old list items and set up new ones
  items = oldList.querySelectorAll(".rankingsItemLowfi");
  for (let i = 0; i < items.length; i++) {
    setupItem(list, items[i], i);
  }
  // get updated array of items
  items = list.querySelectorAll(".rankingsItem");

  // make first item focusable initially
  items[0].tabIndex = 0;

  // set up escape element
  listEnd = document.createElement("div");
  listEnd.classList = "rankingsEnd visuallyHidden";
  listEnd.textContent = "End of Reorderable List widget.";
  listEnd.tabIndex = -1;
  wrapperFrag.appendChild(listEnd);

  // set up live region for accouncements
  status = document.createElement("div");
  status.classList = "rankingsStatus visuallyHidden";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "assertive");
  status.setAttribute("aria-atomic", "true");
  wrapperFrag.appendChild(status);

  // set initial vars
  curName = "";
  curItem = 0;
  curButton = null;
  grabCoords = { x: 0, y: 0 };

  // add new rankings DOM to page
  wrapper.innerHTML = "";
  wrapper.appendChild(wrapperFrag);

  // set up resize handler
  /*window.addEventListener('resize', debounce(() => {
		setGapHeight();
	}, 1000));*/
}

function addRankingsItem(markerNumber, nameText, imgSrc) {
  let nameId = "name" + markerNumber;
  let markerId = "marked" + markerNumber;
  let moveInputId = "move" + markerNumber;
  // Create the li element
  const rankingsItem = document.createElement("li");
  rankingsItem.className = "rankingsItemLowfi";
  rankingsItem.setAttribute("aria-labelledby", `${markerId} ${nameId}`);

  // Create the div for the marker
  const markerDiv = document.createElement("div");
  markerDiv.id = markerId;
  markerDiv.className = "rankingsItem--marker";
  markerDiv.textContent = `${markerNumber}.`;

  // Create the inner div
  const innerDiv = document.createElement("div");
  innerDiv.className = "rankingsItem--inner";

  // Create the div for the name
  const nameDiv = document.createElement("div");
  nameDiv.id = nameId;
  nameDiv.className = "rankingsItem--text";
  nameDiv.textContent = nameText;

  // Create the img element
  const img = document.createElement("img");
  img.className = "rankingsItem--photo";
  img.src = imgSrc;
  img.alt = "";
  img.width = 72;
  img.height = 72;
  img.hidden = true;

  // Create the move group div
  const moveGroupDiv = document.createElement("div");
  moveGroupDiv.className = "rankingsItem--moveGroup";

  // Create the label
  const label = document.createElement("label");
  label.setAttribute("for", moveInputId);
  label.innerHTML = `Move <span class="visuallyHidden">${nameText} </span> to:`;

  // Create the input element
  const input = document.createElement("input");
  input.type = "text";
  input.id = moveInputId;
  input.setAttribute("inputmode", "numeric");
  input.setAttribute("pattern", "[0-9]*");
  input.setAttribute("autocomplete", "off");

  // Append the label and input to the move group div
  moveGroupDiv.appendChild(label);
  moveGroupDiv.appendChild(input);

  // Append all the elements to the inner div
  innerDiv.appendChild(nameDiv);
  innerDiv.appendChild(img);
  innerDiv.appendChild(moveGroupDiv);

  // Append the marker div and inner div to the li element
  rankingsItem.appendChild(markerDiv);
  rankingsItem.appendChild(innerDiv);

  // Append the li element to the provided parent element
  oldList.appendChild(rankingsItem);

  //update item list
  items = oldList.querySelectorAll(".rankingsItemLowfi");
}
function setupList() {
  //remove all the elements in the oldList
  oldList.innerHTML = "";
  //Add an item per project
  Object.keys(ProjectsList).forEach((item, i) => {
    addRankingsItem(i + 1, ProjectsList[item].name, "");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // get wrapper and list element
  wrapper = document.querySelector(".rankings");
  oldList = wrapper.querySelector("ol");

  //Setup with the list of projects
  setupList();

  //get the list of items
  items = oldList.querySelectorAll(".rankingsItemLowfi");
  typeUI = //First look for URL, then in settings and finaly show draggable
    URLQueryParams.UI ||
    storage.getItem("typeUI_EditProjectList") ||
    "draggable";
  //if "typeUI"!="draggable in URL, Don't setup as dragable
  if (typeUI == "input") {
    //It's the case by default
  } else if (typeUI == "draggable") {
    setupDragable();
  } else {
    ShowToast(
      "The UI '" +
        typeUI +
        "' is not possible as typeUI. \
        You will be redirected to the default draggable UI",
      "Red"
    );
    setupDragable();
  }
});
