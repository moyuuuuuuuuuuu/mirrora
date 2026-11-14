/* Optional browser acceptance: MIRRORA_PLAYWRIGHT points to an installed Playwright module.
   Run against pnpm dev:h5; requests are mocked, no email or paid AI call is made. */
const { chromium } = require(process.env.MIRRORA_PLAYWRIGHT || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.MIRRORA_CHROME || undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await context.newPage(), errors=[], creates=[];let reads=0;
 const personBase={id:'browser-base',original_url:'https://assets.test/raw.webp',base_url:'https://assets.test/base.webp',display_url:'https://assets.test/person.webp',mask_url:'https://assets.test/mask.webp',confirmed:false,rotation:0,perspective:0,auto_correct:true,created_at:new Date().toISOString(),preparation:'cutout'};
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const u=new URL(route.request().url()),method=route.request().method();let data={};
  if(u.pathname.endsWith('/auth/email/code'))data={sent:true};
  else if(u.pathname.endsWith('/auth/email/login'))data={token:'browser-test-token',email:'test@example.com',nickname:'测试用户',avatar:''};
  else if(u.pathname.endsWith('/profile/password'))data={updated:true};
  else if(u.pathname.endsWith('/profile'))data={email:'test@example.com',nickname:method==='PUT'?route.request().postDataJSON().nickname:'测试用户',avatar:'',has_password:true};
  else if(u.pathname.endsWith('/assets'))return route.fulfill({status:201,json:{url:personBase.display_url,person_base:personBase}});
  else if(u.pathname.endsWith('/prepare'))return route.fulfill({status:201,json:{url:personBase.display_url,person_base:personBase}});
  else if(u.pathname.includes('/person-bases/'))data={...personBase,confirmed:true};
  else if(u.pathname.endsWith('/consultations') && method==='POST'){creates.push(route.request().postDataJSON());data={id:'browser-record',status:'queued',module:creates.at(-1).module};}
  else if(u.pathname.endsWith('/consultations/browser-record')){reads++;data={studio:creates.at(-1).studio,id:'browser-record',module:creates.at(-1).module,status:reads===1?'running':'succeeded',photo_url:'https://assets.test/person.webp',result_image_url:'https://assets.test/result.webp',analysis:'### 造型建议\n保留自然层次。',preferences:'保留长度',created_at:new Date().toISOString()};}
  else if(u.pathname.endsWith('/consultations'))data={items:[],total:0,page:1,page_size:8,completed_modules:[]};
  else throw new Error('Unexpected API route '+u.pathname);
  await route.fulfill({json:data});
 });
 await page.route('https://assets.test/**',r=>r.fulfill({contentType:'image/webp',body:fs.readFileSync('src/static/studio/person.webp')}));
 const base=process.env.MIRRORA_URL || 'http://127.0.0.1:5173';
 fs.mkdirSync('outputs',{recursive:true});
 await page.goto(base);await page.getByText('先用示例体验',{exact:true}).click();
 await page.locator('.studio-toast').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'选择燕麦周末',exact:true}).click();
 await page.getByRole('button',{name:'预览方案',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.look-meta')?.textContent.includes('燕麦周末'));
 await page.getByRole('button',{name:'原图对比',exact:true}).click();assert.equal(await page.locator('.compare-divider').count(),1);
 await page.getByRole('button',{name:'返回编辑',exact:true}).click();
 await page.getByRole('button',{name:'保存搭配',exact:true}).click();await page.locator('.overlay-panel input').fill('周末测试');await page.locator('.overlay-panel').getByRole('button',{name:'保存搭配',exact:true}).click();
 await page.getByRole('button',{name:'我的搭配',exact:true}).click();assert.equal(await page.getByText('周末测试',{exact:true}).count(),1);await page.getByRole('button',{name:'继续编辑',exact:true}).click();
 await page.getByRole('tab',{name:'发型',exact:true}).click();await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.person-image')).transform).a>1.4);
 await page.getByRole('tab',{name:'妆容',exact:true}).click();await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('.person-image')).transform).a>2.3);
 await page.getByRole('tab',{name:'配饰',exact:true}).click();await page.getByRole('button',{name:'选择极简金圈',exact:true}).click();await page.getByRole('button',{name:'选择细链吊坠',exact:true}).click();assert.equal(await page.locator('.material-card.selected').count(),2);
 await page.getByRole('button',{name:'造型建议',exact:true}).click();await page.getByRole('button',{name:'演示一次生成失败',exact:true}).click();await page.getByRole('button',{name:'预览方案',exact:true}).click();await page.locator('.failure-notice').waitFor();await page.getByRole('button',{name:'重试',exact:true}).click();await page.locator('.failure-notice').waitFor({state:'hidden'});await page.waitForTimeout(1800);
 await page.getByRole('tab',{name:'试衣',exact:true}).click();await page.locator('.studio-toast').waitFor({state:'hidden'});await page.screenshot({path:'outputs/studio-desktop.png'});
 await page.getByRole('button',{name:'历史版本',exact:true}).click();await page.screenshot({path:'outputs/studio-history.png'});await page.keyboard.press('Escape');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/studio-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'账户设置',exact:true}).click();await page.getByRole('textbox',{name:'邮箱',exact:true}).fill('preserved@example.com');await page.getByRole('button',{name:'隐私政策',exact:true}).click();await page.getByRole('button',{name:'关闭面板',exact:true}).click();assert.equal(await page.getByText('登录镜界',{exact:true}).count(),1);assert.equal(await page.getByRole('textbox',{name:'邮箱',exact:true}).inputValue(),'preserved@example.com');
 await page.getByRole('textbox',{name:'邮箱',exact:true}).fill('test@example.com');await page.getByRole('button',{name:'获取验证码',exact:true}).click();await page.locator('.form-field').filter({hasText:'验证码'}).locator('input').fill('123456');await page.getByRole('button',{name:'同意用户协议和隐私政策',exact:true}).click();await page.getByRole('button',{name:'登录并继续',exact:true}).click();await page.locator('.overlay').waitFor({state:'hidden'});
 await page.setViewportSize({width:1440,height:900});await page.getByRole('button',{name:'更换本人照片',exact:true}).click();await page.getByRole('button',{name:'确认照片授权与成年声明',exact:true}).click();
 const chooserPromise=page.waitForEvent('filechooser');await page.getByRole('button',{name:'选择本人照片',exact:true}).click();const chooser=await chooserPromise;await chooser.setFiles(path.resolve('src/static/studio/person.webp'));await page.getByRole('dialog',{name:'确认人物底图',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'确认并进入工作台',exact:true}).isDisabled(),true);await page.locator('.studio-toast').waitFor({state:'hidden'});await page.screenshot({path:'outputs/studio-base-confirm.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'outputs/studio-base-confirm-mobile.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:1440,height:900});await page.getByRole('checkbox',{name:'确认底图中的脸部与体型'}).click();await page.getByRole('button',{name:'确认并进入工作台',exact:true}).click();await page.locator('.overlay').waitFor({state:'hidden'});
 await page.getByRole('button',{name:'拍摄校正',exact:true}).click();await page.getByRole('dialog',{name:'拍摄校正',exact:true}).waitFor();await page.getByRole('button',{name:'取消校正',exact:true}).click();assert.equal(await page.getByRole('button',{name:'应用形象',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'预览校正',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.overlay-panel .primary-button')?.getAttribute('aria-disabled')==='false');await page.locator('.studio-toast').waitFor({state:'hidden'});await page.screenshot({path:'outputs/studio-photo-correction.png'});await page.getByRole('button',{name:'应用形象',exact:true}).click();await page.getByRole('checkbox',{name:'确认底图中的脸部与体型'}).click();await page.getByRole('button',{name:'确认并进入工作台',exact:true}).click();await page.locator('.overlay').waitFor({state:'hidden'});
 await page.getByRole('tab',{name:'发型',exact:true}).click();await page.getByRole('textbox',{name:'微调描述',exact:true}).fill('保留长度');await page.getByRole('button',{name:'生成效果',exact:true}).click();await page.locator('.generation-status').waitFor();await page.locator('.generation-status').waitFor({state:'hidden',timeout:15000});assert.equal(creates.length,1);assert.equal(creates[0].module,'hair');assert.match(creates[0].preferences,/保留长度/);assert.equal(creates[0].adult_confirmed,true);assert.ok(page.url().endsWith('/#/') || !page.url().includes('analyzing'));
 await page.getByRole('tab',{name:'试衣',exact:true}).click();
 const garmentPicker=page.waitForEvent('filechooser');await page.getByRole('button',{name:'上传服装',exact:true}).click();await (await garmentPicker).setFiles(path.resolve('src/static/studio/person-weekend.webp'));
 await page.waitForFunction(()=>document.querySelectorAll('.material-card').length===1);
 const cardWidth=await page.locator('.material-card').evaluate(el=>el.getBoundingClientRect().width);assert.ok(cardWidth<240,'single uploaded card must not stretch');
 await page.locator('.studio-toast').waitFor({state:'hidden'});await page.screenshot({path:'outputs/studio-single-upload-fixed.png'});
 await page.getByRole('button',{name:'全部',exact:true}).click();await page.getByRole('button',{name:'选择松弛通勤',exact:true}).click();await page.getByRole('button',{name:'生成效果',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.generation-status'));
 await page.locator('.generation-status').waitFor({state:'hidden',timeout:15000});assert.equal(creates.at(-1).module,'outfit');assert.equal(creates.at(-1).garment_url,undefined);assert.equal(creates.at(-1).studio.look.slots.hair.refinements[0],'保留长度');await page.getByRole('button',{name:'当前搭配 · 完整造型',exact:true}).click();await page.getByRole('dialog',{name:'完整造型',exact:true}).waitFor();await page.locator('.studio-toast').waitFor({state:'hidden'});await page.waitForTimeout(400);await page.screenshot({path:'outputs/studio-complete-look.png'});await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'账户设置',exact:true}).click();await page.getByRole('textbox',{name:'昵称',exact:true}).fill('新的昵称');await page.getByRole('button',{name:'保存资料',exact:true}).click();await page.locator('.overlay').waitFor({state:'hidden'});await page.getByRole('button',{name:'账户设置',exact:true}).click();await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.getByText('创建我的形象',{exact:true}).waitFor();assert.equal(await page.locator('.person-image').count(),0);
 await page.goto(base+'/pages/profile/index');await page.getByRole('dialog',{name:'账户设置'}).waitFor();assert.ok(!page.url().includes('pages/profile/index'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,apiCreates:creates.length,screenshots:['studio-desktop.png','studio-mobile.png','studio-history.png'],errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
