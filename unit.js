Tests = {}

var __testSuccess__ = true;
var __testLog__;

function runTests() {
  var h = document.getElementById('test-status');
  if (h == null) {
    h = document.createElement('h1');
    h.id = 'test-status';
    document.body.appendChild(h);
  }
  h.textContent = "";
  var log = document.getElementById('test-log');
  if (log == null) {
    log = document.createElement('div');
    log.id = 'test-log';
    document.body.appendChild(log);
  }
  while (log.childNodes.length > 0)
    log.removeChild(log.firstChild);
  for (var i in Tests) {
    __testLog__ = document.createElement('div');
    __testSuccess__ = true;
    try { Tests[i](); }
    catch (e) { testFailed(i, e); }
    if (__testSuccess__ == false) {
      var h = document.createElement('h2');
      h.textContent = i;
      __testLog__.insertBefore(h, __testLog__.firstChild);
      log.appendChild(__testLog__);
    }
  }
  printTestStatus();
}

function testFailed(assertName, name) {
  var d = document.createElement('div');
  var h = document.createElement('h3');
  h.textContent = name==null ? assertName : name + " " + assertName;
  d.appendChild(h);
  for (var i=2; i<arguments.length; i++) {
    var a = arguments[i];
    var p = document.createElement('p');
    p.textContent = (a == null) ? "null" :
                    (typeof a == 'boolean') ? a : a.toSource();
    d.appendChild(p);
  }
  __testLog__.appendChild(d);
  __testSuccess__ = false;
}

function checkTestSuccess() {
  var log = document.getElementById('test-log');
  return (log.childNodes.length == 0)
}

function printTestStatus() {
  var status = document.getElementById('test-status');
  document.body.className = checkTestSuccess() ? 'ok' : 'fail';
  status.textContent = checkTestSuccess() ? "OK" : "FAIL";
}

function assertFail(name, f) {
  if (f == null) { f = name; name = null; }
  var r = false;
  try { f(); } catch(e) { r=true; }
  if (!r) {
    testFailed("assertFail", name, f);
    return false;
  } else {
    return true;
  }
}

function assertOk(name, f) {
  if (f == null) { f = name; name = null; }
  var r = false;
  var err;
  try { f(); r=true; } catch(e) { err = e; }
  if (!r) {
    testFailed("assertOk", name, f, err.toString());
    return false;
  } else {
    return true;
  }
}

function assert(name, v) {
  if (v == null) { v = name; name = null; }
  if (!v) {
    testFailed("assert", name, v)
    return false;
  } else {
    return true;
  }
}

function assertProperty(name, v, p) {
  if (p == null) { p = v; v = name; name = p; }
  if (v[p] == null) {
    testFailed("assertProperty", name)
    return false;
  } else {
    return true;
  }
}

function assertEquals(name, v, p) {
  if (p == null) { p = v; v = name; name = null; }
  if (v != p) {
    testFailed("assertEquals", name, v, p)
    return false;
  } else {
    return true;
  }
}

window.addEventListener('load', runTests, false);
