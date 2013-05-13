(function() {
    "use strict";
    /* global myApp */
    myApp.factory("ContextMenuInjectScript", [ function () {
        var toInject = function() {
            console.log("Injecting menu script");
            var contextScript = document.createElement("script");
            contextScript.setAttribute("type","text/javascript");
            contextScript.setAttribute("src", "app-bundle:///cdvah_js/ContextMenu.js");
            window.__cordovaAppHarnessAppName = "appPlaceHolder";
            document.getElementsByTagName("head")[0].appendChild(contextScript);
        };

        return {
            getInjectString : function(appName){
                var string = "\n(" + toInject.toString() + ")();";
                string = string.replace("appPlaceHolder", appName);
                return string;
            }
        };
    }]);
})();