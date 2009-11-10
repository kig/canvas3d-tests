#!/usr/bin/ruby

=begin

Test generator for the OpenGL ES 2.0 HTML Canvas context

Copyright (C) 2009  Ilmari Heikkinen <ilmari.heikkinen@gmail.com>

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

=end

require 'cgi'
require 'uri'
require 'fileutils'

api = File.read("apigen/gl2.h").strip.split("\n")
mods = {}
raw_funcs = api.grep(/^GL_APICALL/).map{|l|
  _, ret_type, name_args = l.strip.split(/\s*GL_[A-Z]+\s*/)
  name,args = name_args.split(/\s+/,2)
  name = "glClearDepth" if name == "glClearDepthf"
  name = "glDepthRange" if name == "glDepthRangef"
  next if ["glGetShaderPrecisionFormat", "glReleaseShaderCompiler", "glShaderBinary"].include?(name)
  [ret_type, name, args]
}.compact
File.read("apigen/api_modifications.txt").strip.split("\n").each{|l|
  l = l.strip
  next if l.empty? or l =~ /^#/
  if l =~ /^[-+]?[A-Z0-9_]+([\s-]|$)/ # constant
      if l[0,1] == "+"
        api.push("#define GL_#{l[1..-1]}")
      else
        if l[0,1] == "-"
          fname = l[1..-1]
          api.each{|s| s.gsub!(/^\s*#define\s+GL_#{fname}\s.*$/, "") }
        else
          fname, replacement = l.split(/\s*->\s*/,2)
          api.each{|s| s.gsub!(" GL_#{fname} ", " GL_#{replacement} ") }
        end
      end
  else
      if l[0,1] == "+"
        ret_type, fname, args = l[1..-1].split(/\s+/,3)
        api.push("GL_APICALL #{ret_type} GL_APIENTRY gl#{fname} #{args}")
      else
        fname = nil
        replacement = nil
        if l[0,1] == "-"
          fname = l[1..-1]
          replacement = ""
        else
          fname, replacement = l.split(/\s*->\s*/,2)
          ret_type, nfname, args = replacement.split(/\s+/,3)
          replacement = "GL_APICALL #{ret_type} GL_APIENTRY gl#{nfname} #{args}"
        end
    #     puts fname + ": " + replacement
        api.map!{|a|
          if a =~ /GL_APIENTRY\s+gl#{fname}\s/i
            replacement
          else
            a
          end
        }
      end
  end
}


constants = api.grep(/^#define GL_/).map{|l|
  _, name, val = l.strip.split(/\s+/)
  name = name.sub(/^GL_/, "")
  [name, val]
}.compact

funcs = api.grep(/^GL_APICALL/).map{|l|
  _, ret_type, name_args = l.strip.split(/\s*GL_[A-Z]+\s*/)
  name,args = name_args.split(/\s+/,2)
  fname = name[2..-1]
  fname[0,1] = fname[0,1].downcase
  arg_arr = args.gsub(/[();]/, "").strip.sub(/^void$/,"").split(/\s*,\s*/)
  type_arr = arg_arr.map{|a|
    t,n = a.reverse.split(/\s+/,2).reverse.map{|s|s.reverse}
    t = t.sub(/^GL/, "")
    [t,n]
  }
  ret_type = ret_type.sub(/^GL/, "")
  [ret_type, fname, type_arr]
}

$generators = {
  "enum" => "0",
  "uint" => "1",
  "int" => "0",
  "byte" => "1",
  "float" => "4.8",
  "string" => "'foo'",
  "sizei" => "1",
  "clampf" => "0.4",
  "bitfield" => "gl.COLOR_BUFFER_BIT",
  "Array" => "[]",
  "boolean" => "true",
  "DOMImageElement" => "new Image()"
}

$bad_generators = {
  "enum" => "'foo'",
  "uint" => "'foo'",
  "int" => "'foo'",
  "byte" => "3889",
  "float" => "'foo'",
  "string" => "89",
  "sizei" => "-10",
  "clampf" => "'foo'",
  "bitfield" => "'no'",
  "Array" => "'hello'",
  "boolean" => "['s',2,3]",
  "DOMImageElement" => "null"
}

def generate_bad_arg(arg)
  t,_ = arg
  $bad_generators[t] or raise "no bad generator for #{t}"
end

def generate_good_arg(arg)
  t,_ = arg
  $generators[t] or raise "no generator for #{t}"
end

def generate_good_args(args)
  args.map{|a| generate_good_arg(a) }
end

tests = {
  "constants" =>
  "var constants = {\n" +
  constants.map{|c,v| "#{c} : #{v}"}.join(",\n") + "\n}\n" + %Q(
Tests.testOES20Constants = function(gl) {
  for (var i in constants) {
    assertProperty(gl, i) &&
    assertEquals(i, gl[i], constants[i]);
  }
  var extended = false;
  for (var i in gl) {
    if (i.match(/^[A-Z_]+$/) && constants[i] == null) {
      if (!extended) {
        extended = true;
        var h = document.createElement('h3');
        h.textContent = "Also found the following extra constants";
        __testLog__.appendChild(h);
      }
      log(i);
    }
  }
}
  ),
  
  "methods" =>
  "var methods = ['canvas',\n" +
  funcs.map{|_,fn,args| fn.dump }.join(",\n") + "\n]\n" + %Q(
Tests.testOES20Methods = function(gl) {
  for (var i=0; i<methods.length; i++) {
    assertProperty(gl, methods[i]);
  }
  var extended = false;
  for (var i in gl) {
    if (i.match(/^[a-z_]+$/) && methods.indexOf(i) == -1) {
      if (!extended) {
        extended = true;
        var h = document.createElement('h3');
        h.textContent = "Also found the following extra properties";
        __testLog__.appendChild(h);
      }
      log(i);
    }
  }
}
  ),
  
  "badArgsArityLessThanArgc" => funcs.map {|_,fn,args|
    s = "Tests.test_#{fn} = function(gl) {\n"
    (0...args.length).each{|i|
      s << "  assertFail(function(){ gl.#{fn}(#{
                (["0"] * i).join(",")}); });\n"
    }
    s << "}"
  }.join("\n"),

#   "badArgsArityMoreThanArgc" => funcs.map {|_,fn,args|
#     s = "Tests.test_#{fn} = function(gl) {\n"
#     s << "  assertFail(function(){ gl.#{fn}(#{
#             (["0"] * (args.length+1)).join(",")}); });\n"
#     s << "}"
#   }.join("\n"),


#   "badArgsBadTypes" => funcs.map{|_,fn,args|
#     s = "Tests.test_#{fn} = function(gl) {\n"
#     (0...args.length).each{|i|
#       begin
#       fargs = generate_good_args(args)
#       fargs[i] = generate_bad_arg(args[i])
#       s << "  assertFail(function(){ gl.#{fn}(#{fargs.join(", ")}); });\n"
#       rescue => e
#         puts fn, e
#         exit 1
#       end
#     }
#     s << "}"
#   }.join("\n"),
}

test_header = <<EOF
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html><head>
<!--
#{File.read("LICENSE")}
-->
<meta http-equiv="content-type" content="text/html; charset=UTF-8">
<link rel="stylesheet" type="text/css" href="../unit.css" />
<script type="application/x-javascript" src="../unit.js"></script>
<script type="application/x-javascript" src="../util.js"></script>
<script type="application/x-javascript">

/*
  The following tests are generated from
  http://www.khronos.org/registry/gles/api/2.0/gl2.h
  and api_modifications.txt
*/
EOF

test_footer = <<EOF
Tests.startUnit = function() {
  var canvas = document.getElementById('gl');
  var gl = wrapGLContext(canvas.getContext(GL_CONTEXT_ID));
  return [gl];
}

</script>
<style>canvas{ position:absolute; }</style>
</head><body>
  <canvas id="gl" width="1" height="1"></canvas>
</body></html>
EOF

puts "Generating constants.txt"
File.open("constants.txt", "w") {|f|
  constants.each{|name, value|
    f.puts("#{name} #{value}")
  }
}

puts "Generating methods.txt"
File.open("methods.txt", "w") {|f|
  funcs.each{|ret_type, name, args|
    f.puts("#{ret_type} #{name} (#{args.map{|a| a.join(" ")}.join(", ")})")
  }
}
puts "Generating templates/"
FileUtils.rm_r("templates") if File.exist?("templates")
FileUtils.mkdir_p("templates")
funcs.each{|ret_type, name, args|
  unless File.exist?("functions/#{name}.html")
    FileUtils.cp("template.html", "templates/#{name}.html")
  end
  unless File.exist?("functions/#{name}BadArgs.html")
    FileUtils.cp("template.html", "templates/#{name}BadArgs.html")
  end
}

tests.each{|n,t|
  puts "Generating conformance/#{n}.html"
  File.open("conformance/#{n}.html", "w") {|f|
    f.puts(test_header)
    f.puts(t)
    f.puts(test_footer)
  }
}

puts "Generating all_tests.html"

all_tests = []
all_tests += Dir["conformance/*.html"].sort
all_tests += Dir["functions/*.html"].sort
all_tests += Dir["performance/*.html"].sort
all_tests += Dir["glsl/*.html"].sort

all_tests_header = <<EOF
<html>
<head>
<!--
#{File.read("LICENSE")}
-->
  <title>OpenGL ES 2.0 &lt;canvas&gt; context tests</title>
  <style type="text/css">
    h2 { display: inline; font-size: 1em; margin-bottom: 0.2em; }
    iframe { display: inline; border: 1px solid black; overflow: hidden;}
  </style>
  <script type="text/javascript">
    function loadTest(id, url) {
      document.getElementById(id).src = url;
    }
    function seqLoader() {
      var iframes = document.getElementsByTagName('iframe');
      for (var i=0; i<iframes.length; i++) {
        iframes[i].addEventListener('load', (function(j) {
          return function() {
            var e = document.getElementById((j+1)+'_link');
            if (e) loadTest(j+1, e.href);
          }
        })(i), false);
      }
      var e = document.getElementById('0_link');
      if (e) loadTest(0, e.href);
    }
  </script>
</head>
<body onload="seqLoader()">
EOF
all_tests_footer = <<EOF
</body>
</html>
EOF

File.open("all_tests.html", "w") {|f|
  f.puts all_tests_header
  all_tests.each{|t|
    f.puts(%Q(
    <div>
      <iframe src="#{URI.escape(t)}" width="110" height="42"></iframe>
      <h2><a href="#{URI.escape(t)}">#{CGI.escapeHTML(t)}</a></h2>
    </div>
    ))
  }
  f.puts all_tests_footer
}

puts "Generating all_tests_linkonly.html"

File.open("all_tests_linkonly.html", "w") {|f|
  f.puts all_tests_header
  all_tests.each_with_index{|t, i|
    f.puts(%Q(
    <div>
      <iframe id="#{i}" width="110" height="42"></iframe>
      <h2><a onclick="loadTest(#{i}, '#{URI.escape(t)}');return false" href="#{URI.escape(t)}">#{CGI.escapeHTML(t)}</a></h2>
    </div>
    ))
  }
  f.puts all_tests_footer
}

puts "Generating all_tests_sequential.html"

File.open("all_tests_sequential.html", "w") {|f|
  f.puts all_tests_header
  all_tests.each_with_index{|t, i|
    f.puts(%Q(
    <div>
      <iframe id="#{i}" width="110" height="42"></iframe>
      <h2><a id="#{i}_link" href="#{URI.escape(t)}">#{CGI.escapeHTML(t)}</a></h2>
    </div>
    ))
  }
  f.puts all_tests_footer
}
