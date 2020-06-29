if(!window.customElements) {

	//create customElements
	window.customElements = { 
		define: function(tag, classRef, options) {
			__defined[tag] = {classRef:classRef, extends:options?options.extends:null};
			__Observe.deployUpgrade(tag);
		}
	} 

	//is connected polyfill
	if(!('isConnected' in Node.prototype)) {
		Object.defineProperty(Node.prototype, 'isConnected', {
			get: function() {
				return this instanceof Document ||
				(this.ownerDocument &&
				!(this.ownerDocument.compareDocumentPosition(this) &
				this.DOCUMENT_POSITION_DISCONNECTED));
			},
		});
	}

	//includes polyfill
	if(!('includes' in Array.prototype)) {
		let includes = {value:function(el){return this.indexOf(el)!==-1;}};
		Object.defineProperty(Array.prototype,  'includes', includes);
		Object.defineProperty(String.prototype, 'includes', includes);
	}
	
	//object containing all tags
	  let __defined = {};
	  
	//map of all upgraded items
	let __map = new WeakMap();

	//observe and deploy upgrade to custom elements already in the document
	let __Observe = new (function() {

		this.observersElems = {};

		this.toUpgrade = function(elem,tag) {
			if(__defined[tag]) {
				__upgrade(elem, tag, __defined[tag].classRef);
			} else {
				(this.observersElems[tag]
					= this.observersElems[tag] || new Set())
					.add(elem);
			}
		}

		this.deployUpgrade = function(tag) {
			(this.observersElems[tag] || []).forEach(function(el) {
				__upgrade(el, tag, __defined[tag].classRef);
				});
			this.observersElems[tag] = null;
		}

	})();

	//get custom tag if there is any
	let getTag = function(node) {
	  let tag, is;
	  if(tag = node.tagName) {
	    is = node.getAttribute('is');
	    if(is) tag = is;
	    if(tag.includes('-'))
	      return tag.toLowerCase();
	  }
	}

	//helper method
	let __toUpgradeIfCustom = function(elem) {
	  const tag = getTag(elem);
	  if(tag) __Observe.toUpgrade(elem,tag);
	} 
	
	//define upgrade method
	let __construct = function(elem, tag, classRef) {
		if(!__map.has(elem)) {
		  let descriptors = Object.getOwnPropertyDescriptors(classRef.prototype);
			for(let method in descriptors)
				Object.defineProperty(elem, method, descriptors[method]);
			__map.set(elem, {connected:false,classRef:classRef,attributes:{}});
		}
	}

	//connectAttributes
	let __connectAttributes = function(elem, one, classRef) { 
		let attrs = classRef.observedAttributes;
		let callback = classRef.prototype.attributeChangedCallback; 
		if(attrs && callback) {
			if(one) attrs = attrs.includes(one.name) ? [one.name] : [];
			let store = __map.get(elem).attributes;
			for(let i=0; i!=attrs.length; i++) { 
				if(elem.hasAttribute(attrs[i])) {
					let value = elem.getAttribute(attrs[i]);
					let oldValue = store[attrs[i]];
					if(value !== oldValue) {
						store[attrs[i]] = value;
					  callback.call(elem, attrs[i], oldValue, elem.getAttribute(attrs[i]));
					} 
				} else if(one && one.removed) {
					delete store[attrs[i]];
					callback.call(elem, attrs[i], oldValue, null);
				} 
			}
		}	
	};

	//connectedCallback && disconnectedCallback
	let __connectionCallbacks = function(elem) {
	  let store = __map.get(elem);
	  let connected = elem.ownerDocument;
	  if(store.connected != connected) {
	    store.connected = connected; 
	    let callback = elem[(connected?'':'dis')+'connectedCallback'];
	    if(callback) callback.call(elem);
	  }
	};

	//initialize element
	let __upgrade = function(elem, tag, classRef) {
		__construct(elem, tag, classRef);
		__connectAttributes(elem, null, classRef);
		__connectionCallbacks(elem);
	};

	//upgrade all children; execute immediately for document
	let __upgradeAll = function(root, include_root) {
		let elems = getAll(root, include_root);//Array.from(root.getElementsByTagName('*'));
		//if(include_root && root.tagName) elems.unshift(root);
		for(let i=0;i!=elems.length;i++) 
			__toUpgradeIfCustom(elems[i]);
	};

	let getAll = function(root, include_root) {
		let all = include_root? [root]:[];
		function getChildren(parent) {
			let children = parent.children;
			for(let i=0;i!=children.length;i++) {
				all[all.length] = children[i];
				getChildren(children[i]);
			} 
		};
		getChildren(root);
		return all;
	};
	
	//change default methods so that nested custom elements are possible
	['appendChild','insertBefore','replaceChild','removeChild', 
	 'cloneNode','append','prepend','after','before','remove', 
		'insertAdjacenteElement','insertAdjacentHTML'].forEach(function(method) {
		let original = Node.prototype[method];
		if(!original) return;
		let isNotRoot = ['after','before','insertAdjacenteElement','insertAdjacentHTML'].includes(method);
		let parseRoot = method == 'cloneNode';
		let toRemove  = ['removeChild','replaceChild','remove'].indexOf(method);
		let toConnect = method != 'removeChild';
		Node.prototype[method] = function() {
			let exec = original.apply(this, arguments);
			if(toRemove!=-1) __upgradeAll(arguments[toRemove]||this, true);
			if(toConnect) __upgradeAll(isNotRoot?this.parentNode:this, parseRoot);
			return exec;
		}
	});

	//create element
	['createElement'].forEach(function(method) {
		let original = document[method];
		document[method] = function() {
		  	let exec = original.apply(this, arguments);
		  	if(exec.tagName) {
				let tag = !arguments[1] || !arguments[1].is
					? arguments[0]
					: (function(){
						exec.setAttribute('is',arguments[1].is);
						return arguments[1].is
					})();
				if(__defined[tag])
					__construct(this, tag, __defined[tag].classRef);
		  	} 
			return exec;
		}
	});

	//change default properties so that nested custom elements are possible
	['innerHTML','outerHTML'].forEach(function(property) {
		let original = Object.getOwnPropertyDescriptor(Element.prototype, property);
		let outer = property == 'outerHTML';
		Object.defineProperty(Element.prototype, property, {
			set: function() {
		  	let root = outer?this.parentNode:this;
		  	let exec, children = Array.from(this.children);
				if(outer) {
				  exec = original.set.apply(this, arguments);
				  __upgradeAll(this, true);
				} else {
				  children.forEach(function(el){root.removeChild(el);});
				  exec = original.set.apply(this, arguments);
				} 
				__upgradeAll(root);
				return exec;
			},
			get: function() {
				return original.get.call(this);
			}
		});
	});

	//change default setAttribute
	['setAttribute','removeAttribute'].forEach(function(method) {
		let original = Element.prototype[method];
		Element.prototype[method] = function() {
			let exec = original.apply(this, arguments);
			let store = __map.get(this);
			if(store) __connectAttributes(this, { name:arguments[0], removed:method === 'removeAttribute' }, store.classRef);
			return exec;
		}
	});
	
	window.addEventListener("DOMContentLoaded", function(){ __upgradeAll(document); })
	
} 
