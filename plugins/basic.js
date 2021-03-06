var Results = require('../lib/Results'),
    rainbow = require('repl-rainbow');

module.exports = [
  { name: 'Command List',
    help: 'Shows this list.',
    defaultTrigger: api.keybind('f1'),
    action: call('showHelp')
  },
  { name: 'Load Plugin',
    help: 'Dynamically load an UltraREPL plugin.',
    defaultTrigger: api.command('.plugin'),
    action: function(cmd, name){
      this.showHelp(this.commands.loadPlugin(name));
    }
  },
  { name: 'Auto-Includer',
    help: 'Type "/<lib>" to include built-in <lib> on the current context.',
    defaultTrigger: api.keywords(builtins.libs.map(function(lib){ return '/'+lib })),
    action: function(lib){
      lib = lib.slice(1);
      var result = this.context.ctx[lib] = require(lib);
      return new Results.Success(this.context.current, null, result, null, 'Built-in Lib "'+lib+'"');
    }
  },
  { name: 'Inspect Context',
    help: 'Shortcut for writing `this` to inspect the current context.',
    defaultTrigger: api.keybind('ctrl+z'),
    action: function(){
      return this.context.view();
    }
  },
  { name: 'Clear Input',
    help: 'Clear the the input line if it has text or clears the screen if not.',
    defaultTrigger: api.keybind('esc'),
    action: function(){
      this.rli.line.trim().length ? this.resetInput() : this.resetScreen();
    }
  },
  { name: 'Clear Screen',
    help: 'Clear the screen.',
    defaultTrigger: api.keybind('esc esc'),
    action: call('resetScreen')
  },
  { name: 'Exit',
    help: 'Exit the REPL.',
    defaultTrigger: api.keybind('esc esc esc'),
    action: function(){
      this.rli.close();
      process.exit();
    }
  },
  { name: 'Tab Completion',
    help: 'Context aware tab completion.',
    defaultTrigger: api.keybind('tab'),
    action: function(){
      var cursor = this.rli.cursor;
      var line = this.rli.takeLine();
      var regex = new RegExp('^'+line);
      var introspect = this.context.introspect;
      var spected = introspect(this.context.global);
      var descs = spected.describe().filter(function(desc){
        return regex.test(desc.name);
      }).toArray().sort(function(a, b){
        if (a.name === b.name) return 0;
        return a.name > b.name ? -1 : 1;
      });
      var height = this.height - 2;
      var first = descs.pop();

      if (descs.length > height) {
        var cols = [],
            widths = [],
            tallest = 0;

        while (descs.length > 0) {
          var col = descs.slice(-height);
          tallest = Math.max(tallest, col.length);
          cols.push(col);
          widths.push(columnWidth(col));
          if (descs.length > height) {
            descs.length -= height;
          } else {
            descs.length = 0;
          }
        }

        cols = cols.map(function(col, i){
          return formatColumn(introspect, col, widths[i]);
        });

        var out = crossColumns(cols, tallest).join('\n');;
      } else {
        var out = formatColumn(introspect, descs, this.width - 3);
        out = new Array(this.height - 1 - out.length).join('\n') + out.join('\n');
      }


      this.resetScreen();
      this.writer(out);
      this.rli.line = first.name;
      this.rli.cursor = cursor;
      this.rli.selectionStart = cursor;
      this.rli.selectionEnd = first.name.length;
      this.rli.refreshLine();
    }
  }
];

function crossColumns(cols, height){
  var out = [];
  for (var i=0; i < height; i++) {
    var row = [];
    for (var j=0; j < cols.length; j++) {
      if (i in cols[j]) {
        row.push(cols[j][i]);
      }
    }
    out.push(row.join(''));
  }
  return out;
}

function columnWidth(col){
  return col.reduce(function(longest, item){
    return Math.max(longest, item.name.length);
  }, 0) + 5;
}

function formatColumn(introspect, col, width){
  return col.map(function(desc){
    if (desc.type === 'value') {
      var introspected = introspect(desc.value),
          color = styling.inspector[introspected.isConstructor() ? 'Constructor' : introspected.brand()];

      if (color) {
        return '   '+color(desc.name.pad(width));
      }
    }

    return '   '+styling.inspector.Name(desc.name.pad(width));
  });
}

function call(section, prop, args){
  if (typeof args === 'undefined') {
    args = [];
  } else if (!Array.isArray(args)) {
    args = [args];
  }
  return function(){
    if (prop) {
      return this[section][prop].apply(this[section], args)
    } else {
      return this[section].apply(this, args);
    }
  }
}

function widest(arr, field){
  return arr.reduce(function(a, b){
    if (typeof b !== 'string') return a;
    b = b[field].length;
    return a > b ? a : b;
  }, 0);
}
