(function(){

    var savedConsole = {
        debug : window.console.debug,
        error : window.console.error,
        info  : window.console.info,
        log   : window.console.log,
        warn  : window.console.warn,
        group : window.console.group,
        groupEnd : window.console.groupEnd
    };

    var contents = [];
    var groupLevel = 0;
    var listeners = [];

    function callListeners(newContents){
        for(var i = 0; i < listeners.length; i++){
            //suppress any errors so that we don't crash
            try {
                listeners[i](newContents);
            } catch(e) {}
        }
    }

    window.console.debug = function(str){
        var newContents = { level : "debug", param : str, group : groupLevel};
        contents.push(newContents);
        savedConsole.debug.apply(this, arguments);
        callListeners(newContents);
    };
    window.console.error = function(str){
        var newContents = { level : "error", param : str, group : groupLevel};
        contents.push(newContents);
        savedConsole.error.apply(this, arguments);
        callListeners(newContents);
    };
    window.console.info = function(str){
        var newContents = { level : "info", param : str, group : groupLevel};
        contents.push(newContents);
        savedConsole.info.apply(this, arguments);
        callListeners(newContents);
    };
    window.console.log = function(str){
        var newContents = { level : "log", param : str, group : groupLevel};
        contents.push(newContents);
        savedConsole.log.apply(this, arguments);
        callListeners(newContents);
    };
    window.console.warn = function(str){
        var newContents = { level : "warn", param : str, group : groupLevel};
        contents.push(newContents);
        savedConsole.warn.apply(this, arguments);
        callListeners(newContents);
    };
    window.console.group = function(){
        groupLevel++;
        savedConsole.group.apply(this, arguments);
    };
    window.console.groupEnd = function(){
        if(groupLevel > 0){
            groupLevel--;
        }
        savedConsole.groupEnd.apply(this, arguments);
    };
    window.onerror = function(msg, url, line) {
        var errorObj = { msg: msg, url : url, line : line };
        var newContents = { level : "error", param : errorObj, group : groupLevel, windowError : true};
        contents.push(newContents);
        callListeners(newContents);
    };
    // Add a few custom functions to interact
    window.console.__clearConsoleInterceptorContents = function(){
        contents = [];
    };
    window.console.__getConsoleInterceptorContents = function(){
        return contents;
    };
    window.console.__registerConsoleInterceptorListener = function(listener){
        if(!listener || typeof(listener) !== "function") {
            return;
        }
        listeners.push(listener);
        return listeners.length - 1;
    };
    window.console.__unregisterConsoleInterceptorListener = function(number){
        if(number > -1 && number < listeners.length) {
            listeners.slice(number, 1);
        }
    };
})();