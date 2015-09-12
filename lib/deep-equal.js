/**
 * 簡易のディープ比較
 * @method deepEqual
 * @param  {Mixed}   value
 * @param  {Mixed}   compareTo
 * @return {Boolean} equal
 */
module.exports = function deepEqual (value, compareTo) {
  if (value === compareTo) {
    return true;

  } else if (value === null || compareTo === null  ||
    !(typeof value === 'object' && typeof compareTo === 'object')) {
    return false;

  } else if (Array.isArray(value) && Array.isArray(compareTo)) {
    if (value.length !== compareTo.length) {
      return false;
    }
    return value.every(function(item, i) {return deepEqual(item, compareTo[i]);});

  } else {
    var keys1 = Object.keys(value);
    var keys2 = Object.keys(compareTo);
    if (keys1.length !== keys2.length) {
      return false;
    }
    return keys1.every(function(key) {return deepEqual(value[key], compareTo[key]);});
  }
};


