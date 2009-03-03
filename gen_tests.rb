require 'cgi'
require 'uri'

api = File.read("gl2.h").strip.split("\n")
mods = {}
File.read("api_modifications.txt").strip.split("\n").each{|l|
  l = l.strip
  next if l.empty? or l =~ /^#/
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
}


constants = api.grep(/^#define GL_/).map{|l|
  _, name, val = l.strip.split(/\s+/)
  name = name.sub(/^GL_/, "")
  [name, val]
}

funcs = api.grep(/^GL_APICALL/).map{|l|
  _, ret_type, _, fname, args = l.strip.split(/\s+/,5)
  fname = fname[2..-1]
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
  "uint" => "-20",
  "int" => "null",
  "byte" => "3889",
  "float" => "'foo'",
  "string" => "89",
  "sizei" => "-10",
  "clampf" => "null",
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
  "var methods = [\n" +
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

  "badArgsArityMoreThanArgc" => funcs.map {|_,fn,args|
    s = "Tests.test_#{fn} = function(gl) {\n"
    s << "  assertFail(function(){ gl.#{fn}(#{
              (["0"] * (args.length+1)).join(",")}); });\n"
    s << "}"
  }.join("\n"),

  "badArgsBadTypes" => funcs.map{|_,fn,args|
    s = "Tests.autorun = false;\n"
    s << "Tests.message = 'Caution: if your implementation is flaky, this likely segfaults your browser';\n";
    s << "Tests.test_#{fn} = function(gl) {\n"
    (0...args.length).each{|i|
      begin
      fargs = generate_good_args(args)
      fargs[i] = generate_bad_arg(args[i])
      s << "  assertFail(function(){ gl.#{fn}(#{fargs.join(", ")}); });\n"
      rescue => e
        puts fn, e
        exit 1
      end
    }
    s << "}"
  }.join("\n"),
}

test_header = <<EOF
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html><head>
<meta http-equiv="content-type" content="text/html; charset=UTF-8">
<link rel="stylesheet" type="text/css" href="../unit.css" />
<script type="application/x-javascript" src="../unit.js"></script>
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
  var gl = canvas.getContext(GL_CONTEXT_ID);
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

all_tests_header = <<EOF
<html>
<head>
  <title>OpenGL ES 2.0 &lt;canvas&gt; context tests</title>
  <style type="text/css">
    h2 { font-size: 1em; margin-bottom: 0.2em; }
  </style>
</head>
<body>
EOF
all_tests_footer = <<EOF
</body>
</html>
EOF

File.open("all_tests.html", "w") {|f|
  f.puts all_tests_header
  all_tests.each{|t|
    f.puts(%Q(
      <h2>#{CGI.escapeHTML(t)}</h2>
      <iframe src="#{URI.escape(t)}" width="700" height="100"></iframe>
    ))
  }
  f.puts all_tests_footer
}