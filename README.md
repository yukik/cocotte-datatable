cocotte-datatable
============

# はじめに

データテーブルは、データソースの一部もしくは全部の行を参照します  
データソースの操作は参照するデータテーブルすべてに影響します  
データテーブルは個別に行の絞り込みのための条件や、並び順、現在行を持ちます

# 使用方法

```
// データソースの作成
var Datasource = require('cocotte-datasource');
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

// データテーブルの作成
var Datatable = require('cocotte-datatable');
var dt = new Datatable(ds);
// 行の絞り込みの設定
dt.setCondition({age: [null, 19]});
// 並び順を設定
dt.setOrder('name');
// 行の取得
dt.list();
// 現在行の設定
dt.currentIndex = 0;
```

# プロパティ

## ds

  + 参照元データソース

## length

  + 行数

## currentIndex

  + 現在行のインデックス
  + 現在行が存在しない場合は、-1になります

## currentRow

  + 現在行
  + 現在行が存在しない場合は、nullになります

## from

  + 開始行のインデックス

## to

  + 終了行のインデックス

## liveList

元のデータソースに変更があった場合に行リストを自動的に更新します  
既定値はfalseです  
フォームリストでは、入力の度にリストが更新されてしまうためfalseにします  
表示用リストは、常に最新のリストを確認できるためtrueが便利で、メソッドのlistを
行う必要がありません

# メソッド

## list()

  + データテーブルの行リストを更新します
  + 行リストは絞り込み時に条件、並び順、開始行、終了行に影響します
  + 戻り値は取得した行数です

## setCondition({Object} condition)

  + 絞り込み条件を設定する
  + 固定値をオブジェクトで設定します
  + `{name:'foo}`はnameフィールドが'foo'の値の行を抽出します
  + `{age: [10, 19]}`はageフィールドが10から19の値の行を抽出します
      + 開始か終了をnullにすると以上、以下となります
  + `{age: function(v){return v%2;}}`はageフィールドが奇数の行を抽出します
      + 判定を行う関数の第二引数には行が渡されます

## setOrder({String|Array} order)

  + 並び順を設定する
  + 文字列を設定した場合は、フィールド名を昇順に設定したこととなります
  + 配列で設定した場合は、`[[フィールド名1, 昇順], [フィールド名2, 昇順]...]`となります
  + 複数のフィールドや降順の設定は配列でのみ指定できます

## first()

  + 最初の行を現在行にする
  + 戻り値は、移動できたかどうかです

## next()

  + 次の行に移動する
  + 現在行が未設定の場合は、最初の行に移動します
  + 最後の行の場合は、移動しません
  + 戻り値は、移動できたかどうかです

## back()

  + 次の行に移動する
  + 現在行が未設定の場合は、最後の行に移動します
  + 最初の行の場合は、移動しません
  + 戻り値は、移動できたかどうかです

## last()

  + 最初の行を現在行にする
  + 戻り値は、移動できたかどうかです

## move({Number|Row} index/row)

  + 指定した行に移動します
  + 戻り値は、移動できたかどうかです

## add({Object} data)

  + 新規行を元のデータソースに追加します
  + 追加する際に、フィールドの値に絞り条件の値が設定されます
  + データテーブルでは、並び順の設定を無視して最終行に追加します
  + liveListがtrueになっていると、自動的に行リストが更新されてしまいます

## remove({Row} row)

  + 指定行を元のデータソースから排除します

## removeAll()

  + 元のデータソースからデータテーブルの全行を排除します

## find({String|Object} id/filter)

  + 行を取得します
  + 一致するidの行が複数存在する場合は最初に一致した行が返されます

## forEach({Function} callback)

  + 全行を順次取得し、`callback`を実行します
  + `callback`の第一引数に行を、第二引数にインデックスを、第三引数に行全体の配列を渡されます

## every({Function} callback)

  + すべての行に対して`callback`の結果が真であるかを調べます
  + `callback`の第一引数に行を、第二引数にインデックスを、第三引数に行全体の配列を渡されます

## some({Function} callback)

  + いずれかの行に対して`callback`の結果が真であるかを調べます
  + `callback`の第一引数に行を、第二引数にインデックスを、第三引数に行全体の配列を渡されます

## filter ({Function} callback)

  + `callback`を満たす行を配列で返します
  + `callback`の第一引数に行を、第二引数にインデックスを、第三引数に行全体の配列を渡されます

## map({Function} callback)

  + 各行から新しい配列を作成します
  + `callback`の第一引数に行を、第二引数にインデックスを、第三引数に行全体の配列を渡されます

## reduce({Function} callback, {Mixed} initial)

  + 各行から値を計算します
  + `callback`には４つの引数が渡されます
  + `callback`の前回の戻り値が次の第一引数に渡されます
  + 最初のみinitialが渡されます
  + 第二引数以降は先と同様、行・インデックス・行全体の順で渡されます
  + `initial`は一番最初の行を処理する際の第一引数です
  + `initial`を省略した場合は`undefined`です

## reduceRight({Function} callback, {Mixed} initial)

  + 各行をインデックスの降順で値を計算します
  + それ以外は`reduce`と同じです

# イベント

`dt.on(イベント名, コールバック関数)`でイベントを捕捉することができます


## updated ({Row} row, {String} fieldName)

  + 値が更新された
  + rowは更新された行
  + fieldNameは更新されたフィールド名

## listed()

  + リストが更新された

## moved({Row} row)

  + 現在行が移動した
  + rowは移動先の行です
  + リストが更新されても同じ行を参照している場合はmovedイベントは起きません
