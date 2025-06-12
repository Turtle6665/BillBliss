// This file aims at making one config file for used URLS or data accros the
// webapp

//setup values
const IhmUrl = "ihatemoney.org"; // do not type in the https/http
let apiUrl = "https://" + IhmUrl + "/api/";

//Service worker options
const Testing = false; // If true, no data is cashed by service ServiceWorker
const CACHE_VERSION = "0.1.9";
//                        used to allows quicker updated when testing.
