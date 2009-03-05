
function loadTexture(gl, elem) {
  var tex = gl.genTextures(1)[0];
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2DHTML(gl.TEXTURE_2D, elem);
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  return tex;
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

function loadShaderArray(gl, shaders) {
  var id = gl.createProgram();
  var shaderObjs = [];
  for (var i=0; i<shaders.length; ++i) {
    var sh = getShader(gl, shaders[i]);
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
function loadShader(gl) {
  var sh = [];
  for (var i=1; i<arguments.length; ++i)
    sh.push(arguments[i]);
  return loadShaderArray(gl, sh);
}

function deleteShader(gl, sh) {
  gl.useProgram(0);
  sh.shaders.forEach(function(s){
    gl.detachShader(sh.program, s);
    gl.deleteShader(s);
  });
  gl.deleteProgram(sh.program);
}

function checkError(gl, msg) {
  var e = gl.getError();
  if (e != 0) {
    log("Error " + e + " at " + msg);
  }
}

Math.cot = function(z) { return 1.0 / Math.tan(z); }


Matrix = {
  identity : [
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  ],

  make3x3 : function(m) {
    return [
      m[0], m[1], m[2],
      m[4], m[5], m[6],
      m[8], m[9], m[10]
    ];
  },

  // orthonormal matrix inverse
  inverse4x4ON : function(m) {
    var n = this.transpose(m);
    var t = [m[12], m[13], m[14]];
    n[3] = n[7] = n[11] = 0;
    n[12] = -Vec3.dot([n[0], n[4], n[8]], t);
    n[13] = -Vec3.dot([n[1], n[5], n[9]], t);
    n[14] = -Vec3.dot([n[2], n[6], n[10]], t);
    return n;
  },

  frustum : function (left, right, bottom, top, znear, zfar) {
    var X = 2*znear/(right-left);
    var Y = 2*znear/(top-bottom);
    var A = (right+left)/(right-left);
    var B = (top+bottom)/(top-bottom);
    var C = -(zfar+znear)/(zfar-znear);
    var D = -2*zfar*znear/(zfar-znear);

    return [
      X, 0, 0, 0,
      0, Y, 0, 0,
      A, B, C, -1,
      0, 0, D, 0
    ];
 },

  perspective : function (fovy, aspect, znear, zfar) {
    var ymax = znear * Math.tan(fovy * Math.PI / 360.0);
    var ymin = -ymax;
    var xmin = ymin * aspect;
    var xmax = ymax * aspect;

    return this.frustum(xmin, xmax, ymin, ymax, znear, zfar);
  },

  mul4x4 : function (a, b) {
    c = new Array(16);
    for (var i=0; i<4; ++i) {
      for (var j=0; j<4; ++j) {
        var v = 0;
        for (var k=0; k<4; ++k)
          v += b[i*4+k] * a[k*4+j];
        c[i*4+j] = v;
      }
    }
    return c;
  },

  mulv4 : function (a, v) {
    c = new Array(4);
    for (var i=0; i<4; ++i) {
      var x = 0;
      for (var k=0; k<4; ++k)
        x += v[k] * a[k*4+i];
      c[i] = x;
    }
    return c;
  },

  rotate : function (angle, axis) {
    axis = Vec3.normalize(axis);
    var x=axis[0], y=axis[1], z=axis[2];
    var c = Math.cos(angle);
    var c1 = 1-c;
    var s = Math.sin(angle);
    return [
      x*x*c1+c, y*x*c1+z*s, z*x*c1-y*s, 0,
      x*y*c1-z*s, y*y*c1+c, y*z*c1+x*s, 0,
      x*z*c1+y*s, y*z*c1-x*s, z*z*c1+c, 0,
      0,0,0,1
    ];
  },

  scale : function(v) {
    return [
      v[0], 0, 0, 0,
      0, v[1], 0, 0,
      0, 0, v[2], 0,
      0, 0, 0, 1
    ];
  },
  scale3 : function(x,y,z) {
    return [
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1
    ];
  },
  scale1 : function(s) {
    return [
      s, 0, 0, 0,
      0, s, 0, 0,
      0, 0, s, 0,
      0, 0, 0, 1
    ];
  },

  translate3 : function(x,y,z) {
    return [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1
    ];
  },

  translate : function(v) {
    return this.translate3(v[0], v[1], v[2]);
  },

  lookAt : function (eye, center, up) {
    var z = Vec3.direction(eye, center);
    var x = Vec3.normalizeInPlace(Vec3.cross(up, z));
    var y = Vec3.normalizeInPlace(Vec3.cross(z, x));

    var m = [
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      0, 0, 0, 1
    ];

    var t = [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      -eye[0], -eye[1], -eye[2], 1
    ];

    return this.mul4x4(m,t);
  },

  transpose : function(m) {
    return [
      m[0], m[4], m[8], m[12],
      m[1], m[5], m[9], m[13],
      m[2], m[6], m[10], m[14],
      m[3], m[7], m[11], m[15]
    ]
  }
}

Vec3 = {
  make : function() { return [0,0,0]; },
  copy : function(v) { return [v[0],v[1],v[2]]; },

  add : function (u,v) {
    return [u[0]+v[0], u[1]+v[1], u[2]+v[2]];
  },

  sub : function (u,v) {
    return [u[0]-v[0], u[1]-v[1], u[2]-v[2]];
  },

  negate : function (u) {
    return [-u[0], -u[1], -u[2]];
  },

  direction : function (u,v) {
    return this.normalizeInPlace(this.sub(u,v));
  },

  normalizeInPlace : function(v) {
    var imag = 1.0 / Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    v[0] *= imag; v[1] *= imag; v[2] *= imag;
    return v;
  },

  normalize : function(v) {
    return this.normalizeInPlace(this.copy(v));
  },

  scale : function(f, v) {
    return [f*v[0], f*v[1], f*v[2]];
  },

  dot : function(u,v) {
    return u[0]*v[0] + u[1]*v[1] + u[2]*v[2];
  },

  inner : function(u,v) {
    return [u[0]*v[0], u[1]*v[1], u[2]*v[2]];
  },

  cross : function(u,v) {
    return [
      u[1]*v[2] - u[2]*v[1],
      u[2]*v[0] - u[0]*v[2],
      u[0]*v[1] - u[1]*v[0]
    ];
  }
}

Shader = function(gl){
  this.gl = gl;
  this.shaders = [];
  for (var i=1; i<arguments.length; i++) {
    this.shaders.push(arguments[i]);
  }
}
Shader.prototype = {
  id : null,
  gl : null,
  compiled : false,
  shader : null,
  shaders : [],

  destroy : function() {
    if (this.shader != null) deleteShader(this.gl, this.shader);
  },

  compile : function() {
    this.shader = loadShaderArray(this.gl, this.shaders);
  },

  use : function() {
    if (this.shader == null)
      this.compile();
    this.gl.useProgram(this.shader.program);
  },

  uniformf : function(name, value, elementSize, elementCount) {
    var loc = this.gl.getUniformLocation(this.shader.program, name);
    if (elementSize == null)
      this.gl.uniformf(loc, value);
    else
      this.gl.uniformf(loc, elementSize, elementCount, value);
  },

  uniformi : function(name, value, elementSize, elementCount) {
    var loc = this.gl.getUniformLocation(this.shader.program, name);
    if (elementSize == null)
      this.gl.uniformi(loc, value);
    else
      this.gl.uniformi(loc, elementSize, elementCount, value);
  },

  uniformMatrix : function(name, value) {
    var loc = this.gl.getUniformLocation(this.shader.program, name);
    this.gl.uniformMatrix(loc, value);
  },

  attrib : function(name) {
    return this.gl.getAttribLocation(this.shader.program, name);
  },

  uniform : function(name) {
    return this.gl.getUniformLocation(this.shader.program, name);
  }
}
Filter = function(gl, shader) {
  Shader.apply(this, arguments);
}
Filter.prototype = new Shader();
Filter.prototype.apply = function(init) {
  this.use();
  var va = this.attrib("Vertex");
  var ta = this.attrib("Tex");
  this.gl.vertexAttribPointer(va, 3, this.gl.FLOAT, Quad.vertices);
  this.gl.vertexAttribPointer(ta, 2, this.gl.FLOAT, Quad.texcoords);
  this.gl.enableVertexAttribArray(va);
  this.gl.enableVertexAttribArray(ta);
  if (init) init(this);
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
}

FBO = function(gl, width, height, use_depth) {
  this.gl = gl;
  this.width = width;
  this.height = height;
  if (use_depth != null)
    this.useDepth = use_depth;
}
FBO.prototype = {
  initialized : false,
  useDepth : true,
  fbo : null,
  rbo : null,
  texture : null,

  destroy : function() {
    if (this.fbo) this.gl.deleteFramebuffers([this.fbo]);
    if (this.rbo) this.gl.deleteRenderbuffers([this.rbo]);
    if (this.texture) this.gl.deleteTextures([this.texture]);
  },

  init : function() {
    var gl = this.gl;
    var w = this.width, h = this.height;
    var fbo = this.fbo != null ? this.fbo : gl.genFramebuffers(1)[0];
    var rb;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    if (this.useDepth) {
      rb = this.rbo != null ? this.rbo : gl.genRenderbuffers(1)[0];
      gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
      checkError(gl, "FBO.init depth buffer");
    }

    var tex = this.texture != null ? this.texture : gl.genTextures(1)[0];
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    checkError(gl, "FBO.init tex");

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    checkError(gl, "FBO.init bind tex");

    if (this.useDepth) {
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
      checkError(gl, "FBO.init bind depth buffer");
    }

    var fbstat = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbstat != gl.FRAMEBUFFER_COMPLETE) {
      for (var v in gl) { if (gl[v] == fbstat) { fbstat = v; break; }}
      log("Framebuffer status: " + fbstat);
    }
    checkError(gl, "FBO.init check fbo");

    this.fbo = fbo;
    this.rbo = rb;
    this.texture = tex;
    this.initialized = true;
  },

  use : function() {
    if (!this.initialized) this.init();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);
  }
}


Quad = {
  vertices : [
    -1,-1,0,
    1,-1,0,
    -1,1,0,

    1,-1,0,
    1,1,1,
    -1,1,0
  ],
  normals : [
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1,
    0,0,-1
  ],
  texcoords : [
    0,0,
    1,0,
    0,1,
    1,0,
    1,1,
    0,1
  ],
  indices : [0,1,2,3,4,5]
}
Cube = {
  vertices : [  0.5, -0.5,  0.5, // +X
                0.5, -0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5,  0.5,  0.5,

                0.5,  0.5,  0.5, // +Y
                0.5,  0.5, -0.5,
                -0.5,  0.5, -0.5,
                -0.5,  0.5,  0.5,

                0.5,  0.5,  0.5, // +Z
                -0.5,  0.5,  0.5,
                -0.5, -0.5,  0.5,
                0.5, -0.5,  0.5,

                -0.5, -0.5,  0.5, // -X
                -0.5,  0.5,  0.5,
                -0.5,  0.5, -0.5,
                -0.5, -0.5, -0.5,

                -0.5, -0.5,  0.5, // -Y
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5,  0.5,

                -0.5, -0.5, -0.5, // -Z
                -0.5,  0.5, -0.5,
                0.5,  0.5, -0.5,
                0.5, -0.5, -0.5,
      ],

  normals : [ 1, 0, 0,
              1, 0, 0,
              1, 0, 0,
              1, 0, 0,

              0, 1, 0,
              0, 1, 0,
              0, 1, 0,
              0, 1, 0,

              0, 0, 1,
              0, 0, 1,
              0, 0, 1,
              0, 0, 1,

              -1, 0, 0,
              -1, 0, 0,
              -1, 0, 0,
              -1, 0, 0,

              0,-1, 0,
              0,-1, 0,
              0,-1, 0,
              0,-1, 0,

              0, 0,-1,
              0, 0,-1,
              0, 0,-1,
              0, 0,-1
      ],

  indices : [],
  create : function(){
    for (var i = 0; i < 6; i++) {
      Cube.indices.push(i*4 + 0);
      Cube.indices.push(i*4 + 1);
      Cube.indices.push(i*4 + 3);
      Cube.indices.push(i*4 + 1);
      Cube.indices.push(i*4 + 2);
      Cube.indices.push(i*4 + 3);
    }
  }
}
Cube.create();

Sphere = {
  vertices : [],
  normals : [],
  indices : [],
  create : function(){
    var r = 0.75;
    function vert(theta, phi)
    {
      var r = 0.75;
      var x, y, z, nx, ny, nz;

      nx = Math.sin(theta) * Math.cos(phi);
      ny = Math.sin(phi);
      nz = Math.cos(theta) * Math.cos(phi);
      Sphere.normals.push(nx);
      Sphere.normals.push(ny);
      Sphere.normals.push(nz);

      x = r * Math.sin(theta) * Math.cos(phi);
      y = r * Math.sin(phi);
      z = r * Math.cos(theta) * Math.cos(phi);
      Sphere.vertices.push(x);
      Sphere.vertices.push(y);
      Sphere.vertices.push(z);
    }
    for (var phi = -Math.PI/2; phi < Math.PI/2; phi += Math.PI/20) {
      var phi2 = phi + Math.PI/20;
      for (var theta = -Math.PI/2; theta <= Math.PI/2; theta += Math.PI/20) {
        vert(theta, phi);
        vert(theta, phi2);
      }
    }
  }
}

Sphere.create();