const fs = require('fs');

const BASE = 'https://storage.googleapis.com/quickbasket-products';

// ── CATEGORIES ────────────────────────────────────────────
const CATEGORIES = [
  { slug:'groceries',   name:'Groceries',     emoji:'🛒', imageUrl:`${BASE}/Aashirvaad Atta.webp`, color:'#2a7d4f', bg:'#eaf7f0', sub:'Wheat, Rice, Oil…',   sortOrder:1,  featured:true  },
  { slug:'vegetables',  name:'Vegetables',    emoji:'🥦', imageUrl:'',                              color:'#1a9e5f', bg:'#f0faf4', sub:'Leafy, Root & More',  sortOrder:2,  featured:true  },
  { slug:'fruits',      name:'Fruits',        emoji:'🍎', imageUrl:'',                              color:'#e07b00', bg:'#fff5e6', sub:'Daily & Seasonal',    sortOrder:3,  featured:true  },
  { slug:'dairy',       name:'Dairy & Eggs',  emoji:'🥛', imageUrl:'',                              color:'#c89000', bg:'#fff8e1', sub:'Milk, Curd, Cheese',  sortOrder:4,  featured:true  },
  { slug:'grains',      name:'Rice & Grains', emoji:'🌾', imageUrl:`${BASE}/Basmati Rice.webp`,     color:'#b06020', bg:'#faf0e6', sub:'Basmati, Millets',    sortOrder:5,  featured:false },
  { slug:'spices',      name:'Spices',        emoji:'🌶️',imageUrl:'',                              color:'#d94040', bg:'#fef0f0', sub:'Masalas & Blends',    sortOrder:6,  featured:false },
  { slug:'oils',        name:'Oils & Ghee',   emoji:'🫙', imageUrl:`${BASE}/Fortune Soyabean Oil.webp`, color:'#4060d9', bg:'#f0f4ff', sub:'Cooking & Refined', sortOrder:7, featured:false },
  { slug:'beauty',      name:'Beauty',        emoji:'💄', imageUrl:'',                              color:'#d946a8', bg:'#fdf0f9', sub:'Skin, Hair & Care',   sortOrder:8,  featured:true  },
  { slug:'electronics', name:'Electronics',   emoji:'📱', imageUrl:'',                              color:'#1a6fd4', bg:'#eef4ff', sub:'Phones, Gadgets…',    sortOrder:9,  featured:true  },
  { slug:'legal',       name:'Legal',         emoji:'⚖️', imageUrl:'',                              color:'#7040c8', bg:'#f5f0ff', sub:'Docs & Services',     sortOrder:10, featured:false },
  { slug:'medical',     name:'Medical',       emoji:'💊', imageUrl:'',                              color:'#c83060', bg:'#fff0f5', sub:'Medicines & Care',    sortOrder:11, featured:true  },
  { slug:'social',      name:'Social',        emoji:'🤝', imageUrl:'',                              color:'#0080c8', bg:'#e8f8ff', sub:'Community & Help',    sortOrder:12, featured:false },
  { slug:'more',        name:'More',          emoji:'➕', imageUrl:'',                              color:'#606060', bg:'#f5f5f5', sub:'Explore All',          sortOrder:13, featured:false },
];

// ── SUBCATEGORIES ─────────────────────────────────────────
// [categorySlug, slug, name, emoji, imageUrl, sortOrder]
const SUBCATEGORIES = [
  // Groceries
  ['groceries','atta',      'Atta & Flour',      '🌾', `${BASE}/Aashirvaad Atta.webp`,     1],
  ['groceries','rice',      'Rice Varieties',    '🍚', `${BASE}/Basmati Rice.webp`,         2],
  ['groceries','oil',       'Cooking Oils',      '🫙', `${BASE}/Fortune Soyabean Oil.webp`, 3],
  ['groceries','sugar',     'Sugar & Salt',      '🧂', `${BASE}/Tata Salt.webp`,            4],
  ['groceries','pulses',    'Dal & Pulses',      '🫘', `${BASE}/Toor Dal.webp`,             5],
  ['groceries','biscuits',  'Biscuits & Snacks', '🍪', `${BASE}/parle-G.webp`,              6],
  ['groceries','noodles',   'Noodles & Pasta',   '🍝', `${BASE}/Maggi 2-Minute Noodles.webp`,7],
  ['groceries','breakfast', 'Breakfast & Cereal','🥣', `${BASE}/Kelloggs Corn Flakes.webp`, 8],
  // Vegetables
  ['vegetables','leafy',     'Leafy Greens',      '🥬', '', 1],
  ['vegetables','root',      'Root Veggies',      '🥔', '', 2],
  ['vegetables','gourds',    'Gourds & Squash',   '🎃', '', 3],
  ['vegetables','onion',     'Onion & Garlic',    '🧅', '', 4],
  ['vegetables','tomato',    'Tomatoes',          '🍅', '', 5],
  ['vegetables','capsicum',  'Capsicum & Chilli', '🫑', '', 6],
  ['vegetables','herbs',     'Herbs & Sprouts',   '🌿', '', 7],
  ['vegetables','frozen_veg','Frozen Vegetables', '🧊', '', 8],
  // Fruits
  ['fruits','daily',   'Daily Fruits',      '🍎', '', 1],
  ['fruits','seasonal','Seasonal Picks',    '🥭', '', 2],
  ['fruits','citrus',  'Citrus Fruits',     '🍊', '', 3],
  ['fruits','grapes',  'Grapes & Berries',  '🍇', '', 4],
  ['fruits','tropical','Tropical & Exotic', '🥝', '', 5],
  ['fruits','melons',  'Melons',            '🍉', '', 6],
  ['fruits','dried',   'Dry Fruits & Nuts', '🌰', '', 7],
  // Dairy
  ['dairy','milk',   'Milk & Cream',      '🥛', '', 1],
  ['dairy','curd',   'Curd & Buttermilk', '🫙', '', 2],
  ['dairy','cheese', 'Cheese & Paneer',   '🧀', '', 3],
  ['dairy','butter', 'Butter & Ghee',     '🧈', '', 4],
  ['dairy','eggs',   'Eggs',              '🥚', '', 5],
  ['dairy','bread',  'Bread & Bakery',    '🍞', '', 6],
  // Grains
  ['grains','rice2',  'Rice Varieties', '🍚', `${BASE}/Basmati Rice.webp`, 1],
  ['grains','wheat',  'Wheat & Flour',  '🌾', `${BASE}/Aashirvaad Atta.webp`, 2],
  ['grains','millets','Millets & Ragi', '🫘', '', 3],
  ['grains','lentils','Lentils & Dal',  '🟡', `${BASE}/Toor Dal.webp`, 4],
  ['grains','pasta',  'Pasta & Noodles','🍝', `${BASE}/Sunfeast Pasta.webp`, 5],
  // Spices
  ['spices','whole', 'Whole Spices',    '🌶️', '', 1],
  ['spices','ground','Ground Spices',   '🫙',  '', 2],
  ['spices','masala','Masala Blends',   '🍛',  '', 3],
  ['spices','salt',  'Salt & Sugar',    '🧂',  `${BASE}/Tata Salt.webp`, 4],
  ['spices','cond',  'Sauces & Pickles','🥫',  '', 5],
  // Oils
  ['oils','cooking','Cooking Oils',     '🛢️', `${BASE}/Fortune Soyabean Oil.webp`, 1],
  ['oils','ghee',   'Pure Ghee',        '🧈',  '', 2],
  ['oils','olive',  'Olive & Specialty','🫒',  '', 3],
  ['oils','van',    'Vanaspati',        '🫙',  '', 4],
  // Beauty
  ['beauty','skincare', 'Skin Care',       '✨', '', 1],
  ['beauty','haircare', 'Hair Care',       '💆', '', 2],
  ['beauty','makeup',   'Makeup',          '💄', '', 3],
  ['beauty','fragrance','Fragrances',      '🌸', '', 4],
  ['beauty','mencare',  "Men's Grooming",  '🪒', '', 5],
  ['beauty','bodycare', 'Body Care',       '🧴', '', 6],
  ['beauty','sunscreen','Sunscreen & SPF', '☀️', '', 7],
  ['beauty','tools',    'Beauty Tools',    '💅', '', 8],
  // Electronics
  ['electronics','phones',   'Mobile Phones',      '📱', '', 1],
  ['electronics','earbuds',  'Earbuds & Audio',    '🎧', '', 2],
  ['electronics','chargers', 'Chargers & Cables',  '🔌', '', 3],
  ['electronics','watch',    'Smartwatches',       '⌚', '', 4],
  ['electronics','laptop',   'Laptop Accessories', '💻', '', 5],
  ['electronics','camera',   'Cameras',            '📸', '', 6],
  ['electronics','gaming',   'Gaming',             '🎮', '', 7],
  ['electronics','smarthome','Smart Home',         '🏠', '', 8],
  // Legal
  ['legal','docs',   'Document Services', '📄',   '', 1],
  ['legal','reg',    'Registration',      '📝',   '', 2],
  ['legal','consult','Legal Consulting',  '👨‍⚖️', '', 3],
  ['legal','notary', 'Notary Services',   '🖊️',  '', 4],
  // Medical
  ['medical','otc',    'OTC Medicines',          '💊', '', 1],
  ['medical','supps',  'Vitamins & Supplements', '💪', '', 2],
  ['medical','devices','Health Devices',          '🩻', '', 3],
  ['medical','care',   'Personal Care',           '🧴', '', 4],
  // Social
  ['social','events','Events & Gatherings','🎉',  '', 1],
  ['social','donate','Donations & NGO',    '❤️',  '', 2],
  ['social','vol',   'Volunteer Work',     '🙋',  '', 3],
  ['social','comm',  'Community Help',     '🏘️', '', 4],
  // More
  ['more','cleaning','Cleaning Supplies','🧹', '', 1],
  ['more','baby',    'Baby Products',    '👶', '', 2],
  ['more','pet',     'Pet Care',         '🐾', '', 3],
  ['more','stat',    'Stationery',       '📚', '', 4],
];

// ── GROCERIES PRODUCTS ────────────────────────────────────
// [name, unit, price, oldPrice, emoji, imageUrl, badge, categorySlug, subcategorySlug, stock, featured]
const PRODUCTS = [
  ['Aashirvaad Atta',       '5 kg',      249, 290, '🌾', `${BASE}/Aashirvaad Atta.webp`,        'BEST SELLER', 'groceries', 'atta',      500, true ],
  ['Pillsbury Atta',        '1 kg',       58,  65, '🌾', `${BASE}/Pillsbury Atta.webp`,         null,          'groceries', 'atta',      300, false],
  ['Fortune Soyabean Oil',  '1 L',       139, 160, '🫙', `${BASE}/Fortune Soyabean Oil.webp`,   null,          'groceries', 'oil',       400, true ],
  ['Sundrop Sunflower Oil', '1 L',       125, 140, '🌻', `${BASE}/Sundrop Sunflower Oil.webp`,  null,          'groceries', 'oil',       300, false],
  ['Tata Salt',             '1 kg',       22, null, '🧂', `${BASE}/Tata Salt.webp`,              null,          'groceries', 'sugar',     999, false],
  ['Sugar (Refined)',       '1 kg',       45, null, '🍬', `${BASE}/Sugar (Refined).webp`,        null,          'groceries', 'sugar',     999, false],
  ['Basmati Rice',          '5 kg',      399, 450, '🍚', `${BASE}/Basmati Rice.webp`,           '20% OFF',     'groceries', 'rice',      200, true ],
  ['Sona Masoori Rice',     '5 kg',      320, null, '🍚', `${BASE}/Sona Masoori Rice.webp`,      null,          'groceries', 'rice',      150, false],
  ['Toor Dal',              '1 kg',      120, null, '🫘', `${BASE}/Toor Dal.webp`,               null,          'groceries', 'pulses',    500, true ],
  ['Chana Dal',             '1 kg',       95, null, '🫘', `${BASE}/Chana Dal.webp`,              null,          'groceries', 'pulses',    400, false],
  ['Moong Dal (Split)',     '500g',       70, null, '🫘', `${BASE}/Moong Dal (Split).webp`,      null,          'groceries', 'pulses',    300, false],
  ['Parle-G',               '800g',       50, null, '🍪', `${BASE}/parle-G.webp`,               'POPULAR',     'groceries', 'biscuits',  999, true ],
  ['Britannia Biscuits',    '200g',       30, null, '🍪', `${BASE}/Britannia Biscuits.webp`,     null,          'groceries', 'biscuits',  800, false],
  ['Maggi 2-Minute Noodles','420g (6pk)', 78, null, '🍝', `${BASE}/Maggi 2-Minute Noodles.webp`, null,          'groceries', 'noodles',   600, true ],
  ['Sunfeast Pasta',        '500g',       65, null, '🍝', `${BASE}/Sunfeast Pasta.webp`,         null,          'groceries', 'noodles',   400, false],
  ['Kelloggs Corn Flakes',  '875g',      299, 350, '🥣', `${BASE}/Kelloggs Corn Flakes.webp`,   null,          'groceries', 'breakfast', 200, true ],
  ['Quaker Oats',           '1 kg',      199, 240, '🥣', `${BASE}/Quaker Oats.webp`,            '17% OFF',     'groceries', 'breakfast', 300, false],
  ['Poha (Thick)',          '500g',       32, null, '🌾', `${BASE}/Poha (Thick).webp`,           'FRESH',       'groceries', 'breakfast', 500, false],
];

// ── HELPERS ───────────────────────────────────────────────
const safe = (v) => {
  if (v === null || v === undefined || v === '') return '';
  const s = String(v);
  return (s.includes(',') || s.includes('"') || s.includes("'") || s.includes('\n'))
    ? `"${s.replace(/"/g, '""')}"` : s;
};

// ── GENERATE CATEGORIES CSV ───────────────────────────────
const catHeader = 'slug,name,emoji,imageUrl,color,bg,sub,sortOrder,featured,active';
const catRows   = CATEGORIES.map(c =>
  [safe(c.slug), safe(c.name), safe(c.emoji), safe(c.imageUrl),
   c.color, c.bg, safe(c.sub), c.sortOrder, c.featured, true].join(',')
);
fs.writeFileSync('./all-categories.csv', [catHeader, ...catRows].join('\n'), 'utf8');
console.log(`✅ all-categories.csv — ${CATEGORIES.length} rows`);

// ── GENERATE SUBCATEGORIES CSV ────────────────────────────
const subHeader = 'slug,name,emoji,imageUrl,categorySlug,sortOrder,featured,active';
const subRows   = SUBCATEGORIES.map(([catSlug, slug, name, emoji, imageUrl, sortOrder]) =>
  [safe(slug), safe(name), safe(emoji), safe(imageUrl), catSlug, sortOrder, false, true].join(',')
);
fs.writeFileSync('./all-subcategories.csv', [subHeader, ...subRows].join('\n'), 'utf8');
console.log(`✅ all-subcategories.csv — ${SUBCATEGORIES.length} rows`);

// ── GENERATE GROCERIES PRODUCTS CSV ──────────────────────
const prodHeader = 'name,unit,price,oldPrice,emoji,imageUrl,badge,categorySlug,subcategorySlug,stock,featured,active';
const prodRows   = PRODUCTS.map(([name, unit, price, oldPrice, emoji, imageUrl, badge, catSlug, subSlug, stock, featured]) =>
  [safe(name), safe(unit), price, oldPrice || '', safe(emoji), safe(imageUrl),
   safe(badge), catSlug, subSlug, stock, featured, true].join(',')
);
fs.writeFileSync('./groceries-products.csv', [prodHeader, ...prodRows].join('\n'), 'utf8');
console.log(`✅ groceries-products.csv — ${PRODUCTS.length} rows`);

console.log('\n📤 Upload order:');
console.log('1. all-categories.csv      → Admin → CSV Upload → Upload Categories');
console.log('2. all-subcategories.csv   → Admin → CSV Upload → Upload Subcategories');
console.log('3. groceries-products.csv  → Admin → CSV Upload → Upload Products');