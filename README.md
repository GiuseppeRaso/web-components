# Custom Elements Polyfill

The main reason for this polyfill is that it supports nested components via innerHTML, appendChild etc...

It is intended to work in Edge 18 (pre-chromium).

Just clone the repository and include the polyfill via script tag. You can also see the example.

## How does it work

Instead of patching the HTMLElement native class, the polyfill patches the dom insertion methods and properties, like appendChild and innerHTML.

The MutationObservser API is not used because of two reasons:
- when a mutation occur, only the root elements of this mutation are returned
- it is not needed