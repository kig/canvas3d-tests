Tests for the OpenGL ES 2.0 canvas context (Canvas 3D)
======================================================

These tests are intended to serve the following purposes:

  * Assert spec conformance
  * Check the safety of the GL binding (bounds checking, same origin policy)
  * Provide performance numbers for developers


Running the tests
-----------------

  1. Install the latest version of the OpenGL Canvas 3D extension (or write your own if you're using WebKit/Opera/IE, you could try to modify gen_tests.rb to autogen it for you...)
  2. Run <code>ruby gen_tests.rb</code> if you have modified the tests.
  3. Run <code>ruby test_server.rb</code> if you want to get test run output to test_server's stdout (especially useful for finding out which test crashed your browser)
  4. Open all_tests.html in your browser


Want to contribute?
-------------------

  1. Fork this repo
  2. For each method (see list in <a href="raw/master/methods.txt">methods.txt</a> and <a href="http://hg.mozilla.org/users/vladimir_mozilla.com/canvas3d/raw-file/tip/doc/glweb20spec.html">glweb20spec.html</a>):
    1. Write a functions/methodName.html that tests the results of valid inputs.
    2. Write a functions/methodNameBadArgs.html that tests the results of invalid inputs.
    3. If your test causes a segfault, add the following to the top of the script tag: <code>Tests.autorun = false; Tests.message = "Caution: this may crash your browser";</code>
  3. For each performance test:
    1. Write a performance/myTestName.html and set <code>Tests.autorun = false;</code>
  4. Create a commit for each file.
  5. Send me a pull request.
  6. Congratulations, you're now a contributor!


For more information on the Canvas 3D extension:

  * <a href="http://blog.vlad1.com/2007/11/26/canvas-3d-gl-power-web-style/">Canvas 3D: GL power, web-style</a>
  * <a href="https://addons.mozilla.org/en-US/firefox/addon/7171">Canvas 3D Firefox add-on</a>

Developer links:

  * <a href="http://hg.mozilla.org/users/vladimir_mozilla.com/canvas3d/">Canvas 3D Mercurial repo</a>
  * <a href="https://bugzilla.mozilla.org/buglist.cgi?quicksearch=c3d">Bugzilla bugs tagged as Canvas 3D [c3d]</a>

