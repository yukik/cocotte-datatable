/*
 * @license
 * cocotte-datatable v0.2.0
 * Copyright(c) 2015 Yuki Kurata <yuki.kurata@gmail.com>
 * MIT Licensed
 */
module.exports = Datatable;

/*global window*/

// クライアント用
if (typeof window === 'object') {
  if (!window.Cocotte){
    window.Cocotte = {};
  }
  window.Cocotte.Datatable = Datatable;
}

/**
 * dependencies
 */
var Datasource = require('cocotte-datasource');
var Row = require('cocotte-row');
var sequential = require('cocotte-sequantial');
var compare = require('cocotte-compare');
var util = require('util');
var events = require('events');

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
  this.rows = [];
  Object.defineProperties(this, {
    _liveList: {
      value: false,
      writable: true,
      enumerable: false,
      configurable: false
    },
    _condition : {
      value: {},
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
    _from: {
      value: 0,
      writable: true,
      enumerable: false,
      configurable: false
    },
    _to: {
      value: null,
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
    if (dt.liveList && dt.test(row)) {
      dt.list();
    }
  }
  function updated (row, fieldName) {
    var exists = dt.exists(row);
    if (dt.liveList && dt.test(row) !== exists) {
      dt.list();
    } else  if (exists) {
      dt.emit('updated', row, fieldName);
      var reList = (function(){
        if (!dt.liveList) {
          return false;
        }
        if (dt._condition[fieldName]) {
          return true;
        }
        return dt._order.some(function(x){
          return x[0] === fieldName;
        });
      })();
      if (reList) {
        dt.list();
      }
    }
  }
  function removed (row) {
    if (dt.liveList && dt.exists(row)) {
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
  this.rows = null;
  this._liveList = null;
  this._condition = null;
  this._order = null;
  this._from = null;
  this._to = null;
  this._currentRow = null;
  this._dsListeners = null;
};

/** 
 * getter/setter
 */
Object.defineProperties(Datatable.prototype, {
  // フィールド
  fields: {
    get: function() {
      return this.ds.fields;
    },
    enumerable: true,
    configurable: false
  },
  Row: {
    get: function() {
      return this.ds.Row;
    },
    enumerable: true,
    configurable: false
  },
  // 行数
  length: {
    get: function () {
      return this.rows.length;
    },
    enumerable: true,
    configurable: false
  },
  // 絞り込み条件
  condition: {
    get: function () {
      // return deepcopy
      var c = this._condition;
      var fields = this.fields;
      return Object.keys(c).reduce(function(x, name){
        x[name] = fields[name].copy(c[name]);
        return x;
      }, {});
    },
    set: function(value) {
      this.setCondition(value);
    },
    enumerable: true,
    configurable: false
  },
  // 並び順
  order: {
    get: function () {
      return this._order.map(function(c){return [c[1], c[2]];});
    },
    set: function (value) {
      this.setOrder(value);
    },
    enumerable: true,
    configurable: false
  },
  // 開始行・終了行
  range : {
    get: function () {
      return [this._from, this._to];
    },
    set: function (value) {
      this.setRange(value[0], value[1]);
    },
    enumerable: true,
    configurable: false
  },
  // リスト自動更新
  liveList: {
    get: function () {
      return this._liveList;
    },
    set: function (live) {
      live = !!live;
      if (live !== this._liveList) {
        this._liveList = live;
        if (live) {
          this.list();
        }
      }
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
      if (value !== null && !this.exists(value)) {
        return;
      }
      if (!compare(this._currentRow, value, 1)) {
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
 * 行を追加する
 * 抽出条件が単一値の場合に値として自動的に設定します
 * @method add
 * @param  {Object} data
 */
Datatable.prototype.add = function add (data) {
  data = data || {};
  var condition = this._condition;
  Object.keys(condition).forEach(function(name){
    var value = condition[name];
    if (typeof value !== 'function' && !Array.isArray(value)) {
      data[name] = value;
    }
  });
  var row = this.ds.add(data);
  if (row && !this.liveList) {
    this.rows.push(row);
    this.emit('added', row);
  }
  return row;
};

/**
 * 行を削除する
 * (データテーブルに存在する行のみ)
 * @method remove
 * @param  {Row}     row
 * @return {Boolean} deleted
 */
Datatable.prototype.remove = function remove (row) {
  var idx = this.rows.indexOf(row);
  if (idx === -1) {
    return false;
  }
  var removed = this.ds.remove(row);
  if (!removed || !this.liveList) {
    this.rows.splice(idx, 1);
    this.emit('removed', row);
  }
  return true;
};

/**
 * 行をすべて削除する
 * (データテーブルに存在する行のみ)
 * @method removeAll
 * @return {Number}  removeRowCount
 */
Datatable.prototype.removeAll = function removeAll () {
  var rows = [].slice.call(this.rows);
  if (!rows.length) {
    return 0;
  }
  var liveList = this._liveList;
  this._liveList = false;
  var ds = this.ds;
  rows.forEach(function(row){
    ds.remove(row);
  });
  this.rows = [];
  this._liveList = liveList;
  this.emit('listed');
  return rows.length;
};

/**
 * 対象の行をデータテーブルが保有しているか
 * @method exists
 * @param  {Row}     row
 * @return {Boolean}
 */
Datatable.prototype.exists = Datasource.prototype.exists;

/**
 * 行番号を指定して行を取得
 * 複数の行が同じ行番号の場合は、最初に一致した行を返します
 * @method find
 * @param  {String|Object} id|condition
 * @return {Row}    row
 */
Datatable.prototype.find = Datasource.prototype.find;

/**
 * データソースから行リストを取得する
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
  var from = dt._from;
  var to   = dt._to;
  if (to !== null) {
    rows = rows.slice(from, to + 1);
  } else if (from) {
    rows = rows.slice(from);
  }

  // リストと現在行を再設定
  if (!compare(dt.rows, rows, 1)){
    dt.rows = rows;
    dt.emit('listed');
    var current = dt.currentRow;
    if (current && !dt.exists(current)) {
      dt.currentRow = null;
    }
  }
};

/**
 * 行リストを設定する
 * @method setRows追加する
 * @param  {Array.Row} rows
 * @param  {Boolean}   remain  元の行リストを残す
 */
Datatable.prototype.setRows = function setRows(rows, remain) {
  if (!Array.isArray(rows)) {
    rows = [rows];
  }

  var dt = this;
  var ds = dt.ds;

  rows = rows.filter(function(row){
    return ds.exists(row) && !(remain && dt.exists(row));
  });

  if (remain) {
    rows = [].slice.call(dt.rows).concat(rows);
  }

  // リストと現在行を再設定
  if (!compare(dt.rows, rows, 1)){
    dt.rows = rows;
    dt.emit('listed');
    var current = dt.currentRow;
    if (current && !dt.exists(current)) {
      dt.currentRow = null;
    }
  }
};

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
  var dt = this;
  var fields = dt.ds.fields;
  return Object.keys(condition).every(function(name){
    var value = row[name];
    var cond = condition[name];
    var field = fields[name];
    if (typeof cond === 'function') {
      return cond(value, row, dt);
    } else if (Array.isArray(cond)) {
      return field.between(value, cond[0], cond[1]);
    } else {
      return field.equal(value, cond);
    }
  });
};

/**
 * 絞り込み条件を設定する
 * @method setCondition
 * @param  {Object} condition
 */
Datatable.prototype.setCondition = function setCondition (condition) {
  condition = condition || {};
  var fields = this.fields;
  condition = Object.keys(condition).reduce(function(x, name){
    if (name === 'id'|| name === 'state' || fields[name]) {
      x[name] = condition[name];
    }
    return x;
  }, {});
  if (!compare(condition, this._condition)) {
    this._condition = condition;
    if (this.liveList) {
      this.list();
    }
  }
};

/**
 * 並び順を設定する
 * 配列で指定した場合は、[[フィールド1, 昇順],[フィールド2, 昇順]...]と設定とする
 * 文字列を指定した場合は、フィールド名をカンマ連結で降順の場合はフィールド名の前に
 * -が追加されているものとする
 * @method setOrder
 * @param  {String|Array} order
 */
Datatable.prototype.setOrder = function setOrder(order) {
  if (typeof order === 'string') {
    order = order.split(',').map(function(x){
      x = x.trim();
      return x[0] === '-' ? [x.slice(1), false] : [x, true];
    });
  } else if (!Array.isArray(order)) {
    order = [];
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
  if (!compare(order, this._order)) {
    this._order = order;
    if (this.liveList) {
      this.list();
    }
  }
};

/**
 * 開始行・終了行を設定します
 * @method setRange
 * @param  {Number} from
 * @param  {Number} to
 */
Datatable.prototype.setRange = function setRange(from, to) {
  from = parseInt(from, 10) || 0;
  if (from < 0) {
    return;
  }
  to = parseInt(to, 10);
  if (Number.isNaN(to)) {
    to = null;
  } else if (to < from) {
    return;
  }
  if (this._from === from && this._to === to) {
    return;
  }
  this._from = from;
  this._to = to;
  if (this.liveList) {
    this.list();
  }
};

/**
 * 対象行のstateで指定した情報を返します
 * stateで指定できるのは以下のとおり
 *     index: 0から始まるインデックス
 *     first: 最初の行かどうかの真偽値
 *     last: 最後の行かどうかの真偽値
 *     middle: 最初でも最後でもない行かどうかの真偽値
 *     odd: 奇数行かどうかの真偽値
 *     even: 偶数行かどうかの真偽値
 * oddとevenはインデックスの数字と意味が逆になるので注意してください
 * いずれも対象行がデータテーブルに存在しない場合はnullを返します
 * @method getState
 * @param  {Row}            row
 * @param  {String}         state
 * @return {Number|Boolean} result
 */
Datatable.prototype.getState = function getState(row, state) {
  var rows = this.rows;
  var idx = rows.indexOf(rows);
  if (idx === -1) {
    return null;
  }
  var last = rows.length - 1;
  switch(state) {
  case 'index':
    return idx;
  case 'first':
    return idx === 0;
  case 'last':
    return idx === last;
  case 'middel':
    return !(idx === 0 || idx === last);
  case 'odd':
    return idx % 2 === 0;
  case 'even':
    return idx % 2 === 1;
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