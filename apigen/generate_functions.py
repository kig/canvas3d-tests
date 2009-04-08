# -*- coding: utf-8 -*-

import glapi
import re

context_name = 'nsCanvasRenderingContextGLWeb20'

ns_types = {
    'boolean': 'PRBool',
    'enum': 'PRUint32',
    'sizei': 'PRInt32',
    'bitfield': 'PRUint32',
    'uint': 'PRUint32',
    'int': 'PRInt32',
    'clampf': 'float',
    'float': 'float',

    'string': 'const char*',
    'const char*': 'const char*'
}

jsextr = {
    'PRUint32': '::JS_ValueToECMAUint32',
    'PRInt32': '::JS_ValueToECMAInt32',
    'float': '::JS_ValueToNumber',
    'PRBool': '::JS_ValueToECMAUint32'
}

jstype = {
    'PRUint32': 'jsuint',
    'PRInt32': 'jsint',
    'float': 'jsdouble',
    'PRBool': 'jsuint'
}

def ns_type(t):
    return ns_types[t]


def var_extract(i, nt, n):
    if nt == 'const char*' or nt == 'string':
        decl = '    JSString * js'+n+';\n    const char* ' + n + ';\n'
        ex = ('    js'+n+' = JS_ValueToString(js.ctx, js.argv['+str(i)+']);\n' +
             '    if (!js'+n+') return NS_ERROR_INVALID_ARG;\n' +
             '    '+n+' = JSSTRING_CHARS(js'+n+');\n')
    else:
        jt = jstype[nt]
        decl = '    ' + jt + ' ' + n + ';\n'
        ex =   ('    if (!' +jsextr[nt]+'(js.ctx, js.argv['+str(i)+'], &'+n+'))\n' +
               '        return NS_ERROR_INVALID_ARG;\n')
    return decl + ex
    

def validate_arg_types(fname, args):
    arr = []
    for i in xrange(len(args)):
        t,n = args[i]
        nt = ns_type(t)
        arr.append(var_extract(i, nt, n))
    return '\n'.join(arr)

def cpp_args(retval, args):
    arglist = ', '.join(map(lambda a: ns_type(a[0]) + ' ' + a[1], args))
    if retval and retval != 'void':
        arglist = arglist + ', ' + ns_type(retval) + '* retval'
    return arglist

def gl_args(args):
    return ', '.join(map(lambda a: a[1], args))

def generate_union_check(fname, name, values):
    if values == []:
        return ''
    return ('    switch ('+name+') {\n        ' +
            '\n        '.join(map(lambda v: 'case '+v+':', values)) +
            '\n            break;' +
            '\n        default:' +
            '\n            LogMessagef("'+fname+': Bad value for '+name+'");' +
            '\n            return NS_ERROR_INVALID_ARG;' +
            '\n    }')

def generate_prog_check(fname, name, checks):
    if checks == []:
        return ''
    return ('    if ( ! (('+ ') && ('.join(checks) +'))) {\n' +
            '        LogMessagef("'+fname+': Bad value for '+name+'");\n' +
            '        return NS_ERROR_INVALID_ARG;\n' +
            '    }')

def check_arg_validity(fname, args, valid_args):
    arg_checks = []
    for i in xrange(len(valid_args)):
        checks = valid_args[i]
        if checks == None:
            continue
        arg_name = args[i][1]
        union_checks = []
        prog_checks = []
        for c in checks:
            if re.search('%%', c):
                prog_checks.append(c.replace('%%', arg_name))
            else:
                union_checks.append(c)
        arg_checks.append(generate_union_check(fname, arg_name, union_checks))
        arg_checks.append(generate_prog_check(fname, arg_name, prog_checks))
    return '\n'.join(arg_checks)

def generate_func(retval, name, args, valid_args):
    fname = name[0].upper() + name[1:]
    retcap = js = ret_to_js = ''
    if retval != 'void':
        js = '    NativeJSContext js; if (NS_FAILED(js.error)) return js.error;\n'
        retcap = '*retval = '
        ret_to_js = '    js.SetRetVal(js_retval);\n'
    return ('NS_IMETHODIMP\n' +
    context_name + '::' + fname + ' ('+cpp_args(retval, args)+')\n' +
    '{\n' + js +
    '    MakeContextCurrent();\n' +
    check_arg_validity(fname, args, valid_args) + '\n' +
    '    '+retcap+'gl->f'+fname+'('+gl_args(args)+');\n' +
    '    CheckGLError();\n' +
    '    return NS_OK;\n' +
    '}\n')

print 'Generating ../src/' + context_name + 'Autogen.cpp'
f = open('../src/' + context_name + 'Autogen.cpp','w')
for name, valid_args in glapi.valid_args:
    retval, _, args = glapi.function_dict[name]
    f.write(generate_func(retval, name, args, valid_args) + '\n')
f.close()
