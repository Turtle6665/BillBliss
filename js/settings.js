// settgins
let DarkModeSettingSwitch = document.getElementById("DarkModeSettingSwitch");
let localStorageSettingSwitch = document.getElementById(
  "localStorageSettingSwitch",
);

function saveSettings() {
  //localStorage acceptation
  if (
    localStorageSettingSwitch.getElementsByTagName("input")[0].checked &
    !storage.old_LS_accepted
  ) {
    storage.acceptLocalStorage();
  } else if (
    !localStorageSettingSwitch.getElementsByTagName("input")[0].checked &
    storage.old_LS_accepted
  ) {
    storage.denyLocalStorage();
  }

  //choose lightdarkmode
  storage.setItem("DarkMode", DarkModeSettingSwitch.getElementsByTagName("input")[0].checked);
  switchDarkMode();

  ShowToast("Settings updated", "Green");
}

//to update the settings on the page
function updateSettings(toast = true) {
  DarkModeSettingSwitch.getElementsByTagName("input")[0].checked =
    storage.getItem("DarkMode") || false;

  localStorageSettingSwitch.getElementsByTagName("input")[0].checked =
    storage.old_LS_accepted;

  if (toast) {
    ShowToast("Change in settings canceled", "Red");
  }
}

updateSettings(false);
