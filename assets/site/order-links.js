/* Cape Island Café: ONE place to change Square order links.
   Any link with data-order-key="KEY" gets its href from this map.
   The HTML href is the same fallback, so links still work without JavaScript.
   To use an exact Square item link, replace the URL next to its key. */
(function () {
  var FALLBACK = 'https://capeislandcafe.square.site/s/order';
  var ORDER_LINKS = {
    'meal-prep-starter':    'https://capeislandcafe.square.site/product/meal-prep-starter-5-meals-/JIUT627UGRQJ6JHC3QJKG67B',    /* Meal Prep · Starter, 5 meals ($65) */
    'meal-prep-weekly':     'https://capeislandcafe.square.site/product/meal-prep-weekly-10-meals-/EGCPHAM4CDBWBHG6GVLHGVDR',     /* Meal Prep · Weekly, 10 meals ($125) */
    'meal-prep-family':     'https://capeislandcafe.square.site/product/meal-prep-family-15-meals-/4UUX4J6TQOAGQ55ADVECYSSF',     /* Meal Prep · Family, 15 meals ($180) */
    'soup-quart':           'https://capeislandcafe.square.site/product/soup-by-the-quart/C2KNBFI4EEKNIT4N3IWEFJEX',           /* Soup by the quart ($6) */
    'cheesecake-classic':   'https://capeislandcafe.square.site/product/ice-cream-cheesecake-classic-new-york/EQMKFPEAZJPENI4KJYQVKIUE',   /* Ice Cream Cheesecake · Classic New York ($42) */
    'cheesecake-signature': 'https://capeislandcafe.square.site/product/ice-cream-cheesecake-signature-flavor/TATLL7VROEBY4UYNYH4C4JSO'  /* Ice Cream Cheesecake · Signature Flavor ($48) */
  };
  window.CIC_ORDER_LINKS = ORDER_LINKS;
  var links = document.querySelectorAll('[data-order-key]');
  for (var i = 0; i < links.length; i++) {
    var url = ORDER_LINKS[links[i].getAttribute('data-order-key')];
    if (url) links[i].href = url;
  }
})();
