# Custom Elements Polyfill

The original reason for this polyfill was to support nested web components via innerHTML, appendChild and other DOM methods.

It was intended to work in Edge 18 (pre-chromium).

## How does it worked

Instead of patching the HTMLElement native class, the polyfill patched the DOM insertion methods and properties, like appendChild and innerHTML.

The MutationObservser API was not used because of two reasons:
- when a mutation occurs, only the root elements of the mutation are returned
- it was not needed because by patching the DOM methods and properties, we already knew all the mutations in advance
