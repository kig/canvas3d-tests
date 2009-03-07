#!/usr/bin/ruby
require 'socket'
require 'uri'

s = TCPServer.new(nil, 8888)

while c = s.accept
  puts URI.unescape(c.gets.split(" ")[1][1..-1])
  c.close
end
