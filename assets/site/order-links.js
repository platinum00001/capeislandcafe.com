/* Cape Island Café: ONE place to change Square order links.
   Any link with data-order-key="KEY" gets its href from this map.
   The HTML href is the same fallback, so links still work without JavaScript.
   To use an exact Square item link, replace the URL next to its key. */
(function () {
  var FALLBACK = 'https://capeislandcafe.square.site/s/order';
  var ORDER_LINKS = {
    'meal-prep-starter': FALLBACK,   /* Meal Prep · Starter, 5 meals ($65) */
    'meal-prep-weekly':  FALLBACK,   /* Meal Prep · Weekly, 10 meals ($125) */
    'meal-prep-family':  FALLBACK,   /* Meal Prep · Family, 15 meals ($180) */
    'cheesecake':        FALLBACK    /* Frozen Ice Cream Cheesecakes */
  };
  window.CIC_ORDER_LINKS = ORDER_LINKS;
  var links = document.querySelectorAll('[data-order-key]');
  for (var i = 0; i < links.length; i++) {
    var url = ORDER_LINKS[links[i].getAttribute('data-order-key')];
    if (url) links[i].href = url;
  }
})();
