/*global Cocotte*/

var isClient   = typeof window === 'object';
var Datatable  = isClient ? Cocotte.Datatable  : require('..');
var Datasource = isClient ? Cocotte.Datasource : require('cocotte-datasource');
var Row        = isClient ? Cocotte.Row        : require('cocotte-row');
var Field      = isClient ? Cocotte.Field      : require('cocotte-field');

var config = {
  fields: {
    name: {type: Field.Text},
    age : {type: Field.Number}
  }
};

var ds = new Datasource(config);

ds.add({name: 'foo', age: 16});
ds.add({name: 'bar', age: 10});
ds.add({name: 'baz', age: 20});
ds.add({name: 'qux', age: 19});
ds.add({name: 'hoge', age: 13});
ds.add({name: 'fuga', age: 17});
ds.add({name: 'piyo', age: 13});
ds.add({name: 'moe', age: 18});
ds.add({name: 'hana', age: 22});
ds.add({name: 'mai', age: 19});

// ds.forEach(function(row){
//   console.log(Row.data(row));
// });

var dt = new Datatable(ds);

dt.on('listed', function(){
  console.log('---');
  this.forEach(function(row){
    console.log(Row.data(row));
  });
});

// 行の絞り込みの設定
dt.setCondition({age: [11, 19]});

// 並び順を設定
dt.setOrder([['age', true], ['name', true]]);

// 範囲設定
dt.range = [0, 4];

// リスト自動更新
dt.liveList = true;

// 絞り込みの解除
// dt.condition = null;

// 現在行の設定
dt.currentIndex = 2;

dt.currentRow.age = 21;

console.log('---');
console.log(Row.data(dt.currentRow));






