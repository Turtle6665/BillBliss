// settgins
let DarkModeSettingSwitch = document.getElementById("DarkModeSettingSwitch");
let localStorageSettingSwitch = document.getElementById(
  "localStorageSettingSwitch",
);

function saveSettings() {
  //choose lightdarkmode
  let DarkMode = DarkModeSettingSwitch.getElementsByTagName("input")[0].checked
  storage.setItem("DarkMode", DarkMode);

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

  bc.postMessage(["SettingsUpdated", "DarkMode", DarkMode]);

  ShowToast("Settings updated", "Green");
}

//to update the settings on the page
function updateSettings(toast = true) {
  DarkModeSettingSwitch.getElementsByTagName("input")[0].checked =
    getFirstBoolean([
      storage.getItem("DarkMode"),
      window.matchMedia("(prefers-color-scheme: dark)").matches]);
  switchDarkMode();

  localStorageSettingSwitch.getElementsByTagName("input")[0].checked =
    storage.old_LS_accepted;

  if (toast) {
    ShowToast("Change in settings canceled", "Red");
  }
}

function PreviewDarkMode(){
  let darkmode = DarkModeSettingSwitch.getElementsByTagName('input')[0].checked
  switchDarkMode(darkmode);
  if (darkmode) {
    ShowToast("DarkMode previewed","Orange");
  } else {
    ShowToast("LightMode previewed","Orange");
  }
}

updateSettings(false);
