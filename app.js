// إظهار الصفحات
function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}
showPage('sales');

// ------------------ IndexedDB ------------------ //
let db;
const request = indexedDB.open("StoreDB", 1);

request.onupgradeneeded = function(e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("products")) {
    db.createObjectStore("products", { keyPath: "code" });
  }
  if (!db.objectStoreNames.contains("sales")) {
    db.createObjectStore("sales", { autoIncrement: true });
  }
};

request.onsuccess = function(e) {
  db = e.target.result;
  renderTables();
};
request.onerror = e => console.error("DB error", e);

// إضافة منتج
function addProduct(){
  const tx = db.transaction("products","readwrite");
  const store = tx.objectStore("products");
  store.put({
    code: document.getElementById('prod-code').value || scannedCode || 'يدوي',
    name: document.getElementById('prod-name').value,
    cost: parseFloat(document.getElementById('prod-cost').value),
    price: parseFloat(document.getElementById('prod-price').value),
    qty: parseInt(document.getElementById('prod-qty').value)
  });
  tx.oncomplete = ()=> renderTables();
}

// إضافة عملية بيع
function addSale(){
  const code = scannedCode || document.getElementById('prod-code').value;
  const qty = parseInt(document.getElementById('sale-qty').value);
  const price = parseFloat(document.getElementById('sale-price').value);

  const tx = db.transaction(["products","sales"],"readwrite");
  const pStore = tx.objectStore("products");
  const sStore = tx.objectStore("sales");

  const req = pStore.get(code);
  req.onsuccess = ()=>{
    const prod = req.result;
    if(prod){
      prod.qty -= qty;
      pStore.put(prod);
      sStore.add({
        code,
        qty,
        price,
        cost: prod.cost,
        date: new Date().toLocaleString()
      });
    }
  };
  tx.oncomplete = ()=> renderTables();
}

// عرض الجداول و حساب صافي الربح
function renderTables(){
  // منتجات
  const pTx = db.transaction("products","readonly");
  const pStore = pTx.objectStore("products");
  const pReq = pStore.getAll();
  pReq.onsuccess = ()=>{
    const products = pReq.result;
    let pt = '<tr><th>باركود</th><th>اسم</th><th>تكلفة</th><th>بيع</th><th>كمية</th></tr>';
    let total=0;
    products.forEach(p=>{
      pt+=`<tr><td>${p.code}</td><td>${p.name}</td><td>${p.cost}</td><td>${p.price}</td><td>${p.qty}</td></tr>`;
      total += p.cost * p.qty;
    });
    document.getElementById('products-table').innerHTML=pt;
    document.getElementById('total-stock').textContent= total;

    // تفاصيل المخزون
    document.getElementById('stock-table').innerHTML = pt;

    // سجل المبيعات
    const sTx = db.transaction("sales","readonly");
    const sStore = sTx.objectStore("sales");
    const sReq = sStore.getAll();
    sReq.onsuccess = ()=>{
      const sales = sReq.result;
      let lt = '<tr><th>تاريخ</th><th>باركود</th><th>كمية</th><th>سعر البيع</th><th>سعر التكلفة</th><th>ربح</th></tr>';
      let profit=0;
      sales.forEach(s=>{
        let p = (s.price - s.cost) * s.qty;
        profit+=p;
        lt+=`<tr><td>${s.date}</td><td>${s.code}</td><td>${s.qty}</td><td>${s.price}</td><td>${s.cost}</td><td>${p}</td></tr>`;
      });
      document.getElementById('log-table').innerHTML=lt;
      document.getElementById('profit-total').textContent = profit;
    };
  };
}

// ماسح باركود
let scannedCode = null;
function startScanner(type){
  scannedCode=null;
  const codeReader = new ZXing.BrowserMultiFormatReader();
  const videoId = type==='sale' ? 'video-sale' : 'video-product';
  codeReader.decodeFromVideoDevice(null, videoId, (result,err)=>{
    if(result){
      scannedCode = result.text;
      if(type==='sale')
        document.getElementById('sale-result').textContent = 'تم قراءة: '+scannedCode;
      else
        document.getElementById('product-result').textContent = 'تم قراءة: '+scannedCode;
      codeReader.reset();
    }
  });
}
