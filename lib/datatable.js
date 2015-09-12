/*
 * @license
 * cocotte-datatable v0.1.0
 * Copyright(c) 2015 Yuki Kurata <yuki.kurata@gmail.com>
 * MIT Licensed
 */

/**
 * dependencies
 */
var sequential = require('cocotte-sequantial');
var Datasource = require('cocotte-datasource');
var Row = require('cocotte-row');
var util = require('util');
var events = require('events');
var deepEqual = require('./deep-equal');


module.exports = Datatable;

/**
 * データテーブルクラス
 * @method Datatable
 * @param  {Datasource}  datasource
 */
function Datatable (datasource) {
  if (!(datasource instanceof Datasource)) {
    var msg = '引数がデータソースではありません';
    throw new Error(msg);
  }
  this.ds = datasource;
  this.liveList = false;
  this.rows = [];
  this.from = 0;
  this.to = null;
  Object.defineProperties(this, {
    _condition : {
      value: null,
      writable: true,
      enumerable: false,
      configurable: false
    },
    _order: {
      value: [],
      writable: true,
      enumerable: false,
      configurable: false
    },
    _currentRow : {
      value: null,
      writable: true,
      enumerable: false,
      configurable: false
    },
    _dsListeners: {
      value: setEventListener(this),
      writable: false,
      enumerable: false,
      configurable: false
    }
  });
}

/**
 * データソースのイベントを捕捉し更新
 * @method setEventListener
 * @param  {Datatable}         dt
 */
function setEventListener(dt) {
  var ds = dt.ds;
  function added (row) {
    if (!dt.liveList) {
      return;
    }
    if (dt.test(row)) {
      dt.list();
    }
  }
  function updated (row, fieldName) {
    var exists = dt.rows.indexOf(row) !== -1;
    if (dt.liveList && dt.test(row) !== exists) {
      dt.list();
    } else  if (exists) {
      dt.emit('updated', row, fieldName);
      if (dt.condition && dt.condition[fieldName]) {
        dt.list();
      }
    }
  }
  function removed (row) {
    var exists = dt.rows.indexOf(row) !== -1;
    if (exists && dt.liveList) {
      dt.list();
    }
  }
  ds.on('added', added);
  ds.on('updated', updated);
  ds.on('removed', removed);
  return {
    added: added,
    updated: updated,
    removed: removed
  };
}

util.inherits(Datatable, events.EventEmitter);

/**
 * 破棄の前に、イベントリスナーの登録を解除し、余分な参照を切る
 * @method destroy
 */
Datatable.prototype.destroy = function destroy () {
  var listeners = this._dsListeners;
  var ds = this.ds;
  ds.removeListener('added', listeners.added);
  ds.removeListener('updated', listeners.updated);
  ds.removeListener('removed', listeners.removed);
  this.ds = null;
  this.liveList = null;
  this.rows = null;
  this.from = null;
  this.to = null;
  this._condition = null;
  this._order = null;
  this._currentRow = null;
  this._dsListeners = null;
};

Object.defineProperties(Datatable.prototype, {

  // 行数
  length: {
    get: function () {
      return this.rows.length;
    },
    enumerable: true,
    configurable: false
  },

  // 現在行
  currentRow: {
    get: function () {
      return this._currentRow;
    },
    set: function (value) {
      if ((value === null || this.rows.indexOf(value) !== -1) &&
          deepEqual(this._currentRow, value)) {
        this._currentRow = value;
        this.emit('moved', value);
      }
    },
    enumerable: true,
    configurable: false
  },

  // 現在行のインデックス
  currentIndex: {
    get: function () {
      return this.rows.indexOf(this.currentRow);
    },
    set: function (value) {
      this.currentRow = this.rows[value] || null;
    },
    enumerable: true,
    configurable: false
  }
});

/**
 * 絞り込み条件をクリアしている行かをテストする
 * @method test
 * @param  {Row}      row
 * @return {Boolean}
 */
Datatable.prototype.test =  function test(row) {
  var condition = this._condition;
  if (!condition) {
    return true;
  }
  var fields = this.ds.fields;
  return Object.keys(condition).every(function(name){
    var value = row[name];
    var cond = condition[name];
    var field = fields[name];
    if (typeof cond === 'function') {
      return cond(value, row);
    } else if (Array.isArray(cond)) {
      return field.between(value, cond[0], cond[1]);
    } else {
      return field.equal(value, cond);
    }
  });
};

/**
 * データソースから取得する
 * @method list
 * @return {Number} 取得行
 */
Datatable.prototype.list = function list () {
  var dt = this;

  // 絞り込み
  var rows = dt.ds.filter(function(row){
    return dt.test(row);
  });

  // 並び
  var order = dt._order;
  if (order.length) {
    rows.sort(function(x, y) {
      var i = 0;
      var f;
      while(f = order[i]) {
        var r = f[0].compare(x[f[1]], y[f[1]]);
        if (r) {
          return f[2] ? r : r * -1;
        }
        i++;
      }
      return 0;
    });
  }

  // from-to
  var from = dt.from || 0;
  var to   = (dt.to === null ? rows.length - 1 : dt.to) + 1;
  if (from < to) {
    rows = rows.slice(from, to);
  }

  // リストと現在行を再設定
  if (!deepEqual(dt.rows, rows)){
    dt.rows = rows;
    dt.emit('listed');
    var current = dt.currentRow;
    if (current && rows.indexOf(current) === -1) {
      dt.currentRow = null;
    }
  }
};

/**
 * 絞り込み条件を設定する
 * @method setCondition
 * @param  {Object} condition
 */
Datatable.prototype.setCondition = function setCondition (condition) {
  this._condition = condition;
  if (this.liveList) {
    this.list();
  }
};

/**
 * 並び順を設定する
 * 文字列を指定した場合は、一つのフィールドを昇順で設定とする
 * 配列で指定した場合は、[[フィールド1, 昇順],[フィールド2, 昇順]...]と設定とする
 * @method setOrder
 * @param  {String|Array} order
 */
Datatable.prototype.setOrder = function setOrder(order) {
  if (!order) {
    order = [];
  } else if (typeof order === 'string') {
    order = [[order, true]];
  }
  var fields = this.ds.fields;
  order = order.reduce(function(x, f){
    var name = f[0];
    var field = fields[name];
    if (field) {
      x.push([field, name, f[1]]);
    }
    return x;
  }, []);
  if (!deepEqual(order, this._order)) {
    this._order = order;
    if (this.liveList) {
      this.list();
    }
  }
};

/**
 * 最初の行へ移動する
 * 戻り値は移動したかどうか
 * @method first
 * @return {Boolean}
 */
Datatable.prototype.first = function first () {
  var index = this.currentIndex;
  var length = this.length;
  var ok = !(length === 0 || index === 0);
  if (ok) {
    this.currentIndex = 0;
  }
  return ok;
};

/**
 * 最後の行に移動する
 * 戻り値は移動したかどうか
 * @method last
 * @return {Boolean}
 */
Datatable.prototype.last = function last () {
  var index = this.currentIndex;
  var length = this.length;
  var ok = !(length === 0 || index === length - 1);
  if (ok) {
    this.currentIndex = length - 1;
  }
  return ok;
};

/**
 * 次行へ移動させる
 * 現在行が未設定の場合は、最初の行へ移動する
 * 戻り値は移動したかどうか
 * @method next
 * @return {Boolean}
 */
Datatable.prototype.next = function next () {
  var index = this.currentIndex;
  var length = this.length;
  var ok = !(length === 0 || index === length - 1);
  if (ok) {
    this.currentIndex = index === -1 ? 0 : index + 1;
  }
  return ok;
};

/**
 * 前行へ移動させる
 * 現在行が未設定の場合は、最後の行へ移動する
 * 戻り値は移動したかどうか
 * @method back
 * @return {Boolean}
 */
Datatable.prototype.back = function back () {
  var index = this.currentIndex;
  var length = this.length;
  var ok = !(length === 0 || index === 0);
  if (ok) {
    this.currentIndex = index === -1 ? length - 1 : index - 1;
  }
  return ok;
};

/**
 * 指定したインデックスまたは行に移動する
 * 戻り値は移動したかどうか
 * @method move
 * @param  {Number|Row} value
 * @return {Boolean}
 */
Datatable.prototype.move = function move (value) {
  var row = this.currentRow;
  if (value instanceof Row) {
    this.currentRow = value;
  } else {
    this.currentIndex = value;
  }
  return row !== this.currentRow;
};

/**
 * 以下の順次処理用のメソッドを実装します
 * forEach
 * every
 * some
 * filter
 * map
 * reduce
 * reduceRight
 */
sequential(Datatable.prototype, 'rows');

// クライアント用
if (typeof window === 'object') {
  if (!window.Cocotte){
    window.Cocotte = {};
  }
  window.Cocotte.Datatable = Datatable;
}