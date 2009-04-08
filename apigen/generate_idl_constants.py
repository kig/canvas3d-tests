# -*- coding: utf-8 -*-

import glapi

print "Generating nsICanvasRenderingContextGL.idl"
f = open("../public/nsICanvasRenderingContextGL.idl", "w")
f.write('''
#include "nsISupports.idl"

interface nsIDOMHTMLCanvasElement;

[scriptable, uuid(0f3d8dae-7d43-490b-93e9-5ff908ac6ff5)]
interface nsICanvasRenderingContextGL : nsISupports
{
  readonly attribute nsIDOMHTMLCanvasElement canvas;

  /**
   ** GL constants
   **/
''')

for name, value in glapi.constants:
    f.write(('  const PRUint32 '+name).ljust(40) + ' = '+value+';\n')

f.write('''
  // Other
  void swapBuffers ();

};
''')

f.close()
