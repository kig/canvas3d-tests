require 'socket'

s = TCPServer.new(nil, 8888)

while c = s.accept
  puts c.gets.split(" ")[1][1..-1]
  c.close
end
