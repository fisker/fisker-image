# this project is moved to https://github.com/fisker/fei.js


Promise

https://unpkg.com/es6-promise@4.2.5/dist/es6-promise.auto.min.js

typedArray

which ie9 is missing

https://unpkg.com/js-polyfills@0.1.42/typedarray.js

window.atob
which ie9 is missing


https://cdn.polyfill.io/v2/polyfill.js?features=

var features = [];
('Promise' in window) || features.push('Promise');
('atob' in window) || features.push('atob');
('DataView' in window) || features.push('_TypedArray');

s.src = 'https://cdn.polyfill.io/v2/polyfill.min.js?features='+features.join(',')+'&flags=gated,always&ua=chrome/50&callback=main';
