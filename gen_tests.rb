api = File.read("gl2.h").strip.split("\n")
mods = {}
File.read("api_modifications.txt").strip.split("\n").each{|l|
  l = l.strip
  next if l.empty? || l =~ /^#/
  if l[0,1] == "+"
    ret_type, fname, args = l[1..-1].split(/\s+/,3)
    api.push("GL_APICALL #{ret_type} GL_APIENTRY gl#{fname} #{args}")
  else
    if l[0,1] == "-"
      fname = l[1..-1]
      replacement = ""
    else
      fname, replacement = l.split(/\s*->\s*/,2)
      ret_type, fname, args = replacement.split(/\s+/,3)
      replacement = "GL_APICALL #{ret_type} GL_APIENTRY gl#{fname} #{args}"
    end
    api.map!{|a|
      if a =~ /GL_APIENTRY\s+#{fname}/
        replacement
      else
        a
      end
    }
  end
}


constants = api.grep(/^#define/).map{|l|
  _, name, val = l.strip.split(/\s+/)
  name = name.sub(/^GL_/, "")
  [name, val]
}

funcs = api.grep(/^GL_APICALL/).map{|l|
  _, ret_type, _, fname, args = l.strip.split(/\s+/,5)
  fname = fname[2..-1]
  fname[0,1] = fname[0,1].downcase
  arg_arr = args.gsub(/[();]/, "").strip.split(/\s*,\s*/)
  [ret_type, fname, arg_arr]
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

arity_less_than_argc_tests = funcs.map {|_,fn,args|
  s = "Tests.test_#{fn} = function(gl) {\n"
  (0...args.length).each{|i|
    s << "  assertFail(function(gl){ gl.#{fn}(#{(["0"] * i).join(",")}); });\n"
  }
  s << "}"
}

File.open("conformance/badArgsArityLessThanArgc.html", "w") {|f|
  f.write(test_header)
  f.write(arity_less_than_argc_tests.join("\n"))
  f.write(test_footer)
}