(function() {
    var TEMP_DIRECTORY = "cordova_app_harness_tempDir/";
    var INSTALL_DIRECTORY = "cordova_app_harness_installed_apps/";
    var APPS_JSON = "cordova_app_harness_installed_apps/apps.json";

    /* global myApp */
    myApp.value("TEMP_DIRECTORY", TEMP_DIRECTORY);
    myApp.value("INSTALL_DIRECTORY", INSTALL_DIRECTORY);
    myApp.value("APPS_JSON", APPS_JSON);
})();