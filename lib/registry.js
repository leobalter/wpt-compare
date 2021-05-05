const NativeHTMLElement = window.HTMLElement;
const { define: nativeDefine, whenDefined: nativeWhenDefined, get: nativeGet } = window.customElements;
const nativeRegistry = window.customElements;
const { defineProperties } = Object;
const definitionForElement = new WeakMap();
const pendingRegistryForElement = new WeakMap();
const definitionForConstructor = new WeakMap();
const _pivotCtorByTag = new Map();
const _definitionsByTag = new Map();
const _definitionsByClass = new Map();
const _definedPromises = new Map();
const _definedResolvers = new Map();
const _awaitingUpgrade = new Map();
const { hasAttribute: nativeHasAttribute, setAttribute: nativeSetAttribute, removeAttribute: nativeRemoveAttribute, getAttribute: nativeGetAttribute, } = HTMLElement.prototype;
function createDefinitionRecord(constructor) {
    // Since observedAttributes can't change, we approximate it by patching
    // set/removeAttribute on the user's class
    const { connectedCallback, disconnectedCallback, adoptedCallback, attributeChangedCallback, } = constructor.prototype;
    const observedAttributes = new Set(constructor.observedAttributes || []);
    const definition = {
        UserCtor: constructor,
        connectedCallback,
        disconnectedCallback,
        adoptedCallback,
        attributeChangedCallback,
        observedAttributes,
    };
    return definition;
}
// patch for the global registry define mechanism
CustomElementRegistry.prototype.define = function define(tagName, constructor, options) {
    if (options && options.extends) {
        throw new DOMException('NotSupportedError: ');
    }
    nativeGet.call(this, tagName); // SyntaxError if The provided name is not a valid custom element name.
    tagName = tagName.toLowerCase();
    if (_definitionsByTag.get(tagName) !== undefined) {
        throw new DOMException(`Failed to execute 'define' on 'CustomElementRegistry': the name "${tagName}" has already been used with this registry`);
    }
    const definition = getDefinitionForConstructor(constructor);
    if (_definitionsByClass.get(constructor) !== undefined) {
        throw new DOMException(`Failed to execute 'define' on 'CustomElementRegistry': this constructor has already been used with this registry`);
    }
    _definitionsByTag.set(tagName, definition);
    _definitionsByClass.set(constructor, definition);
    let PivotCtor = _pivotCtorByTag.get(tagName);
    if (!PivotCtor) {
        PivotCtor = createPivotingClass(tagName, definition);
    }
    // For globally defined custom elements, the definition associated
    // to the UserCtor has a back-pointer to PivotCtor in case the user
    // new the UserCtor, so we know how to create the underlying element.
    definition.PivotCtor = PivotCtor;
    // Upgrade any elements created in this scope before define was called
    // which should be exhibit by LWC using a tagName (in a template)
    // before the same tagName is registered as a global, while others
    // are already created and waiting in the global context, that will
    // require immediate upgrade when the new global tagName is defined.
    const awaiting = _awaitingUpgrade.get(tagName);
    if (awaiting) {
        _awaitingUpgrade.delete(tagName);
        for (const element of awaiting) {
            const registeredDefinition = pendingRegistryForElement.get(element);
            if (registeredDefinition) {
                pendingRegistryForElement.delete(element);
                internalUpgrade(element, registeredDefinition, definition);
            }
        }
    }
    // Flush whenDefined callbacks
    const resolver = _definedResolvers.get(tagName);
    if (resolver) {
        resolver(constructor);
    }
};
CustomElementRegistry.prototype.get = function get(tagName) {
    var _a;
    return nativeGet.apply(this, arguments) && ((_a = _definitionsByTag.get(tagName)) === null || _a === void 0 ? void 0 : _a.UserCtor);
};
CustomElementRegistry.prototype.whenDefined = function whenDefined(tagName) {
    return nativeWhenDefined.apply(this, arguments).then(() => {
        let promise = _definedPromises.get(tagName);
        if (!promise) {
            const definition = _definitionsByTag.get(tagName);
            if (definition) {
                return Promise.resolve(definition.UserCtor);
            }
            let resolve;
            promise = new Promise((r) => (resolve = r));
            _definedPromises.set(tagName, promise);
            _definedResolvers.set(tagName, resolve);
        }
        return promise;
    });
};
// User extends this HTMLElement, which returns the CE being upgraded
let upgradingInstance;
window.HTMLElement = function HTMLElement() {
    // Upgrading case: the pivoting class constructor was run by the browser's
    // native custom elements and we're in the process of running the
    // "constructor-call trick" on the natively constructed instance, so just
    // return that here
    const instance = upgradingInstance;
    if (instance) {
        upgradingInstance = undefined;
        return instance;
    }
    // Construction case: we need to construct the pivoting instance and return it
    // This is possible when the user register it via global registry and instantiate
    // it via `new Ctor()`.
    const { constructor } = this;
    const definition = _definitionsByClass.get(constructor);
    if (!definition || !definition.PivotCtor) {
        throw new TypeError('Illegal constructor (custom element class must be registered with global customElements registry to be newable)');
    }
    // This constructor is ONLY invoked when it is the user instantiating
    // an element via new Ctor while Ctor is a registered global constructor.
    const { PivotCtor, UserCtor } = definition;
    return new PivotCtor(UserCtor);
};
window.HTMLElement.prototype = NativeHTMLElement.prototype;
// Helper to create stand-in element for each tagName registered that delegates
// out to the registry for the given element
function createPivotingClass(tagName, registeredDefinition) {
    class PivotCtor extends NativeHTMLElement {
        constructor(UserCtor) {
            // This constructor can only be invoked by:
            // a) the browser instantiating  an element from parsing or via document.createElement.
            // b) LWC new PivotClass (This constructor is NOT observable/accessible in user-land).
            // b) new UserClass.
            // When LWC construct it, it will pass the upgrading definition as an argument
            // If the caller signals via UserCtor that this is in fact a controlled
            // definition, we use that one, otherwise fallback to the global
            // internal registry.
            super();
            const definition = UserCtor ? getDefinitionForConstructor(UserCtor) : _definitionsByTag.get(tagName);
            if (definition) {
                internalUpgrade(this, registeredDefinition, definition);
            }
            else {
                // This is the case in which there is no global definition, and
                // it is not handled by LWC (otherwise it will have a valid UserCtor)
                // so we need to add it to the pending queue just in case it eventually
                // gets defined in the global registry.
                pendingRegistryForElement.set(this, registeredDefinition);
                // We need to install the minimum HTMLElement prototype so that
                // this instance works like a regular element without a registered
                // definition; internalUpgrade will eventually install the full CE prototype
                Object.setPrototypeOf(this, HTMLElement.prototype);
            }
        }
        connectedCallback() {
            const definition = definitionForElement.get(this);
            if (definition) {
                // Delegate out to user callback
                definition.connectedCallback &&
                    definition.connectedCallback.call(this);
            }
            else {
                // Register for upgrade when defined (only when connected, so we don't leak)
                let awaiting = _awaitingUpgrade.get(tagName);
                if (!awaiting) {
                    _awaitingUpgrade.set(tagName, (awaiting = new Set()));
                }
                awaiting.add(this);
            }
        }
        disconnectedCallback() {
            const definition = definitionForElement.get(this);
            if (definition) {
                // Delegate out to user callback
                definition.disconnectedCallback &&
                    definition.disconnectedCallback.call(this);
            }
            else {
                // Un-register for upgrade when defined (so we don't leak)
                const awaiting = _awaitingUpgrade.get(tagName);
                if (awaiting) {
                    awaiting.delete(this);
                }
            }
        }
        adoptedCallback() {
            var _a;
            const definition = definitionForElement.get(this);
            (_a = definition === null || definition === void 0 ? void 0 : definition.adoptedCallback) === null || _a === void 0 ? void 0 : _a.call(this);
        }
        attributeChangedCallback(name, _oldValue, _newValue) {
            var _a;
            const definition = definitionForElement.get(this);
            // if both definitions are the same, then the observedAttributes is the same,
            // but if they are different, only if the runtime definition has the attribute
            // marked as observed, then it should invoke attributeChangedCallback.
            if (registeredDefinition === definition || (definition === null || definition === void 0 ? void 0 : definition.observedAttributes.has(name))) {
                (_a = definition.attributeChangedCallback) === null || _a === void 0 ? void 0 : _a.apply(this, arguments);
            }
        }
    }
    PivotCtor.observedAttributes = registeredDefinition.observedAttributes;
    // Register a pivoting class which will handle global and LWC initializations
    nativeDefine.call(nativeRegistry, tagName, PivotCtor);
    _pivotCtorByTag.set(tagName, PivotCtor);
    return PivotCtor;
}
function getObservedAttributesOffset(registeredDefinition, instancedDefinition) {
    // natively, the attributes observed by the registered definition are going to be taken
    // care of by the browser, only the difference between the two sets has to be taken
    // care by the patched version.
    return new Set([...registeredDefinition.observedAttributes].filter(x => !instancedDefinition.observedAttributes.has(x)));
}
// Helper to patch CE class setAttribute/getAttribute to implement
// attributeChangedCallback
function patchAttributes(instance, registeredDefinition, instancedDefinition) {
    const { observedAttributes, attributeChangedCallback } = instancedDefinition;
    if (observedAttributes.size === 0 || attributeChangedCallback === undefined) {
        return;
    }
    const offset = getObservedAttributesOffset(registeredDefinition, instancedDefinition);
    if (offset.size === 0) {
        return;
    }
    // instance level patches
    defineProperties(instance, {
        setAttribute: {
            value: function setAttribute(name, value) {
                if (offset.has(name)) {
                    const old = nativeGetAttribute.call(this, name);
                    // maybe we want to call the super.setAttribute rather than the native one
                    nativeSetAttribute.call(this, name, value);
                    attributeChangedCallback.call(this, name, old, value + '');
                }
                else {
                    nativeSetAttribute.call(this, name, value);
                }
            },
            writable: true,
            enumerable: true,
            configurable: true,
        },
        removeAttribute: {
            value: function removeAttribute(name) {
                if (offset.has(name)) {
                    const old = nativeGetAttribute.call(this, name);
                    // maybe we want to call the super.removeAttribute rather than the native one
                    nativeRemoveAttribute.call(this, name);
                    attributeChangedCallback.call(this, name, old, null);
                }
                else {
                    nativeRemoveAttribute.call(this, name);
                }
            },
            writable: true,
            enumerable: true,
            configurable: true,
        }
    });
}
// Helper to upgrade an instance with a CE definition using "constructor call trick"
function internalUpgrade(instance, registeredDefinition, instancedDefinition) {
    Object.setPrototypeOf(instance, instancedDefinition.UserCtor.prototype);
    definitionForElement.set(instance, instancedDefinition);
    // attributes patches when needed
    if (instancedDefinition !== registeredDefinition) {
        patchAttributes(instance, registeredDefinition, instancedDefinition);
    }
    // Tricking the construction path to believe that a new instance is being created,
    // that way it will execute the super initialization mechanism but the HTMLElement
    // constructor will reuse the instance by returning the upgradingInstance.
    // This is by far the most important piece of the puzzle
    upgradingInstance = instance;
    new instancedDefinition.UserCtor();
    const { observedAttributes, attributeChangedCallback } = instancedDefinition;
    if (observedAttributes.size === 0 || attributeChangedCallback === undefined) {
        return;
    }
    const offset = getObservedAttributesOffset(registeredDefinition, instancedDefinition);
    if (offset.size === 0) {
        return;
    }
    // Approximate observedAttributes from the user class, but only for the offset attributes
    offset.forEach((name) => {
        if (nativeHasAttribute.call(instance, name)) {
            const newValue = nativeGetAttribute.call(instance, name);
            attributeChangedCallback.call(instance, name, null, newValue);
        }
    });
}
function getDefinitionForConstructor(constructor) {
    if (!constructor || !constructor.prototype || typeof constructor.prototype !== 'object') {
        throw new TypeError(`The referenced constructor is not a constructor.`);
    }
    let definition = definitionForConstructor.get(constructor);
    if (!definition) {
        definition = createDefinitionRecord(constructor);
        definitionForConstructor.set(constructor, definition);
    }
    return definition;
}
