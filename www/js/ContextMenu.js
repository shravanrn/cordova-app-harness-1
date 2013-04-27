(function () {

    function xhrGet(url, successCallback){
        var xhr = new window.XMLHttpRequest();
        xhr.onreadystatechange = function()
        {
            if (xhr.readyState === 4 && xhr.status === 200)
            {
                successCallback(xhr.responseText);
            }
        };
        // retrieve the context menu
        xhr.open("GET", url, true);
        xhr.send();
    }

    function initialise() {
        xhrGet("cdv-app-harness:///direct/contextMenu.html", onInject);
        xhrGet("cdv-app-harness:///direct/js/ConsoleInterceptor.js", function(txt){
            /*jshint -W061 */
            eval(txt);
            console.log("Important: The in app console may not display messages logged at the very beginning of the app");
        });
    }

    function onInject(stringifiedHtml) {

        document.body.innerHTML += stringifiedHtml;

        var contextDiv = document.getElementById("__cordovaappharness_contextMenu_div");
        var consoleDiv = document.getElementById("__cordovaappharness_console_div");
        var consoleOpenButton = document.getElementById("__cordovaappharness_showConsole_button");
        var consoleDOMButton = document.getElementById("__cordovaappharness_consoleDOM_button");
        var consoleLogsButton = document.getElementById("__cordovaappharness_consoleLogs_button");
        var consoleCloseButton = document.getElementById("__cordovaappharness_consoleClose_button");
        var consoleDOMText = document.getElementById("__cordovaappharness_consoleDOM_text");
        var consoleLogsText = document.getElementById("__cordovaappharness_consoleLogs_text");

        // Setup the listeners to toggle the context menu
        document.addEventListener("touchmove", function (event) {
            if(event.touches.length >= 3) {
                contextDiv.style.display = "inline";
            }
        }, false);

        contextDiv.onclick = function() {
            contextDiv.style.display = "none";
        };

        // Console listeners

        var consoleUpdateId;

        function updateLogText(updateObj){
            consoleLogsText.value += getStringFromConsoleObjArray([updateObj]);
        }

        consoleOpenButton.onclick = function(){
            consoleDiv.style.display = "inline";
            consoleDOMText.value = document.documentElement.innerHTML;
            consoleLogsText.value = getStringFromConsoleObjArray(console.__getConsoleInterceptorContents());
            consoleUpdateId = console.__registerConsoleInterceptorListener(updateLogText);
        };
        consoleDOMButton.onclick = function(){
            consoleLogsText.style.display = "none";
            consoleDOMText.style.display = "inline";
        };
        consoleLogsButton.onclick = function(){
            consoleDOMText.style.display = "none";
            consoleLogsText.style.display = "inline";
        };
        consoleCloseButton.onclick = function(){
            consoleDiv.style.display = "none";
            console.__unregisterConsoleInterceptorListener(consoleUpdateId);
        };
    }


    function _jsonReplacer(key) {
        // Don't use the value passed in since it has already gone through toJSON().
        var value = this[key];
        // Refer to:
        // chrome/src/content/renderer/v8_value_converter_impl.cc&l=165
        if (value && (typeof value == "object" || typeof value == "function")) {
            var typeName = Object.prototype.toString.call(value).slice(8, -1);
            if (typeName != "Array" && typeName != "Object") {
                value = {};
            }
        }
        return value;
    }

    function getGroupString(groupLevel){
        var str = "";
        for(var i = 0; i < groupLevel; i++) {
            str += "\t";
        }
        return str;
    }

    function getStringFromConsoleObjArray(arr){
        var ret = "";
        for(var i = 0; i < arr.length; i++) {
            var o = arr[i];
            ret += getGroupString(o.group) + o.level + ": ";
            if(typeof o.param === "string") {
                ret += o.param;
            } else {
                ret += JSON.stringify(o.param, _jsonReplacer);
            }
            ret += "\n\n";
        }
        return ret;
    }

    initialise();
})();

