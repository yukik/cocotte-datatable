var Datatable = require('..');
var Datasource = require('cocotte-datasource');
var Row = require('cocotte-row');
var Field = require('cocotte-field');


var config = {
  fields: {
    name: {type: Field.Text},
    age : {type: Field.Number}
  }
};

var ds = new Datasource(config);

ds.add({name: 'foo', age: 16});
ds.add({name: 'bar', age: 13});
ds.add({name: 'baz', age: 20});
ds.add({name: 'qux', age: 19});
ds.add({name: 'hoge', age: 13});
ds.add({name: 'apa', age: 13});

// var dt = new Datatable(ds);

// dt.setCondition({age: [null, 19]});

// dt.setOrder([['age', true], ['name', true]]);

// dt.list();


var dt = new Datatable(ds);
// 行の絞り込みの設定
dt.setCondition({age: [null, 19]});
// 並び順を設定
dt.setOrder([['age', true], ['name', true]]);

// 範囲設定
dt.from = 0;
dt.to = null;

// 行の取得
dt.list();
// 現在行の設定
dt.currentIndex = 0;


// dt.next();
// console.log(Row.data(dt.currentRow));

dt.forEach(function(row){
  console.log(Row.data(row));
});


// var s = Object.getOwnPropertyNames(dt);
// console.log(s);
