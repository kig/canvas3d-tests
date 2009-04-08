# -*- coding: utf-8 -*-

import glapi
import re

def write_func_prototype(f, func):
    ret_type, name, args = func
    f.write('typedef '+ret_type+' (GLAPIENTRY * PFN'+name.upper()+') '+args+'\n')
    f.write('PFN'+name.upper()+' '+re.sub('^gl','f',name,1)+';\n')

def write_func(f, func):
    ret_type, name, args = func
    name = re.sub('^gl', 'f', name, 1)
    f.write('{ (PRFuncPtr*) &'+name+', { "'+name[1:]+'", NULL } },\n')

print "Generating glwrap.functions.h"
f = open("../src/glwrap.functions.h", "w")
for func in glapi.raw_functions:
    write_func_prototype(f, func)
f.close()

print "Generating glwrap.InitWithPrefix.h"
f = open("../src/glwrap.InitWithPrefix.h", "w")
for func in glapi.raw_functions:
    write_func(f, func)
f.close()
