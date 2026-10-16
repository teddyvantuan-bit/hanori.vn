/* Inline product choices and original-resolution gallery. No dependency on a UI library. */
(function () {
  'use strict';
  var main=document.getElementById('pdpMain');
  if(!main || !window.HANORI)return;
  var slug=location.pathname.split('/').filter(Boolean).pop();
  var product=window.HANORI.products.find(function(p){return p.id===slug;});
  if(!product)return;
  document.body.classList.add('has-pdp');
  var info=document.querySelector('.pdp-info'), gallery=document.querySelector('.pdp-gallery'), frame=document.querySelector('.pdp-main');
  var variants=product.variants || [{name:'',sku:product.sku || '',price:product.price,orig:product.orig}];
  var selected=product.variants ? null : 0, quantity=1, imageIndex=0;
  var thumbs=Array.from(document.querySelectorAll('.pdp-thumb'));
  var paths=thumbs.map(function(t){return t.dataset.src;});
  if(!paths.length)paths=[main.getAttribute('src')];
  var money=function(n){return n.toLocaleString('vi-VN')+'đ';};
  function element(tag,cls,text){var el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
  var minPrice=Math.min.apply(null,variants.map(function(v){return v.price || 0;}));
  var price=info.querySelector('.pdp-price');
  var description=info.querySelector('.pdp-desc');
  if(description && price)price.before(description);
  var specs=info.querySelector('.pdp-specs');if(specs)info.appendChild(specs);
  var cta=info.querySelector('.pdp-cta');
  var choices=info.querySelector('.pdp-variants');
  var delivery=element('p','pdp-delivery','Miễn phí vận chuyển từ 200.000đ · Đổi trả 7 ngày nếu lỗi NSX.');
  if(price)price.after(delivery);
  var message=element('p','pdp-selection-message');message.setAttribute('aria-live','polite');message.setAttribute('role','status');
  var choiceButtons=[];
  if(product.variants && choices){
    choices.replaceChildren();choices.id='product-choices';
    choices.appendChild(element('span','pdp-choice-label','Chọn phân loại'));
    var grid=element('div','pdp-choice-grid');grid.setAttribute('role','group');grid.setAttribute('aria-label','Phân loại sản phẩm');
    variants.forEach(function(v,i){
      var button=element('button','pdp-choice',v.name);button.type='button';button.setAttribute('aria-pressed','false');
      button.appendChild(element('small','',money(v.price)));
      button.addEventListener('click',function(){selected=i;renderSelection();if(v.vimg)showImage(v.vimg-1,false);});
      choiceButtons.push(button);grid.appendChild(button);
    });
    choices.append(grid,message);
  }
  var qty=element('div','pdp-qty-row');qty.appendChild(element('span','','Số lượng'));
  var step=element('div','qty-step');
  var minus=element('button','','−'), plus=element('button','','+'), output=element('output','',String(quantity));
  minus.type=plus.type='button';minus.setAttribute('aria-label','Giảm số lượng');plus.setAttribute('aria-label','Tăng số lượng');output.setAttribute('aria-live','polite');output.setAttribute('aria-label','Số lượng');
  step.append(minus,output,plus);qty.appendChild(step);cta.before(qty);
  minus.addEventListener('click',function(){quantity=Math.max(1,quantity-1);renderSelection();});
  plus.addEventListener('click',function(){quantity=Math.min(20,quantity+1);renderSelection();});
  var add=element('button','btn btn-outline','Thêm vào giỏ'), buy=element('button','btn btn-primary','Mua ngay');add.type=buy.type='button';
  var shopee=cta.querySelector('a.btn-shopee');
  cta.replaceChildren(add,buy);if(shopee)cta.appendChild(shopee);
  var help=element('a','text-link','Cần tư vấn? Chat Zalo với Hanori ↗');help.href=window.HANORI.config.zalo;help.target='_blank';help.rel='noopener';cta.after(help);
  function purchase(buyNow){
    if(product.contactOnly){window.open(window.HANORI.config.zalo,'_blank','noopener');return;}
    if(selected===null){message.textContent='Bạn chọn dung tích hoặc màu trước nhé.';message.classList.add('error');choices.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});choiceButtons[0].focus({preventScroll:true});return;}
    document.dispatchEvent(new CustomEvent('hanori:add',{detail:{id:product.id,v:selected,qty:quantity,buy:buyNow}}));
  }
  add.addEventListener('click',function(){purchase(false);});buy.addEventListener('click',function(){purchase(true);});
  var sticky=element('div','pdp-sticky-buy');
  var stickyPrice=element('div'), priceHint=element('small','','Giá sản phẩm'), priceValue=element('strong');stickyPrice.append(priceHint,priceValue);
  var stickyButton=element('button','btn btn-primary','Chọn phân loại');stickyButton.type='button';stickyButton.addEventListener('click',function(){purchase(true);});sticky.append(stickyPrice,stickyButton);document.body.appendChild(sticky);
  function renderSelection(){
    var current=selected===null?null:variants[selected];
    if(price){
      price.replaceChildren();if(!current)price.appendChild(element('span','pp-from','Từ'));
      price.appendChild(element('span','pp-now',money(current?current.price:minPrice)));
      if(current && current.orig>current.price)price.appendChild(element('span','pp-old',money(current.orig)));
    }
    priceValue.textContent=(current?'':'Từ ')+money((current?current.price:minPrice)*quantity);
    priceHint.textContent=quantity>1?'Tạm tính · '+quantity+' sản phẩm':'Giá sản phẩm';
    stickyButton.textContent=selected===null?'Chọn phân loại':'Mua ngay';
    choiceButtons.forEach(function(button,i){button.setAttribute('aria-pressed',String(i===selected));});
    if(current){message.classList.remove('error');message.textContent='Đã chọn: '+current.name;}
    output.value=String(quantity);output.textContent=String(quantity);minus.disabled=quantity===1;plus.disabled=quantity===20;
    if(specs && current){var sku=Array.from(specs.querySelectorAll('li')).find(function(li){return li.textContent.includes('Mã sản phẩm');});if(sku)sku.querySelector('strong').textContent=current.sku;}
  }
  renderSelection();
  // Selecting variants also selects the corresponding real photo.
  var imageButton=element('button','pdp-image-button');imageButton.type='button';imageButton.setAttribute('aria-label','Phóng to ảnh sản phẩm');
  main.replaceWith(imageButton);imageButton.appendChild(main);
  var counter=element('span','gallery-counter');counter.setAttribute('aria-live','polite');frame.appendChild(counter);
  var previous=element('button','gallery-arrow prev','‹'), next=element('button','gallery-arrow next','›');previous.type=next.type='button';previous.setAttribute('aria-label','Ảnh sản phẩm trước');next.setAttribute('aria-label','Ảnh sản phẩm tiếp theo');
  if(paths.length>1)frame.append(previous,next);
  function showImage(index,scrollThumb){
    imageIndex=(index+paths.length)%paths.length;
    main.src=paths[imageIndex];main.alt=product.name+' — ảnh '+(imageIndex+1)+'/'+paths.length;
    counter.textContent=(imageIndex+1)+' / '+paths.length;
    thumbs.forEach(function(t,i){t.classList.toggle('active',i===imageIndex);t.setAttribute('aria-pressed',String(i===imageIndex));});
    if(scrollThumb && thumbs[imageIndex]){
      var strip=thumbs[imageIndex].parentElement;
      strip.scrollTo({left:thumbs[imageIndex].offsetLeft-strip.offsetLeft-strip.clientWidth/2+30,behavior:'auto'});
    }
  }
  thumbs.forEach(function(t,i){t.setAttribute('aria-label','Xem ảnh '+(i+1)+' của '+paths.length);t.addEventListener('click',function(){showImage(i,false);});});
  previous.addEventListener('click',function(){showImage(imageIndex-1,true);});next.addEventListener('click',function(){showImage(imageIndex+1,true);});
  var touchStart, lastSwipe=0;
  frame.addEventListener('touchstart',function(e){if(e.touches.length===1)touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};else touchStart=null;},{passive:true});
  frame.addEventListener('touchend',function(e){if(!touchStart)return;var dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>55 && Math.abs(dx)>Math.abs(dy)*1.5){showImage(imageIndex+(dx<0?1:-1),true);lastSwipe=Date.now();}touchStart=null;},{passive:true});
  showImage(0,false);
  var dialog=element('dialog','media-dialog');dialog.setAttribute('aria-label','Ảnh sản phẩm phóng to');
  var dialogHead=element('div','media-dialog-head'), dialogTitle=element('span','',product.name), zoom=element('button','','Phóng lớn'), close=element('button','','Đóng ×');zoom.type=close.type='button';
  dialogHead.append(dialogTitle,zoom,close);
  var stage=element('div','media-dialog-stage'), fullImage=element('img');fullImage.alt=product.name;stage.appendChild(fullImage);dialog.append(dialogHead,stage);document.body.appendChild(dialog);
  var priorOverflow='';
  imageButton.addEventListener('click',function(){if(Date.now()-lastSwipe<400)return;fullImage.src=paths[imageIndex];stage.classList.remove('zoomed');zoom.textContent='Phóng lớn';zoom.setAttribute('aria-pressed','false');priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();});
  function toggleZoom(){var enlarged=stage.classList.toggle('zoomed');zoom.textContent=enlarged?'Thu nhỏ':'Phóng lớn';zoom.setAttribute('aria-pressed',String(enlarged));}
  fullImage.addEventListener('click',toggleZoom);zoom.addEventListener('click',toggleZoom);close.addEventListener('click',function(){dialog.close();});
  dialog.addEventListener('close',function(){document.body.style.overflow=priorOverflow;imageButton.focus({preventScroll:true});});
})();
