# -*- coding: utf-8 -*-

from subprocess import *
import re

def read_lines(fn):
    fd = open(fn)
    data = fd.read()
    fd.close()
    return re.split('\n', data)

def read_cpp_lines(fn):
    data = Popen(["cpp", fn], stdout=PIPE).communicate()[0]
    return re.split('\n', data)

def api_prepass(l):
    _, ret_type, name_args = re.split('\s*GL_[A-Z]+\s*', l.strip())
    name,args = re.split('\s+', name_args.strip(), 1)
    if name == "glClearDepthf":
        name = "glClearDepth"
    if name == "glDepthRangef":
        name = "glDepthRange"
    if name == "glGetShaderPrecisionFormat" or name == "glReleaseShaderCompiler" or name == "glShaderBinary":
       return None
    return [ret_type, name, args]

def gsub_re(rx, repl, lst):
    cre = re.compile(rx)
    for i in xrange(len(lst)):
        if cre.search(lst[i]):
            lst[i] = cre.sub(repl, lst[i])

def line_re(rx, repl, lst):
    cre = re.compile(rx, re.I)
    for i in xrange(len(lst)):
        if cre.search(lst[i]):
            lst[i] = repl

def apply_constant_mod(l, api_lines):
        if l[0] == '+':
            api_lines.append("#define GL_" + l[1:])
        else:
            if l[0] == '-':
                fname = l[1:]
                gsub_re('^\s*#define\s+GL_'+fname+'\s.*$', '', api_lines)
            else:
                fname, replacement = re.split('\s*->\s*', l, 1)
                gsub_re('GL_'+fname+' ', ' GL_'+replacement+' ', api_lines)

def apply_function_mod(l, api_lines):
    if l[0] == '+':
        ret_type, fname, args = re.split('\s+', l[1:], 2)
        api_lines.append('GL_APICALL '+ret_type+' GL_APIENTRY gl'+fname+' '+args)
    else:
        fname = None
        replacement = None
        if l[0] == '-':
            fname = l[1:]
            replacement = ""
        else:
            fname, replacement = re.split('\s*->\s*',l,1)
            ret_type, nfname, args = re.split('\s+',replacement,2)
            replacement = "GL_APICALL "+ret_type+" GL_APIENTRY gl"+nfname+" "+args
        line_re('GL_APIENTRY\s+gl'+fname+'\s', replacement, api_lines)

def apply_api_mod(l, api_lines):
    l = l.strip()
    if l == "" or l[0] == '#':
        return None
    if re.search('^[-+]?[A-Z0-9_]+(\s|-|$)', l): # constant
        apply_constant_mod(l, api_lines)
    else: # function
        apply_function_mod(l, api_lines)

def apply_api_mods(api_mods_lines, api_lines):
    for l in api_mods_lines:
        apply_api_mod(l, api_lines)

def parse_constant(l):
    _, name, val, _ = re.split('\s+', l.strip()+" 0 0 0 0", 3)
    name = re.sub('^GL_', "", name, 1)
    return [name, val]

def parse_function(l):
    def parse_args(a):
        tn = str.rsplit(a, ' ', 1)
        t = tn[0]
        n = None
        if len(tn) > 1:
            n = tn[1]
        else:
            n = ''
        t = re.sub('^GL', '', t, 1)
        return [t,n]
    func = api_prepass(l)
    if func == None:
        return None
    ret_type, name, args = func
    fname = name[2:]
    fname = fname[0].lower() + fname[1:]
    args = re.sub('[();]', '', args).strip()
    args = re.sub('^void$', '', args, 1)
    if args == '':
        arg_arr = []
    else:
        arg_arr = re.split('\s*,\s*', args)
    type_arr = map(parse_args, arg_arr)
    ret_type = re.sub('^GL', '', ret_type, 1)
    return [ret_type, fname, type_arr]

def parse_valid_funarg(valid_args, l):
    def parse_valid_arg(a):
        a = a.strip()
        if a == '_' or a == '':
            return None
        return map(str.strip, re.split(';', a))
    def split_args(a):
        start = 0
        depth = 0
        arr = []
        for i in xrange(len(a)):
            c = a[i]
            if c == ',' and depth == 0:
                arr.append(a[start:i].strip())
                start = i+1
            elif c == '(':
                depth = depth + 1
            elif c == ')':
                depth = depth - 1
                if depth < 0:
                    raise "Error parsing valid args"
        arr.append(a[start:].strip())
        return arr
    l = l.strip()
    if l == '' or l[0] == '#':
        return None
    name, args = re.split('\s+', l, 1)
    args = args.strip()
    args = re.sub('^\(|\)$', '', args).strip()
    if args == '':
        arg_arr = []
    else:
        arg_arr = split_args(args)
    valid_args.append([name, map(parse_valid_arg, arg_arr)])

def parse_valid_args(valid_args_lines):
    valid_args = []
    for l in valid_args_lines:
        parse_valid_funarg(valid_args, l)
    return valid_args

api_lines = read_lines('gl2.h')

function_lines = filter(lambda l: re.match('GL_APICALL', l), api_lines)
raw_functions = filter(lambda l: l != None, map(api_prepass, function_lines))

api_mods_lines = read_lines('api_modifications.txt')
apply_api_mods(api_mods_lines, api_lines)

constant_lines = filter(lambda l: re.match('#define GL_', l), api_lines)
constants = map(parse_constant, constant_lines)

# note: api_lines has changed in apply_api_mods
function_lines = filter(lambda l: re.match('GL_APICALL', l), api_lines)
functions = filter(lambda l: l != None, map(parse_function, function_lines))
function_dict = {}
for ret_type, fname, type_arr in functions:
    function_dict[fname] = [ret_type,fname,type_arr]

valid_args_lines = read_cpp_lines('valid_args.txt')
valid_args = parse_valid_args(valid_args_lines)
