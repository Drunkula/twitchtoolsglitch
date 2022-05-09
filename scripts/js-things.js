/**
 *
 * ?. = optional chaining
 *
 *	?? = nullish coalescenece
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_operator
 *
 * null or undefined
 *
 *	var foo = something ?? 'thing if it's null/undefined'
 */

 const customerCity = customer?.city ?? "Unknown city";