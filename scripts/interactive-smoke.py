"""Interactive browser smoke with mocked API and mocked storage; no Neon required."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
NOW='2026-11-17T03:00:00.000Z'
async def main():
  async with async_playwright() as playwright:
    browser=await playwright.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1280,'height':880})
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    await page.goto('about:blank')
    await page.set_content('<html><body><div id="root"></div><div id="toast"></div><div id="modal" class="modal-container" hidden></div></body></html>')
    for sheet in ['style.css','refinement.css','khu-a.css']:
      await page.add_style_tag(content=(ROOT/'public'/sheet).read_text())
    await page.evaluate('''()=>{
      const store=new Map();
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
      window.__reports=[];
      const resident={id:2,name:'Nguyen Van An',email:'an@example.test',role:'student'};
      const room={id:1,code:'AG101',building:'AG',floor:1,capacity:4,occupied:1,available:3,active:true};
      const datasets={
        '/api/me':{user:resident},'/api/rooms':{rooms:[room]},
        '/api/allocations':{allocations:[{id:8,student_id:2,room_id:1,room_code:'AG101',building:'AG',floor:1,assigned_at:'2026-11-17T03:00:00Z'}]},
        '/api/applications':{applications:[]},'/api/requests':{requests:[]},
        '/api/notifications':{notifications:[]},'/api/announcements':{announcements:[]},
        '/api/housing-changes':{changes:[]}
      };
      window.fetch=async (url,options={})=>{
        if(url==='/api/room-inspections'){
          if(options.method==='POST'){
            const data=JSON.parse(options.body);window.__reports.unshift({id:17,student_name:resident.name,
              student_id:2,room_id:1,room_code:'AG101',building:'AG',created_at:'2026-11-17T03:00:00Z',...data});
            return new Response(JSON.stringify({id:17}),{status:201,headers:{'content-type':'application/json'}});
          }
          return new Response(JSON.stringify({inspections:window.__reports}),{status:200,headers:{'content-type':'application/json'}});
        }
        return new Response(JSON.stringify(datasets[url]||{message:'OK'}),{status:200,headers:{'content-type':'application/json'}});
      };
    }''')
    await page.add_script_tag(content=(ROOT/'public/app.js').read_text())
    await page.locator('.stats').wait_for()
    await page.locator('.sidebar button[data-action="nav"][data-id="checklist"]').click()
    assert '0/7' in await page.locator('.arrival-score').inner_text()
    await page.locator('input[data-check-key="account"]').check()
    assert '1/7' in await page.locator('.arrival-score').inner_text()
    await page.locator('button[data-action="nav"][data-id="rooms"]').click()
    await page.locator('.sidebar button[data-action="nav"][data-id="checklist"]').click()
    assert await page.locator('input[data-check-key="account"]').is_checked()
    await page.locator('button[data-action="nav"][data-id="inspections"]').first.click()
    await page.locator('select[name="fan_state"]').select_option('issue')
    await page.locator('#note').fill('Quạt chạy yếu, cần kiểm tra.')
    await page.locator('#inspection-form button[type="submit"]').click()
    await page.locator('button[data-action="inspection-detail"]').wait_for()
    reports=await page.evaluate('window.__reports')
    assert reports[0]['room_code']=='AG101' and reports[0]['fan_state']=='issue'
    await page.locator('button[data-action="inspection-detail"]').click()
    assert 'Quạt chạy yếu' in await page.locator('.inspection-note').inner_text()
    await page.locator('button.dialog-close').click()
    await page.locator('button[data-action="nav"][data-id="rooms"]').click()
    await page.locator('button[data-action="focus-building"]').click()
    assert await page.locator('.table-search').input_value()=='AG'
    assert not errors,errors
    print('PASS: checklist toggles across navigation; inspection submission/list/detail; auto-capacity building filter. JS errors:',errors)
    await browser.close()

if __name__=='__main__':asyncio.run(main())
