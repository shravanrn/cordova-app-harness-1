(function() {
    "use strict";

    /* global myApp */
    myApp.factory("ResourcesLoader", [ "$window", "$document", function ($window, $document) {
        var fs;
        var initialised = false;

        function initialise() {
            initialised = true;

            var failedFileSystemLookUp = function (error) {
                var errorString = "An error occurred while reading the file system.";
                if(error) {
                    errorString += " " + JSON.stringify(error);
                }
                console.error(errorString);
            };

            var success = function(_fs) {
                fs = _fs;
            };

            try {
                $window.requestFileSystem($window.LocalFileSystem.PERSISTENT, 0, success, failedFileSystemLookUp);
            } catch (e) {
                failedFileSystemLookUp(e);
            }
        }

        $document.bind("deviceready", function() { initialise(); });

        //promise returns full path to downloaded file
        function downloadFromUrl(url, fullFilePath) {
            var deferred = Q.defer();

            var downloadFail = function(error) {
                var str = "There was an error while downloading the file " + JSON.stringify(error);
                deferred.reject(new Error(str));
            };

            var downloadSuccess = function(fileEntry) {
                deferred.resolve(fileEntry.fullPath);
            };

            var fileTransfer = new $window.FileTransfer();
            var uri = encodeURI(url);
            fileTransfer.download(uri, fullFilePath, downloadSuccess, downloadFail);
            return deferred.promise;
        }

        function trim(str) {
            return str && str.replace(/^\s+|\s+$/g, "");
        }

        function makeRelativeToRoot(path) {
            if(path && (path.charAt(0) === "/")) {
                path = path.substring(1);
            } else if(path && path.substring(0, 8) === "file:///") {
                path = path.substring(8);
            }
            return path;
        }

        //promise returns the file entry
        function getFileEntry(fileName) {
            var deferred = Q.defer();

            var errorWhileGettingFileEntry = function(error) {
                var str = "There was an error while getting the file entry for file " + fileName + " " + JSON.stringify(error);
                deferred.reject(new Error(str));
            };
            var success = function(fileEntry) {
                deferred.resolve(fileEntry);
            };
            fs.root.getFile(fileName, {create: true, exclusive: false}, success, errorWhileGettingFileEntry);
            return deferred.promise;
        }

        //promise returns the file
        function getFile(fileName) {
            return getFileEntry(fileName).
            then(function(fileEntry){
                var deferred = Q.defer();

                var errorWhileGettingFile = function(error) {
                    var str = "There was an error while getting the file for file " + fileName + " " + JSON.stringify(error);
                    deferred.reject(new Error(str));
                };

                fileEntry.file(deferred.resolve, errorWhileGettingFile);
                return deferred.promise;
            });
        }

        function truncateToDirectoryPath(path) {
            //remove the filename if it exists
            var lastLevelIndex = path.search(/[\w ]+(\.[\w ]+)+$/g);
            if(lastLevelIndex !== -1) {
                path = path.substring(0, lastLevelIndex);
            }
            return path;
        }

        return {
            // returns a promise with a full path to the dir
            ensureDirectoryExists : function(directory) {
                var deferred = Q.defer();

                directory = truncateToDirectoryPath(directory);
                directory = makeRelativeToRoot(directory);

                var gotDirEntry = function(dirEntry) {
                    deferred.resolve(dirEntry.fullPath);
                };

                var failedToGetDirEntry = function(error) {
                    var str = "There was an error checking the directory: " + directory + " " + JSON.stringify(error);
                    deferred.reject(new Error(str));
                };

                fs.root.getDirectory(directory, {create: true, exclusive: false}, gotDirEntry, failedToGetDirEntry);
                return deferred.promise;
            },

            // promise returns full path to file
            getFullFilePath : function(filePath) {
                var deferred = Q.defer();

                // Use the file's parent folder to get the full path
                var directory = filePath;
                var fileName = "";

                //remove the filename if it exists
                var lastLevelIndex = directory.search(/\/[\w ]+\.[\w ]+$/g);
                if(lastLevelIndex !== -1) {
                    directory = filePath.substring(0, lastLevelIndex);
                    fileName = filePath.substring(lastLevelIndex + 1);
                }

                //we need the directory name w.r.t the root, so remove any slashes in the beginning
                if(directory.indexOf("/") === 0) {
                    directory = directory.substring(1);
                }

                var gotFullPath = function(dirEntry) {
                    var fullFilePath = dirEntry.fullPath + "/" + fileName;
                    deferred.resolve(fullFilePath);
                };

                var failedToGetFullPath = function(error) {
                    var str = "There was an error getting the full path of file: " + filePath + " " + JSON.stringify(error);
                    deferred.reject(new Error(str));
                };

                fs.root.getDirectory(directory, {create: true, exclusive: false}, gotFullPath, failedToGetFullPath);
                return deferred.promise;
            },

            // returns a promise with a full path to the downloaded file
            downloadFromUrl : function(url, filePath) {
                var self = this;
                return this.ensureDirectoryExists(filePath)
                .then(function(){
                    return self.getFullFilePath(filePath);
                })
                .then(function(fullFilePath){
                    return downloadFromUrl(url, fullFilePath);
                });
            },

            //returns a promise with the contents of the file
            readFileContents : function(fileName) {
                return getFile(fileName)
                .then(function(file){
                    var deferred = Q.defer();

                    var reader = new $window.FileReader();
                    reader.onload = function(evt) {
                        var text = evt.target.result;
                        deferred.resolve(text);
                    };
                    reader.onerror = function(evt) {
                        deferred.reject(new Error(evt));
                    };
                    reader.readAsText(file);

                    return deferred.promise;
                });
            },

            //returns a promise with the json contents of the file
            readJSONFileContents : function(fileName) {
                return this.readFileContents(fileName)
                .then(function (text) {
                    text = trim(text);
                    var resultJson = {};
                    if(text) {
                        resultJson = JSON.parse(text);
                    }
                    return resultJson;
                });
            },

            //returns a promise when file is written
            writeFileContents : function(fileName, contents) {
                return getFileEntry(fileName)
                .then(function(fileEntry){
                    var deferred = Q.defer();

                    var errorGettingFileWriter = function(error) {
                        var str = "There was an error writing the file." + JSON.stringify(error);
                        deferred.reject(new Error(str));
                    };

                    var gotFileWriter = function(writer) {
                        writer.onwrite = deferred.resolve;
                        writer.onerror = function(evt) {
                            deferred.reject(new Error(evt));
                        };
                        writer.write(contents);
                    };
                    fileEntry.createWriter(gotFileWriter, errorGettingFileWriter);
                    return deferred.promise;
                });
            },

            //returns a promise when json file is written
            writeJSONFileContents : function(fileName, contents) {
                var stringContents;
                if(typeof contents === "string") {
                    stringContents = contents;
                } else {
                    stringContents = JSON.stringify(contents);
                }
                return this.writeFileContents(fileName, stringContents);
            }
        };
    }]);

})();