Tests = {
  autorun : true,
  message : null,

  startUnit : function(){ return []; },
  setup : function() { return arguments; },
  teardown : function() {},
  endUnit : function() {}
}

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

  var setup_args = [];
    
  if (Tests.startUnit != null) {
    __testLog__ = document.createElement('div');
    try {
      setup_args = Tests.startUnit();
    } catch(e) {
      testFailed("startUnit", e.toString());
      log.appendChild(__testLog__);
      printTestStatus();
      return;
    }
  }
  
  
  for (var i in Tests) {
    if (i.substring(0,4) != "test") continue;
    __testLog__ = document.createElement('div');
    __testSuccess__ = true;
    try {
      var args = setup_args;
      if (Tests.setup != null)
        args = Tests.setup.apply(Tests, setup_args);
      Tests[i].apply(Tests, args);
      if (Tests.teardown != null)
        Tests.teardown.apply(Tests, args);
    }
    catch (e) { testFailed(i, e.toString()); }
    if (__testSuccess__ == false) {
      var h = document.createElement('h2');
      h.textContent = i;
      __testLog__.insertBefore(h, __testLog__.firstChild);
      log.appendChild(__testLog__);
    }
  }
  
  printTestStatus();
  if (Tests.endUnit != null) {
    __testLog__ = document.createElement('div');
    try {
      Tests.endUnit.apply(Tests, setup_args);
    } catch(e) {
      testFailed("endUnit", e.toString());
      log.appendChild(__testLog__);
    }
  }
}

function testFailed(assertName, name) {
  var d = document.createElement('div');
  var h = document.createElement('h3');
  h.textContent = name==null ? assertName : name + " (in " + assertName + ")";
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

function log(msg) {
  var p = document.createElement('p');
  p.textContent = msg;
  __testLog__.appendChild(p);
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




function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  if (!shaderScript) {
    log("No shader element with id: "+id);
    return null;
  }

  var str = "";
  var k = shaderScript.firstChild;
  while (k) {
    if (k.nodeType == 3)
      str += k.textContent;
    k = k.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    log("Unknown shader type "+shaderScript.type);
    return null;
  }

  gl.shaderSource(shader, str);
  gl.compileShader(shader);

  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) != 1) {
    log("Failed to compile shader "+shaderScript.id);
    log("Shader info log: " + gl.getShaderInfoLog(shader));
  }
  return shader;
}

function loadShader(gl) {
    var id = gl.createProgram();
    var shaderObjs = [];
    for (var i=1; i<arguments.length; ++i) {
      var sh = getShader(gl, arguments[i]);
      shaderObjs.push(sh);
      gl.attachShader(id, sh);
    }
    gl.linkProgram(id);
    gl.validateProgram(id);
    if (gl.getProgramParameter(id, gl.LINK_STATUS) != 1 ||
        gl.getProgramParameter(id, gl.VALIDATE_STATUS) != 1) {
      log("Failed to compile shader");
    }
    return {program: id, shaders: shaderObjs};
}

function deleteShader(gl, sh) {
  gl.useProgram(0);
  sh.shaders.forEach(function(s){
    gl.detachShader(sh.program, s);
    gl.deleteShader(s);
  });
  gl.deleteProgram(sh.program);
}

GL_CONTEXT_ID = 'moz-glweb20'

function initTests() {
  if (Tests.message != null) {
    var h = document.getElementById('test-message');
    if (h == null) {
      h = document.createElement('p');
      h.id = 'test-message';
      document.body.appendChild(h);
    }
    h.textContent = Tests.message;
  }
  if (Tests.autorun) {
    runTests();
  } else {
    var h = document.getElementById('test-run');
    if (h == null) {
      h = document.createElement('input');
      h.type = 'submit';
      h.value = "Run tests";
      h.addEventListener('click', function(ev){
        runTests();
        ev.preventDefault();
      }, false);
      h.id = 'test-run';
      document.body.appendChild(h);
    }
    h.textContent = Tests.message;
  }
  
}


window.addEventListener('load', initTests, false);
