// This file aims at making one config file for used URLS or data accros the
// webapp

//setup values
const IhmUrl = "ihatemoney.org"; // do not type in the https/http
const apiUrl = "https://" + IhmUrl + "/api/";

//Service worker options
const CACHE_VERSION = "0.1.8";
const Testing = false; // If true, no data is cashed by service ServiceWorker
//                        used to allows quicker updated when testing.
