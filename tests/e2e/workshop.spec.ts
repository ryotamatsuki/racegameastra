import {test,expect} from '@playwright/test';
test('garage customization, persistence, all courses, cameras and retry',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('./');await expect(page.getByRole('button',{name:'ワークショップを開く'})).toBeEnabled();await page.getByRole('button',{name:'ワークショップを開く'}).click();
 for(const name of ['TORQUE BISON','CORNER LYNX','BALANCE ORCA','AERO FALCON']){await page.getByRole('button',{name}).click();await page.screenshot({path:info.outputPath(name.replace(' ','-')+'.png')});}
 const cats=['ボディー','シャーシ','モーター','ギヤ','タイヤ','ローラー','電池','ウイング','ブレーキ'];
 for(const name of cats){await page.getByRole('button',{name,exact:true}).click();await page.locator('.part-card').nth(2).click();await expect(page.getByRole('button',{name:'選択部品を装着'})).toBeEnabled();await page.getByRole('button',{name:'選択部品を装着'}).click();await expect(page.locator('.part-card').nth(2)).toHaveAttribute('aria-pressed','true');}
 await page.getByRole('button',{name:'保存 1',exact:true}).click();await page.getByRole('button',{name:'標準構成',exact:true}).click();await page.getByRole('button',{name:'保存枠1を復元'}).click();await expect(page.locator('.part-card').nth(2)).toHaveAttribute('aria-pressed','true');
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'分解表示',exact:true}).click();await page.getByRole('button',{name:'部品拡大',exact:true}).click();await page.getByRole('button',{name:'組み立て',exact:true}).click();await page.getByRole('button',{name:'視点を戻す'}).click();}
 await page.getByRole('button',{name:'車輪テスト'}).click();await page.getByRole('button',{name:'標準構成',exact:true}).click();await page.screenshot({path:info.outputPath('garage.png')});
 for(const course of ['WORKSHOP OVAL','TECHNICAL RIDGE','SKY LOOP']){
  await page.getByRole('button',{name:'コースを選ぶ'}).click();await page.getByRole('button',{name:new RegExp(course)}).click();await page.getByRole('button',{name:'この構成で走る'}).click();
  await page.getByRole('button',{name:'一時停止',exact:true}).waitFor();await page.waitForTimeout(4000);
  for(const camera of ['2 車載','3 コース脇','4 全景','5 自動演出','1 追尾']){await page.getByRole('button',{name:camera,exact:true}).click();await page.screenshot({path:info.outputPath(course+'-'+camera.slice(0,1)+'.png')});}
  await expect(page.getByRole('heading',{name:'走りが、答えになった。'})).toBeVisible({timeout:90000});await expect(page.locator('tbody tr').first()).toContainText('完走');await page.screenshot({path:info.outputPath(course+'-result.png')});
  await page.getByRole('button',{name:'同じ構成・seedで再挑戦'}).click();await expect(page.getByText('READY TO RACE')).toBeVisible();await page.waitForTimeout(3800);await page.getByRole('button',{name:'一時停止',exact:true}).click();await expect(page.getByRole('heading',{name:'PAUSED'})).toBeVisible();await page.getByRole('button',{name:'ガレージへ',exact:true}).click();
 }
 expect(errors).toEqual([]);
});
test('time attack and portrait layout',async({page},info)=>{await page.setViewportSize({width:390,height:844});await page.goto('./');await page.getByRole('button',{name:'ワークショップを開く'}).click();await page.getByRole('button',{name:'コースを選ぶ'}).click();await page.getByLabel('モード',{exact:true}).selectOption('time');await page.getByRole('button',{name:'この構成で走る'}).click();await expect(page.getByRole('heading',{name:'走りが、答えになった。'})).toBeVisible({timeout:90000});await expect(page.locator('tbody tr')).toHaveCount(1);await page.screenshot({path:info.outputPath('portrait-result.png')});});
