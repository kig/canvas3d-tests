/*
  gcc -lGL -lX11 bandwidth.c -o bandwidth
*/

#include <GL/glx.h>
#include <GL/gl.h>
#include <stdio.h>
#include <stdlib.h>
#include <time.h>

int attrib[] = { GLX_DRAWABLE_TYPE, GLX_PBUFFER_BIT,
                 GLX_RENDER_TYPE,   GLX_RGBA_BIT,
                 GLX_RED_SIZE, 1,
                 GLX_GREEN_SIZE, 1,
                 GLX_BLUE_SIZE, 1,
                 GLX_ALPHA_SIZE, 1,
                 GLX_DEPTH_SIZE, 1,
                 None 
};

int pbuf_attrib[] = {
  GLX_PBUFFER_WIDTH, 256,
  GLX_PBUFFER_HEIGHT, 256,
  None
};

struct Pctx {
  Display *display;
  GLXContext ctx;
  GLXPbuffer pbuf;
};


struct Pctx makeCtx() {
  int num;
  
  struct Pctx pctx;
  
  Display *display = XOpenDisplay(NULL);
  
  GLXFBConfig *configs = glXChooseFBConfig(
    display, DefaultScreen(display), 
    attrib, &num);
  GLXFBConfig config = *configs;
  GLXContext ctx = glXCreateNewContext(display, config, GLX_RGBA_TYPE, 0, 1);
  XFree(configs);
  
  GLXPbuffer pbuf = glXCreatePbuffer(display, config, attrib);
  glXMakeContextCurrent(display, pbuf, pbuf, ctx);

  pctx.display = display;
  pctx.pbuf = pbuf;
  pctx.ctx = ctx;
  
  return pctx;
}

void destroyCtx (struct Pctx ctx) {
  glXMakeContextCurrent(ctx.display, 0, 0, 0);
  glXDestroyPbuffer(ctx.display, ctx.pbuf);
  glXDestroyContext(ctx.display, ctx.ctx);
  XCloseDisplay(ctx.display);
}

GLuint tex, bufs[2];
GLubyte *texArr;
GLfloat *bufArr;

double warmup() {
  double d = 0.1;
  int i=0;
  for (i=0; i<1000000; i++)
    d *= d + i;
  return d;
}

void texImage2D() {
  clock_t t1, t2;
  int i;
  t1 = clock();
  for (i=0; i<1000; i++) {
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, 256, 256, 0, 
                 GL_RGBA, GL_UNSIGNED_BYTE, texArr);
    glFinish();
  }
  t2 = clock();
  printf("texImage2D 1000x 256x256x4: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void texSubImage2D() {
  clock_t t1, t2;
  int i;
  t1 = clock();
  for (i=0; i<1000; i++) {
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, 256, 256,
                 GL_RGBA, GL_UNSIGNED_BYTE, texArr);
    glFinish();
  }
  t2 = clock();
  printf("texSubImage2D 1000x 256x256x4: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}

void bufferData() {
  clock_t t1, t2;
  int i;
  glBindBuffer(GL_ARRAY_BUFFER, bufs[0]);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glBufferData(GL_ARRAY_BUFFER, 256*256*4*sizeof(GLuint), bufArr,
                  GL_STATIC_DRAW);
    glFinish();
}
  t2 = clock();
  printf("bufferData 1000x 256x256x4x4: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void bufferSubData() {
  clock_t t1, t2;
  int i;
  glBindBuffer(GL_ARRAY_BUFFER, bufs[0]);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glBufferSubData(GL_ARRAY_BUFFER, 0, 256*256*4*sizeof(GLuint), bufArr);
    glFinish();
  }
  t2 = clock();
  printf("bufferSubData 1000x 256x256x4x4: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void vertexArrayDraw() {
  clock_t t1, t2;
  int i;
  glDisable(GL_DEPTH_TEST);
  glEnableClientState(GL_VERTEX_ARRAY);
  glBindBuffer(GL_ARRAY_BUFFER, 0);
  glVertexPointer(4, GL_FLOAT, 0, bufArr);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glDrawArrays(GL_TRIANGLES, 0, 256*256);
    glFinish();
  }
  t2 = clock();
  printf("vertex arrays 1000x 256x256 verts: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void vertexArrayDrawC() {
  clock_t t1, t2;
  int i;
  glDisable(GL_DEPTH_TEST);
  glEnableClientState(GL_VERTEX_ARRAY);
  glBindBuffer(GL_ARRAY_BUFFER, 0);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glVertexPointer(4, GL_FLOAT, 0, bufArr);
    glDrawArrays(GL_TRIANGLES, 0, 256*256);
    glFinish();
  }
  t2 = clock();
  printf("vertex arrays change after draw 1000x 256x256 verts: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void vboDraw() {
  clock_t t1, t2;
  int i;
  glDisable(GL_DEPTH_TEST);
  glEnableClientState(GL_VERTEX_ARRAY);
  glBindBuffer(GL_ARRAY_BUFFER, bufs[0]);
  glVertexPointer(4, GL_FLOAT, 0, 0);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glDrawArrays(GL_TRIANGLES, 0, 256*256);
    glFinish();
  }
  t2 = clock();
  printf("vbo 1000x 256x256 verts: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}
void vboDrawC() {
  clock_t t1, t2;
  int i;
  glDisable(GL_DEPTH_TEST);
  glEnableClientState(GL_VERTEX_ARRAY);
  glBindBuffer(GL_ARRAY_BUFFER, bufs[1]);
    glBufferData(GL_ARRAY_BUFFER, 256*256*4*sizeof(GLuint), bufArr, GL_STATIC_DRAW);
  t1 = clock();
  for (i=0; i<1000; i++) {
    glBindBuffer(GL_ARRAY_BUFFER, bufs[i%2]);
    glVertexPointer(4, GL_FLOAT, 0, 0);
    glDrawArrays(GL_TRIANGLES, 0, 256*256);
    glFinish();
  }
  t2 = clock();
  printf("vbo change after draw 1000x 256x256 verts: %f\n", ((double)(t2-t1)) / CLOCKS_PER_SEC);
}

int main () {
  struct Pctx c1;
  texArr = (GLubyte*)malloc(256*256*4*sizeof(GLubyte));
  bufArr = (GLfloat*)malloc(256*256*4*sizeof(GLfloat));
  c1 = makeCtx();
  
  glViewport(0,0,256,256);
  glGenTextures(1, &tex);
  glGenBuffers(2, bufs);
  
  glBindTexture(GL_TEXTURE_2D, tex);
  glBindBuffer(GL_ARRAY_BUFFER, bufs[0]);
  
  warmup();
  texImage2D();
  texSubImage2D();
  bufferData();
  bufferSubData();
  vertexArrayDraw();
  vertexArrayDrawC();
  vboDraw();
  vboDrawC();
  
  glDeleteBuffers(2, bufs);
  glDeleteTextures(1, &tex);
  
  printf("glGetError = %d\n", glGetError());
  destroyCtx(c1);
  return 0;
}
