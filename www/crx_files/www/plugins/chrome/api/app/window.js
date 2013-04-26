cordova.define("chrome.app.window", function(require, exports, module) {// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var Event = require('chrome.common.events');
var mobile = require('chrome.mobile.impl');

// The AppWindow created by chrome.app.window.create.
var createdAppWindow = null;
var dummyNode = document.createElement('a');

function AppWindow() {
  this.contentWindow = mobile.fgWindow;
  this.id = '';
}

function unsupportedApi(api) {
  return function() {
    console.warn(api + ' is not supported on mobile.');
  };
}

AppWindow.prototype = {
  restore: unsupportedApi('AppWindow.restore'),
  moveTo: unsupportedApi('AppWindow.moveTo'),
  clearAttention: unsupportedApi('AppWindow.clearAttention'),
  minimize: unsupportedApi('AppWindow.minimize'),
  drawAttention: unsupportedApi('AppWindow.drawAttention'),
  focus: unsupportedApi('AppWindow.focus'),
  resizeTo: unsupportedApi('AppWindow.resizeTo'),
  maximize: unsupportedApi('AppWindow.maximize'),
  close: unsupportedApi('AppWindow.close'),
  setBounds: unsupportedApi('AppWindow.setBounds'),
  onBoundsChanged: new Event('onBoundsChanged'),
  onClosed: new Event('onClosed')
};
AppWindow.prototype.getBounds = function() {
  return {
    width: 0,
    height: 0,
    left: 0,
    top: 0
  };
};

function copyAttributes(srcNode, destNode) {
  var attrs = srcNode.attributes;
  for (var i = 0, attr; attr = attrs[i]; ++i) {
    destNode.setAttribute(attr.name, attr.value);
  }
}

function applyAttributes(attrText, destNode) {
  dummyNode.innerHTML = '<a ' + attrText + '>';
  copyAttributes(dummyNode.firstChild, destNode);
}

// Evals the scripts serially since sometimes browsers don't execute
// them in the order they are injected :(.
// TODO: This is clearly slower for multiple scripts. We could maybe see if
// injecting after DOM mutation events fire?
function evalScripts(rootNode, afterFunc) {
  var scripts = Array.prototype.slice.call(rootNode.getElementsByTagName('script'));
  var doc = rootNode.ownerDocument;
  function helper() {
    var script = scripts.shift();
    if (!script) {
      afterFunc && afterFunc();
      // Don't bother with inline scripts since they aren't evalled on desktop.
    } else if (script.src) {
      var replacement = doc.createElement('script');
      copyAttributes(script, replacement);
      replacement.onload = helper;
      script.parentNode.replaceChild(replacement, script);
    } else {
      helper();
    }
  }
  helper();
}

function rewritePage(pageContent, filePath) {
  var fgBody = mobile.fgWindow.document.body;
  var fgHead = fgBody.previousElementSibling;

  // fgHead.innerHTML causes a DOMException on Android 2.3.
  while (fgHead.lastChild) {
    fgHead.removeChild(fgHead.lastChild);
  }

  var startIndex = pageContent.search(/<html([\s\S]*?)>/i);
  if (startIndex != -1) {
    startIndex += RegExp.lastMatch.length;
    // Copy over the attributes of the <html> tag.
    applyAttributes(RegExp.lastParen, fgBody.parentNode);
  } else {
    startIndex = 0;
  }

  function afterBase() {
    fgHead.insertAdjacentHTML('beforeend', headHtml);
    evalScripts(fgHead, function() {
      mobile.eventIframe.insertAdjacentHTML('afterend', pageContent);
      evalScripts(fgBody)
    });
  }
  // Put everything before the body tag in the head.
  var endIndex = pageContent.search(/<body([\s\S]*?)>/i);
  if (endIndex == -1) {
    mobile.eventIframe.insertAdjacentHTML('afterend', 'Load error: Page is missing body tag.');
  } else {
    applyAttributes(RegExp.lastParen, fgBody);

    // Don't bother removing the <body>, </body>, </html>. The browser's sanitizer removes them for us.
    var headHtml = pageContent.slice(startIndex, endIndex);
    pageContent = pageContent.slice(endIndex);

    fgHead.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="chromeappstyles.css">');
    var baseUrl = filePath.replace(/\/.*?$/, '');
    if (baseUrl != filePath) {
      fgHead.insertAdjacentHTML('beforeend', '<base href="' + encodeURIComponent(baseUrl) + '/">\n');
      // setTimeout required for <base> to take effect for <link> elements (browser bug).
      window.setTimeout(afterBase, 0);
    } else {
      afterBase();
    }
  }
}

exports.create = function(filePath, options, callback) {
  if (createdAppWindow) {
    console.log('ERROR - chrome.app.window.create called multiple times. This is unsupported.');
    return;
  }
  createdAppWindow = new AppWindow();
  var xhr = new XMLHttpRequest();
  xhr.open('GET', filePath, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      // Call the callback before the page contents loads.
      if (callback) {
        callback(createdAppWindow);
      }
      var pageContent = xhr.responseText || 'Page load failed.';
      rewritePage(pageContent, filePath);
      cordova.fireWindowEvent('DOMContentReady');
      cordova.fireWindowEvent('load');
    }
  };
  xhr.send();
};

exports.current = function() {
  return window == mobile.fgWindow ? createdAppWindow : null;
};
});
