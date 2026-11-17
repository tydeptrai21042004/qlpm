"""Visual and interaction smoke for CO3011 Evidence Center; synthetic fixture only, no real Neon."""
import asyncio
import runpy
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
fixtures=runpy.run_path(str(ROOT/'scripts'/'visual-smoke.py'))
NOW=fixtures['NOW']

def sample():
    return [
      dict(id=1,kind='weekly_log',title='Weekly execution review – W3',author_name='Project Team',created_at=NOW,supersedes_id=None,data=dict(week_start='2026-11-16',member='Dev A',planned_work='Implement allocation',actual_work='Completed test implementation',planned_hours=12,actual_hours=10,action='Resolve next milestone')),
      dict(id=2,kind='activity',title='Implement allocation API',author_name='Project Team',created_at=NOW,supersedes_id=None,data=dict(activity_id='A02',product_id='P03',owner='Dev B',planned_hours=16,actual_hours=14,planned_start='2026-11-11',planned_finish='2026-11-18',actual_start='2026-11-12',actual_finish='2026-11-19',status='done')),
      dict(id=3,kind='risk',title='Risk R01 – Neon outage',author_name='Project Manager',created_at=NOW,supersedes_id=None,data=dict(risk_id='R01',description='Database availability',probability=2,impact=4,owner='PM',mitigation='Use recovery branch',contingency='Read-only demo',status='open'))
    ]

async def run():
  async with async_playwright() as p:
    browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=await browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.on('console',lambda msg:errors.append('CONSOLE:'+msg.text) if msg.type=='error' else None)
    user=dict(id=1,role='staff',name='Ban quản lý Khu A',email='staff@example.test')
    payload={'/api/me':{'user':user},'/api/rooms':{'rooms':fixtures['rooms']},'/api/applications':{'applications':fixtures['apps']},
      '/api/allocations':{'allocations':[]},'/api/requests':{'requests':fixtures['requests']},'/api/notifications':{'notifications':[]},
      '/api/announcements':{'announcements':fixtures['notices']},'/api/housing-changes':{'changes':fixtures['changes']},
      '/api/room-inspections':{'inspections':[]},'/api/students':{'students':[]},'/api/staff':{'staff':[]}}
    await page.goto('about:blank')
    await page.set_content('<!doctype html><html lang="vi"><body><div id="root"></div><div id="toast"></div><div id="modal" class="modal-container" hidden></div></body></html>')
    for css in ['style.css','refinement.css','khu-a.css','evidence.css']:
      await page.add_style_tag(content=(ROOT/'public'/css).read_text())
    # Synthetic fixture is confined to the browser test. Production never seeds these records.
    await page.evaluate('''({payload,initial,now})=>{
      window.__records=initial;
      window.__files=[];
      window.fetch=async (url,opt={})=>{
        const method=opt.method||'GET';
        if(url==='/api/evidence/assessment')return new Response(JSON.stringify(window.__assessment),{status:200,headers:{'content-type':'application/json'}});
        if(url==='/api/evidence/meta')return new Response(JSON.stringify({types:window.__types,maxFileBytes:870400,canSeedDemo:true}),{status:200,headers:{'content-type':'application/json'}});
        if(url==='/api/evidence'&&method==='GET'){
          const counts=Object.fromEntries(Object.keys(window.__types).map(k=>[k,window.__records.filter(x=>x.kind===k&&!x.is_demo).length]));
          const demoCounts=Object.fromEntries(Object.keys(window.__types).map(k=>[k,window.__records.filter(x=>x.kind===k&&x.is_demo).length]));
          return new Response(JSON.stringify({records:[...window.__records].reverse(),counts,demoCounts,files:window.__files,total:window.__records.length,realTotal:window.__records.filter(x=>!x.is_demo).length,demoTotal:window.__records.filter(x=>x.is_demo).length}),{status:200,headers:{'content-type':'application/json'}});
        }
        if(url==='/api/evidence'&&method==='POST'){
          const body=JSON.parse(opt.body);const next={...body,id:window.__records.length+1,author_name:'Staff',created_at:now};window.__records.push(next);
          return new Response(JSON.stringify({id:next.id,created_at:now}),{status:201,headers:{'content-type':'application/json'}});
        }
        if(url==='/api/evidence/demo-seed'&&method==='POST'){
          if(!window.__records.some(x=>x.is_demo))window.__records.push({id:90,kind:'product',title:'[DEMO] Mẫu PBS',is_demo:true,author_name:'Demo only',created_at:now,data:{product_id:'P01',description:'MẪU KHÔNG THẬT',quality:'Cần review'}});
          return new Response(JSON.stringify({inserted:1,seeded_total:1}),{status:200,headers:{'content-type':'application/json'}});
        }
        if(url.includes('/file')&&method==='POST'){
          window.__files.push({id:1,evidence_id:Number(url.split('/')[3]),original_name:'Evidence.pdf',byte_length:opt.body.size,sha256:'f'.repeat(64),created_at:now});
          return new Response(JSON.stringify({id:1}),{status:201,headers:{'content-type':'application/json'}});
        }
        if(url==='/api/evidence/export/manifest')return new Response(JSON.stringify({total:window.__records.length,realTotal:window.__records.filter(x=>!x.is_demo).length,demoTotal:window.__records.filter(x=>x.is_demo).length,files:window.__files.length,parts:[{url:'/api/evidence/export/records/0',name:'records.zip',label:'Project records 1/1',scope:'real'}],missing:[]}),{status:200,headers:{'content-type':'application/json'}});
        return new Response(JSON.stringify(payload[url]||{}),{status:200,headers:{'content-type':'application/json'}});
      };
    }''',dict(payload=payload,initial=sample(),now=NOW))
    # Read spec and assessment from pure backend functions, not hand-maintained frontend mock.
    from subprocess import check_output
    import json
    initial=json.dumps(sample(),ensure_ascii=False)
    code="import {EVIDENCE_TYPES} from './backend/lib/evidence-spec.js';import {assessEvidence} from './backend/lib/evidence-assessment.js';console.log(JSON.stringify({types:EVIDENCE_TYPES,assessment:assessEvidence("+initial+")}));"
    metadata=json.loads(check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    await page.evaluate('(data)=>{window.__types=data.types;window.__assessment=data.assessment}',metadata)
    await page.add_script_tag(content=(ROOT/'public'/'evidence.js').read_text())
    await page.add_script_tag(content=(ROOT/'public'/'app.js').read_text())
    await page.locator('.stat').first.wait_for(timeout=10000)
    await page.locator('button[data-id="evidence"][data-action="nav"]').click()
    await page.locator('.ev-header').wait_for(timeout=6000)
    assert await page.locator('.ev-record').count()==3
    assert await page.locator('.ev-cover-item').count()==15
    assert await page.locator('.ev-check').count()>=20
    assert '15' in await page.locator('.ev-header-count').inner_text()
    await page.screenshot(path=str(ROOT/'preview_v10_evidence_desktop.png'),full_page=True)
    # Category filter
    await page.locator('#ev_filter').select_option('risk')
    assert await page.locator('.ev-record').count()==1
    await page.locator('#ev_filter').select_option('all')
    # Add an actual (synthetic within test) consultation through the form.
    await page.locator('button[data-action="ev-add"]').first.click()
    await page.locator('#ev_title').fill('Client consultation from test fixture')
    await page.locator('#e_consulted_on').fill('2026-11-16')
    await page.locator('#e_client').fill('Mock client')
    await page.locator('#e_question').fill('Do we need email notifications?')
    await page.locator('#e_response').fill('Not in test scope')
    await page.locator('#e_impact').fill('Defer external mail integration')
    await page.locator('#evidence-form button[type="submit"]').click()
    await page.locator('.ev-record').first.wait_for(timeout=5000)
    await page.wait_for_timeout(600)
    assert await page.locator('.ev-record').count()==4
    await page.locator('.ev-record').first.click()
    assert await page.locator('.ev-details').count()==1
    await page.locator('button.dialog-close').click()
    # Test export links (not downloaded through mocked server).
    await page.locator('button[data-action="ev-export"]').first.click()
    await page.locator('a.ev-download-link').first.wait_for(timeout=5000)
    assert await page.locator('a.ev-download-link').count()==1
    await page.locator('button.dialog-close').click()
    # Explicitly seed a synthetic example: it must be distinguishable from genuine data.
    await page.evaluate('window.confirm=()=>true')
    await page.locator('button[data-action="ev-demo-seed"]').click()
    await page.locator('.ev-record-demo').wait_for(timeout=5000)
    assert await page.locator('.ev-demo-alert').count()>=1
    await page.locator('.ev-record-demo').first.click()
    assert 'KHÔNG PHẢI BẰNG CHỨNG THẬT' in await page.locator('.ev-demo-alert').last.inner_text()
    await page.locator('button.dialog-close').click()
    await page.screenshot(path=str(ROOT/'preview_v10_evidence_seeded_desktop.png'),full_page=True)
    await page.set_viewport_size({'width':390,'height':844})
    await page.wait_for_timeout(400)
    await page.screenshot(path=str(ROOT/'preview_v10_evidence_mobile.png'),full_page=True)
    width=await page.evaluate('document.documentElement.scrollWidth')
    assert width<=390,('mobile horizontal overflow',width)
    assert not errors,errors
    print('evidence UI: success; 15 categories, add/view/filter/export, mobile width:',width,'browser errors:',len(errors))
    await browser.close()

if __name__=='__main__':asyncio.run(run())
