/* Cape Island Café: "Ask Us" helper. Runs fully in the browser, no backend.
   Answers come only from ask-kb.json (generated from the site's own menu data). */
(function (root) {
  'use strict';

  /* ---------------- text utils ---------------- */
  var STOP = ('a an the of on in at to for and or is are am be do does did you your yours we our ours i me my it its this that these ' +
    'what whats what\'s which who how much many can could would will should please tell about any there have has had get got ' +
    'with from by as so if just like want wanna know give show list some cost costs price prices priced much does').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  var GENERIC = { bowl: 1, wrap: 1, salad: 1, soup: 1, plate: 1, own: 1, build: 1, lunch: 1, brunch: 1, sunday: 1, fresh: 1, hot: 1 };

  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/é/g, 'e').replace(/ç/g, 'c')
      .replace(/[^a-z0-9$.\s-]/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function stem(w) {
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + 'y';
    if (w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function tokens(s, keepStop) {
    return norm(s).replace(/[$.]/g, ' ').split(' ').filter(function (w) { return w && (keepStop || !STOPSET[w]); }).map(stem);
  }
  function lev(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }
  function wordMatch(q, t) {
    if (q === t) return true;
    if (t.length >= 5 && q.length >= 4 && (t.indexOf(q) === 0 && q.length >= t.length - 2)) return true;
    var L = Math.max(q.length, t.length);
    if (L >= 5 && lev(q, t) <= 1) return true;
    if (L >= 8 && lev(q, t) <= 2) return true;
    return false;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- bot ---------------- */
  function createBot(kb) {
    var B = kb.business, E = kb.event, P = kb.pages;
    var items = kb.items.map(function (it) {
      var t = tokens(it.name);
      return { it: it, toks: t, key: t.filter(function (w) { return !GENERIC[w]; }) };
    });

    function a(label, href, primary, ext) { return { label: label, href: href, primary: !!primary, ext: !!ext }; }
    var ORDER = a('Order Now', B.order, true, true);
    var CALL = a('Call ' + B.phone, B.tel);
    var MAIL = a('Email us', 'mailto:' + B.email);
    function fallback() {
      return { html: 'I’m not sure about that one. Please call <a href="' + B.tel + '">' + B.phone + '</a> or email <a href="mailto:' + B.email + '">' + B.email + '</a> and we’ll be happy to help.',
        speak: 'I’m not sure about that one. Please call 774 2 ISLAND, or email info at cape island cafe dot com.', actions: [CALL, MAIL], intent: 'fallback' };
    }
    function bySection(sec) { return kb.items.filter(function (i) { return i.section === sec; }); }
    function list(arr, withDesc) {
      return '<ul class="ans-list">' + arr.map(function (i) {
        return '<li><span>' + esc(i.name) + '</span><b>' + esc(i.price) + '</b>' + (withDesc && i.desc ? '<small>' + esc(i.desc) + '</small>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    function speakList(arr) { return arr.map(function (i) { return i.name + ', ' + i.price.replace('$', '') + ' dollars'; }).join('; '); }

    function cap(t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
    function itemAnswer(it) {
      var h, s, acts = [];
      it = Object.assign({}, it, { desc: cap(it.desc) });
      if (it.menu === 'brunch') {
        h = '<b>' + esc(it.name) + '</b> is ' + esc(it.price) + ' on the tentative menu for <b>' + esc(E.name) + '</b> (' + esc(E.date) + ').' +
          (it.desc ? '<br>' + esc(it.desc) : '') + '<br><small>' + esc(E.note) + ' ' + esc(E.tickets) + '. Brunch items can’t be ordered online.</small>';
        s = it.name + ' is ' + it.price.replace('$', '') + ' dollars on the tentative menu for ' + E.name.replace('’', "'") + ', ' + E.date + '. ' + (it.desc || '');
        acts.push(a('View the brunch menu', E.page, true));
      } else {
        h = '<b>' + esc(it.name) + '</b> is ' + esc(it.price) + (it.section === 'Add-Ons' ? ' as an add-on' : '') + ' on our lunch menu (' + esc(it.section) + ').' +
          (it.desc ? '<br>' + esc(it.desc) : '');
        s = it.name + ' is ' + it.price.replace('$', '') + ' dollars' + (it.section === 'Add-Ons' ? ' as an add-on.' : '.') + (it.desc ? ' ' + it.desc : '');
        if (it.steps) {
          h += '<ol class="ans-steps">' + it.steps.map(function (st) { return '<li><b>' + esc(st.title) + ':</b> ' + esc(st.options) + '</li>'; }).join('') + '</ol>';
          s += ' Choose a base, a protein, up to four vegetables, a sauce or dressing, and a side.';
        } else if (!it.desc && it.section !== 'Add-Ons' && it.section !== 'Beverages') {
          h += '<br><small>For ingredient details, please call ' + esc(B.phone) + '.</small>';
        }
        acts.push(it.order ? a('Order ' + it.name, it.order, true, true) : ORDER);
      }
      return { html: h, speak: s, actions: acts, intent: 'item', item: it.name, img: it.img || '' };
    }
    function itemsAnswer(arr) {
      var brunch = arr.every(function (i) { return i.menu === 'brunch'; });
      return { html: 'Here’s what I found:' + list(arr, true) + (brunch ? '<small>' + esc(E.note) + '</small>' : ''),
        speak: 'Here is what I found: ' + speakList(arr) + '.', actions: brunch ? [a('View the brunch menu', E.page, true)] : [ORDER, a('See the lunch menu', P.menu)],
        intent: 'items', items: arr.map(function (i) { return i.name; }) };
    }

    var INTENTS = [
      { id: 'greet', w: { hi: 1.5, hello: 1.5, hey: 1.5, morning: 1, afternoon: 1 }, f: function () {
        return { html: 'Hi! I can help with our lunch menu, prices, hours, ordering, and the Jones’n Sunday Brunch. What would you like to know?', speak: 'Hi! I can help with our lunch menu, prices, hours, ordering, and the Sunday brunch. What would you like to know?', actions: [] }; } },
      { id: 'thanks', w: { thank: 2, thanks: 2, thx: 2, appreciate: 2 }, f: function () {
        return { html: 'You’re welcome! Anything else I can help with?', speak: 'You’re welcome! Anything else I can help with?', actions: [ORDER] }; } },
      { id: 'hours', w: { hour: 2, open: 2, opening: 2, close: 2, closing: 2, closed: 1.5, when: 0.8, time: 1, today: 1, tomorrow: 1, weekend: 1, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1, sunday: 0.6 },
        p: { 'what time': 2, 'are you open': 2 }, f: function (q) {
        var x = /sunday|weekend|saturday/.test(q) ? '<br>Our first Sunday event is <b>' + esc(E.name) + '</b>, ' + esc(E.date) + '.' : '';
        return { html: '<b>' + esc(B.hours) + '</b><br>' + esc(B.soft) + x, speak: 'Lunch is served Monday through Friday, 11 AM to 3 PM. ' + B.soft, actions: [ORDER, CALL] }; } },
      { id: 'order', w: { order: 2, ordering: 2, online: 1.5, pickup: 1.5, takeout: 2, togo: 1.5, square: 1, buy: 1.5, purchase: 1.5, delivery: 2, deliver: 2, ahead: 1 },
        p: { 'to go': 2, 'call ahead': 2, 'pick up': 2 }, f: function (q) {
        var dl = /deliver/.test(q) ? ' I don’t have delivery details, so please call to ask.' : '';
        return { html: 'You can order online with the <b>Order Now</b> button, or call ahead at <a href="' + B.tel + '">' + esc(B.phone) + '</a>. ' + esc(B.togo) + dl,
          speak: 'You can order online with the Order Now button, or call ahead at 774 2 ISLAND. Lunch is to go or stay.', actions: [ORDER, CALL] }; } },
      { id: 'location', w: { where: 1.5, address: 2, located: 2, location: 2, direction: 2, map: 1.5, find: 1, gifford: 2, falmouth: 1.5, street: 1 }, f: function () {
        return { html: 'We’re at <b>' + esc(B.address) + '</b>, on Cape Cod.', speak: 'We are at 316 Gifford Street, Falmouth, Massachusetts.', actions: [a('Map & directions', B.directions, true, true)] }; } },
      { id: 'contact', w: { contact: 2, phone: 2, call: 1.5, email: 2, reach: 1.5, number: 1.5, talk: 1, someone: 1 }, f: function () {
        return { html: 'Call <a href="' + B.tel + '">' + esc(B.phone) + '</a> or email <a href="mailto:' + B.email + '">' + esc(B.email) + '</a>.', speak: 'Call 774 2 ISLAND, or email info at cape island cafe dot com.', actions: [CALL, MAIL] }; } },
      { id: 'menu', w: { menu: 2, food: 1.5, eat: 1.5, serve: 1.5, dish: 1, offer: 1, option: 0.5, selection: 1 }, p: { 'lunch menu': 2, 'what do you have': 1.5 }, f: function () {
        var secs = ['Soups', 'Salads', 'Bowls', 'Wraps'];
        var h = 'Our lunch menu has:<ul class="ans-list sec">' + secs.map(function (s) {
          var arr = bySection(s); return '<li><span><b>' + s + '</b>: ' + arr.map(function (i) { return esc(i.name); }).join(', ') + '</span></li>'; }).join('') +
          '</ul>Plus the <b>Build Your Own Lunch Plate</b> ($14.50), add-ons (including our <b>Baked Potato</b> $3.50 and <b>Loaded Baked Potato</b> $5.50) and beverages.';
        return { html: h, speak: 'Our lunch menu has soups, salads, bowls and wraps, plus a build your own lunch plate for 14 50, add-ons including baked and loaded baked potatoes, and beverages.', actions: [a('See the full menu', P.menu, true), ORDER] }; } },
      { id: 'veg', w: { vegetarian: 3, vegan: 3, veggie: 2, plant: 1.5, meatless: 3, gluten: 2.5, dairy: 2, allergy: 2.5, allergie: 2.5, allergen: 2.5, celiac: 2.5, nut: 1.5, diet: 0.5 }, f: function () {
        return { html: 'Our menu doesn’t label vegetarian or allergen-free items, so please call <a href="' + B.tel + '">' + esc(B.phone) + '</a> to confirm. A few things from the menu that may help:' +
          '<ul class="ans-list sec"><li><span>The <b>Build Your Own Lunch Plate</b> ($14.50) lets you pick a base (salad over mixed greens, or a spinach, wheat or white wrap), up to 4 vegetables (romaine, spinach, kale, cucumber, tomato, avocado, red onion, black beans, corn, cheddar, pepperoncini, olives, cranberries, cabbage), a dressing and a side.</span></li>' +
          '<li><span>Bowls are served over <b>chicken-broth rice</b>.</span></li></ul>',
          speak: 'Our menu doesn’t label vegetarian or allergen-free items, so please call to confirm. The build your own plate lets you choose a salad or wrap base with up to four vegetables. Bowls are served over chicken broth rice.',
          actions: [CALL, a('See the menu', P.menu)] }; } },
      { id: 'byo', w: { byo: 3, custom: 1, choose: 1 }, p: { 'build your own': 3, 'own plate': 3, 'lunch plate': 2 }, f: function () {
        var it = kb.items.filter(function (i) { return i.name === 'Build Your Own Lunch Plate'; })[0]; return itemAnswer(it); } },
      { id: 'drinks', w: { drink: 2, beverage: 2, soda: 2, mocktail: 2.5, refresher: 2.5, cooler: 2, sparkler: 2, punch: 2, fizz: 2, nitro: 2.5, alcohol: 2, alcoholic: 2, beer: 2, wine: 2, cocktail: 2 }, f: function (q) {
        var b = bySection('Beverages');
        var al = /alcohol|beer|wine|cocktail/.test(q) ? 'Our drink menu is non-alcoholic. ' : '';
        return { html: al + '<b>Beverages</b>' + list(b),
          speak: al + 'Beverages: ' + speakList(b) + '.', actions: [ORDER] }; } },
      { id: 'soups', w: { soup: 2.5 }, f: function () { var x = bySection('Soups'); return { html: '<b>Soups</b>' + list(x), speak: 'Our soups: ' + speakList(x) + '.', actions: [ORDER] }; } },
      { id: 'salads', w: { salad: 2.5 }, f: function () { var x = bySection('Salads'); return { html: '<b>Salads</b>' + list(x), speak: 'Our salads: ' + speakList(x) + '.', actions: [ORDER] }; } },
      { id: 'bowls', w: { bowl: 2.5 }, f: function () { var x = bySection('Bowls'); return { html: '<b>Bowls</b>' + list(x) + '<small>Bowls are served over chicken-broth rice.</small>', speak: 'Our bowls: ' + speakList(x) + '.', actions: [ORDER] }; } },
      { id: 'wraps', w: { wrap: 2.5 }, f: function () { var x = bySection('Wraps'); return { html: '<b>Wraps</b>' + list(x), speak: 'Our wraps: ' + speakList(x) + '.', actions: [ORDER] }; } },
      { id: 'sides', w: { side: 2.5, sides: 2.5, potato: 2.5, potatoes: 2.5 }, f: function () { var x = kb.items.filter(function (i) { return /potato/i.test(i.name) && i.section === 'Add-Ons'; }); return { html: 'Our potatoes are under <b>Add-Ons</b>' + list(x, true) + 'Lunch plates come with a side: Chips, Tortilla Chips, Potato Salad or Egg Salad.', speak: 'Our potatoes are under add-ons: ' + speakList(x) + '. Lunch plates come with chips, tortilla chips, potato salad or egg salad.', actions: [a('See the full menu', P.menu, true), ORDER] }; } },
      { id: 'addons', w: { addon: 2.5, add: 1.5, extra: 2, topping: 2 }, p: { 'add on': 2.5 }, f: function () { var x = bySection('Add-Ons'); return { html: '<b>Add-Ons</b>' + list(x), speak: 'Add-ons: ' + speakList(x) + '.', actions: [ORDER] }; } },
      { id: 'brunch', w: { brunch: 3, jone: 3, jones: 3, jonesn: 3, ticket: 2.5, event: 1.5, october: 2, oct: 2, '25': 1.5, '25th': 1.5, sunday: 1.2 }, f: function () {
        var cnt = kb.items.filter(function (i) { return i.menu === 'brunch'; }).length;
        return { html: '<b>' + esc(E.name) + '</b> is <b>' + esc(E.date) + '</b> at Cape Island Café. <b>' + esc(E.tickets) + '.</b><br>The tentative menu has ' + cnt + ' items, including Coconut Cream French Toast, Shrimp &amp; Grits, Chicken &amp; Waffles, Stuffed Quahogs and a Butter-Poached Lobster Tail. <small>' + esc(E.note) + '</small>',
          speak: E.name.replace('’', "'") + ' is ' + E.date + '. Date, time and tickets will be announced. The tentative menu includes coconut cream French toast, shrimp and grits, chicken and waffles, stuffed quahogs, and a butter poached lobster tail.',
          actions: [a('View the brunch menu', E.page, true), a('Special Events', P.events)] }; } },
      { id: 'events', w: { special: 1.5 }, p: { 'special event': 3 }, f: function () {
        return { html: 'Our first featured event is <b>' + esc(E.name) + '</b>, ' + esc(E.date) + '. More special events are coming soon. To ask about an event, email <a href="mailto:' + B.email + '">' + esc(B.email) + '</a>.',
          speak: 'Our first featured event is the Sunday brunch, ' + E.date + '. More special events are coming soon.', actions: [a('Special Events', P.events, true), MAIL] }; } },
      { id: 'recovery', w: { recovery: 3, sober: 2.5, sobriety: 2.5, addiction: 2.5, support: 1.5, community: 1.5, meeting: 1 }, p: { 'recovery cafe': 3 }, f: function () {
        return { html: 'Cape Island Café is a <b>Recovery Café</b>: a welcoming community space and home of <b>Root to Rise</b>, a program of Inspiration Is Everywhere, a 501(c)(3) nonprofit. People in recovery can get a free or low-cost meal and talk with a recovery coach. To volunteer or support, email <a href="mailto:roottorisema@gmail.com">roottorisema@gmail.com</a>. Everyone is welcome, just as you are.',
          speak: 'Cape Island Café is a Recovery Café: a welcoming community space and home of Root to Rise, a program of Inspiration Is Everywhere. People in recovery can get a free or low-cost meal and talk with a recovery coach. Everyone is welcome.', actions: [a('About the Recovery Café', P.recovery, true)] }; } },
      { id: 'cheesecake', w: { cheesecake: 3, cake: 2, dessert: 2, sweet: 0.8, ice: 1, cream: 0.5 }, f: function () {
        return { html: '<b>Frozen Ice Cream Cheesecakes</b>, handmade and served frozen. 9-inch (serves 8–12): Classic New York $42, or any of our 10 signature flavors $48. Fully custom flavor or design from $55. Topping upgrade $15. Order at least 48 hours ahead (72 hours for custom).',
          speak: 'Our frozen ice cream cheesecakes are 42 dollars for Classic New York and 48 for a signature flavor. Custom starts at 55. Order at least 48 hours ahead, or 72 for custom.', actions: [a('Ice Cream Cheesecakes', P.cheesecakes, true), MAIL] }; } },
      { id: 'tip', w: { tip: 3.5, tips: 3.5, tipping: 3.5, gratuity: 3.5, crew: 1.5, staff: 1 }, p: { 'leave a tip': 3, 'tip the team': 3 }, f: function () {
        return { html: 'Yes, thank you! Our online checkout offers a tip option, or you can use <b>Tip the Team</b> and enter any amount. 100% of tips go to our crew.',
          speak: 'Yes, thank you! Our online checkout offers a tip option, or you can use Tip the Team and enter any amount. 100 percent of tips go to our crew.', actions: [a('Tip the Team', B.tip || 'https://square.link/u/uTopOf42', true, true)] }; } },
      { id: 'mealprep', w: { meal: 1, prep: 2.5, mealprep: 3, weekly: 1.5, package: 1.5 }, p: { 'meal prep': 3 }, f: function () {
        return { html: '<b>Custom Meal Prep</b> starts at $13 a meal (5-meal minimum): Starter 5 meals $65, Weekly 10 meals $125, Family 15 meals $180. Build each meal from our Build Your Own menu, order and pay online by Friday 2pm, and pick up Monday 11am–3pm. Local Falmouth delivery coming soon.',
          speak: 'Custom meal prep starts at 13 dollars a meal, with a 5 meal minimum. Order by Friday at 2 PM and pick up Monday, 11 to 3.', actions: [a('Meal Prep', P.mealprep, true), CALL] }; } },
      { id: 'catering', w: { catering: 3, cater: 3, caterer: 3, office: 1.5, group: 1.5, private: 2, party: 2, host: 2, celebration: 2, gathering: 2 }, p: { 'private event': 3 }, f: function () {
        return { html: '<b>Catering &amp; private events:</b> host your gathering in our café Monday through Thursday, for up to 50 guests, starting at $25 per person. We also cater on-site for offices, parties and celebrations. Email <a href="mailto:' + B.email + '">' + esc(B.email) + '</a> or call <a href="' + B.tel + '">' + esc(B.phone) + '</a> with your date and guest count.',
          speak: 'We host private events in our café Monday through Thursday for up to 50 guests, starting at 25 dollars per person, and we cater on-site too.', actions: [a('Catering & Private Events', P.catering || 'catering.html', true), MAIL, CALL] }; } },
      { id: 'ramen', w: { ramen: 3.5, noodle: 2.5, noodles: 2.5, halloween: 2, '30': 1, '30th': 1.5 }, p: { 'ramen night': 3 }, f: function () {
        return { html: '<b>Ramen Night</b> is Saturday, November 7, 5–8 PM: one night only, a three-course ramen dinner (cucumber &amp; kimchi salad, Asian sesame chopped salad, and your choice of ramen) for $30 per person. Beverages not included. Limited seats. <a href="https://www.eventbrite.com/e/ramen-night-at-the-cafe-tickets-2003898709985" target="_blank" rel="noopener">Buy tickets on Eventbrite</a> or call <a href="' + B.tel + '">' + esc(B.phone) + '</a>.',
          speak: 'Ramen Night is Saturday, November 7, 5 to 8 PM. A three course ramen dinner with salad and your choice of ramen, 30 dollars per person. Tickets are on Eventbrite.', actions: [a('Ramen Night', P.ramen || 'ramen-night-nov-7.html', true), CALL] }; } },
      { id: 'charity', w: { charity: 3, fundraiser: 3, fundraising: 3, donate: 2.5, donation: 2.5, nonprofit: 2.5, volunteer: 2 }, f: function () {
        return { html: '<b>Charity events</b> are coming soon. To get involved, email <a href="mailto:' + B.email + '">' + esc(B.email) + '</a>.', speak: 'Charity events are coming soon. Email us to get involved.', actions: [a('Charity Events', P.charity, true), MAIL] }; } },
      { id: 'updates', w: { update: 3, updates: 3, latest: 2.5, news: 2.5, highlight: 3, highlights: 3, week: 2, weekly: 1.5 }, p: { 'special of the week': 4, 'what s new': 3, 'whats new': 3, 'featured business': 3 }, f: function () {
        return { html: 'Check our <b>Latest Updates</b> page (Weekly Highlights): the <b>Special of the Week</b>, <b>Local Visitors of the Week</b> and <b>Featured Business of the Week</b>, refreshed every Monday.',
          speak: 'Check our Latest Updates page for the special of the week, local visitors of the week, and the featured business of the week. It is refreshed every Monday.', actions: [a('Latest Updates', P.updates || 'weekly-highlights.html', true)] }; } },
      { id: 'affiliates', w: { affiliate: 3, affiliates: 3, partner: 3, partners: 3, partnership: 3, sponsor: 3, sponsors: 3, discount: 3, discounts: 3, coupon: 2.5, deal: 2, deals: 2, promo: 2, savings: 2, save: 1.5 }, f: function () {
        return { html: '<b>Affiliates are coming soon.</b> Buy at Cape Island Café and save at our affiliated and sponsor businesses. Partner discounts are coming soon. Interested in partnering? Email <a href="mailto:' + B.email + '">' + esc(B.email) + '</a>.',
          speak: 'Affiliates are coming soon. Buy at Cape Island Café and save at our affiliated and sponsor businesses. Partner discounts are coming soon.', actions: [a('Affiliates', P.affiliates || 'affiliates.html', true), MAIL] }; } },
      { id: 'reserve', w: { reservation: 3, reserve: 3, book: 1.5, booking: 2, table: 1.5 }, f: function () {
        return { html: 'Lunch is to go or stay. To ask about reservations or larger groups, call <a href="tel:+17742475263">774-2-ISLAND</a>. Jones’n Sunday Brunch: ' + esc(E.tickets) + '.', speak: 'Lunch is to go or stay. To ask about reservations, call 774-2-ISLAND. For the Sunday brunch, details will be announced.', actions: [CALL, a('View the brunch menu', E.page)] }; } },
      { id: 'pricerange', w: { expensive: 2, cheap: 2, affordable: 2 }, p: { 'how much': 1, 'price range': 3, 'prices': 1 }, f: function () {
        return { html: 'Lunch soups are $8.00, salads $11.00–$15.00, bowls $12.50–$16.50, wraps $14.00–$14.50, and the Build Your Own Lunch Plate is $14.50. Drinks are $3.50, and our refreshers are $5.00–$5.75.', speak: 'Soups are 8 dollars, salads 11 to 15, bowls 12 50 to 16 50, wraps around 14, and the build your own plate is 14 50.', actions: [a('See the full menu', P.menu, true)] }; } }
    ];

    function scoreIntent(intent, toks, qn) {
      var s = 0, seen = {};
      toks.forEach(function (t) {
        Object.keys(intent.w).forEach(function (k) { if (!seen[k] && wordMatch(t, k)) { s += intent.w[k]; seen[k] = 1; } });
      });
      if (intent.p) Object.keys(intent.p).forEach(function (ph) { if ((' ' + qn + ' ').indexOf(' ' + ph + ' ') >= 0) s += intent.p[ph]; });
      return s;
    }

    function findItems(qtoks) {
      var res = [];
      items.forEach(function (x) {
        var matched = 0, mk = 0;
        x.toks.forEach(function (t) { if (qtoks.some(function (q) { return wordMatch(q, t); })) { matched++; if (!GENERIC[t]) mk++; } });
        if (mk > 0) res.push({ x: x, matched: matched, mk: mk, full: matched === x.toks.length, frac: matched / x.toks.length });
      });
      res.sort(function (a, b) { return (b.full - a.full) || (b.matched - a.matched) || (b.frac - a.frac); });
      return res;
    }

    function answer(q) {
      var qn = norm(q).replace(/[$.]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!qn) return fallback();
      var qt = tokens(q);
      var allT = tokens(q, true);
      var best = null, bs = 0;
      INTENTS.forEach(function (it) { var s = scoreIntent(it, allT, qn); if (s > bs) { bs = s; best = it; } });
      var hits = findItems(qt);
      var full = hits.filter(function (h) { return h.full; });
      if (full.length) {
        var top = full[0];
        var supers = hits.filter(function (h) { return h !== top && !h.full && top.x.toks.every(function (t) { return h.x.toks.indexOf(t) >= 0; }); });
        var mentionsBrunch = /brunch|sunday|jones/.test(qn);
        if (/\bplain\b/.test(qn)) return itemAnswer(top.x.it);
        var pool = supers.length ? [top].concat(supers) : [top];
        if (mentionsBrunch) { var b = pool.filter(function (h) { return h.x.it.menu === 'brunch'; }); if (b.length) pool = b; }
        if (!(best && bs >= 3 && best.id !== 'brunch' && top.x.toks.length === 1 && ['hours', 'location', 'contact', 'order'].indexOf(best.id) >= 0)) {
          return pool.length > 1 ? itemsAnswer(pool.slice(0, 6).map(function (h) { return h.x.it; })) : itemAnswer(top.x.it);
        }
      }
      if (hits.length && hits[0].mk >= 2) {
        var sp = hits.filter(function (h) { return h.mk === hits[0].mk; });
        return sp.length === 1 ? itemAnswer(sp[0].x.it) : itemsAnswer(sp.slice(0, 6).map(function (h) { return h.x.it; }));
      }
      var m2 = hits.filter(function (h) { return h.matched >= 2 && h.frac >= 0.5; });
      if (m2.length === 1) return itemAnswer(m2[0].x.it);
      if (best && bs >= 1.5) { var r = best.f(qn); r.intent = best.id; return r; }
      if (hits.length) {
        var strong = hits.filter(function (h) { return h.mk === hits[0].mk; });
        return strong.length === 1 ? itemAnswer(strong[0].x.it) : itemsAnswer(strong.slice(0, 6).map(function (h) { return h.x.it; }));
      }
      if (best && bs >= 1) { var r2 = best.f(qn); r2.intent = best.id; return r2; }
      return fallback();
    }
    return { answer: answer };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { createBot: createBot, norm: norm, tokens: tokens }; return; }

  /* ---------------- UI ---------------- */
  var doc = root.document;
  var log = doc.getElementById('chat-log'), form = doc.getElementById('chat-form'), input = doc.getElementById('chat-input');
  var micBtn = doc.getElementById('mic'), spkBtn = doc.getElementById('speak-toggle'), note = doc.getElementById('voice-note');
  if (!log || !form) return;
  var bot = null, queue = [];
  var speakOn = false, userSetSpeak = false;

  function bubble(role, html, actions, img) {
    var d = doc.createElement('div'); d.className = 'msg ' + role;
    var inner = '';
    if (img) inner += '<img class="msg-img" src="' + img + '" alt="" width="400" height="400" loading="lazy">';
    inner += '<div class="msg-body">' + html + '</div>';
    if (actions && actions.length) inner += '<div class="msg-actions">' + actions.map(function (x) {
      return '<a class="btn ' + (x.primary ? 'btn-order' : 'btn-navy') + ' btn-sm" href="' + x.href + '"' + (x.ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(x.label) + (x.ext ? '<span class="sr-only"> (opens in a new tab)</span>' : '') + '</a>';
    }).join('') + '</div>';
    d.innerHTML = inner; log.appendChild(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  function userMsg(t) { var d = doc.createElement('div'); d.className = 'msg user'; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; }

  /* speech synthesis */
  var synth = root.speechSynthesis, voice = null;
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices() || [];
    var en = vs.filter(function (v) { return /^en[-_]US/i.test(v.lang); });
    var prefs = [/natural/i, /google us english/i, /samantha/i, /aria/i, /jenny/i, /ava/i, /allison/i, /zira/i];
    for (var i = 0; i < prefs.length && !voice; i++) voice = en.filter(function (v) { return prefs[i].test(v.name); })[0] || null;
    voice = voice || en[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }
  if (synth) { pickVoice(); if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = function () { voice = null; pickVoice(); }; }
  else if (spkBtn) spkBtn.hidden = true;
  function say(text) {
    if (!synth || !speakOn || !text) return;
    synth.cancel();
    var u = new root.SpeechSynthesisUtterance(text.replace(/\s+/g, ' '));
    if (voice) u.voice = voice; u.lang = (voice && voice.lang) || 'en-US'; u.rate = 1; u.pitch = 1;
    synth.speak(u);
  }
  function setSpeak(on) {
    speakOn = on; if (!spkBtn) return;
    spkBtn.setAttribute('aria-pressed', String(on)); spkBtn.classList.toggle('on', on);
    var l = spkBtn.querySelector('.lbl'); if (l) l.textContent = on ? 'Voice on' : 'Voice off';
    if (!on && synth) synth.cancel();
  }
  if (spkBtn) spkBtn.addEventListener('click', function () { userSetSpeak = true; setSpeak(!speakOn); });

  function ask(q) {
    q = (q || '').trim(); if (!q) return;
    userMsg(q);
    if (!bot) { queue.push(q); return; }
    var r = bot.answer(q);
    bubble('bot', r.html, r.actions, r.img);
    say(r.speak);
  }
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); });
  doc.querySelectorAll('.chip').forEach(function (c) { c.addEventListener('click', function () { ask(c.getAttribute('data-q')); }); });

  /* speech recognition */
  var SR = root.SpeechRecognition || root.webkitSpeechRecognition, rec = null, listening = false;
  if (!SR) { if (micBtn) micBtn.hidden = true; if (note) note.hidden = false; }
  else {
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onresult = function (e) {
      var t = '', fin = false;
      for (var i = e.resultIndex; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      input.value = t;
      if (fin) { input.value = ''; ask(t); }
    };
    rec.onend = function () { listening = false; micBtn.classList.remove('listening'); micBtn.setAttribute('aria-pressed', 'false'); input.placeholder = 'Ask a question, e.g. How much is the Salmon Bowl?'; };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { bubble('bot', 'I couldn’t use the microphone. Please allow microphone access, or type your question.'); }
    };
    micBtn.addEventListener('click', function () {
      if (listening) { rec.stop(); return; }
      if (!userSetSpeak) setSpeak(true);
      if (synth) synth.cancel();
      try { rec.start(); listening = true; micBtn.classList.add('listening'); micBtn.setAttribute('aria-pressed', 'true'); input.placeholder = 'Listening…'; } catch (err) { /* already started */ }
    });
  }

  bubble('bot', 'Hi! I’m the Cape Island Café helper. Ask me about our lunch menu, prices, hours, ordering, or the upcoming <b>Jones’n Sunday Brunch</b>. Tap a question below or type your own.');
  root.fetch('ask-kb.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (kb) {
    bot = createBot(kb);
    var params = new root.URLSearchParams(root.location.search); var pq = params.get('q');
    queue.splice(0).forEach(function (q) { var r = bot.answer(q); bubble('bot', r.html, r.actions, r.img); });
    if (pq) ask(pq);
  }).catch(function () { bubble('bot', 'Sorry, I couldn’t load our menu info. Please call <a href="tel:+17742475263">774-2-ISLAND</a> or email <a href="mailto:CapeIslandCafe@gmail.com">CapeIslandCafe@gmail.com</a>.'); });
})(typeof window !== 'undefined' ? window : this);
