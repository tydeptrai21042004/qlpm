"""Render smoke check with synthetic data; no real Neon database or user accounts."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
NOW='2026-11-14T07:31:00.000Z'
rooms=[dict(id=1,code='A101',building='A',floor=1,capacity=2,occupied=1,active=True,available=1),
       dict(id=2,code='A102',building='A',floor=1,capacity=3,occupied=3,active=True,available=0),
       dict(id=3,code='B201',building='B',floor=2,capacity=4,occupied=2,active=True,available=2)]
apps=[dict(id=1,student_id=2,student_name='Nguyen Van An',student_email='an@university.edu.vn',preferred_room_id=3,preferred_room_code='B201',note='Prefer quiet floor',status='pending',review_note='',created_at=NOW,updated_at=NOW,assigned_room=None,withdrawn=False)]
requests=[dict(id=1,student_id=2,student_name='Nguyen Van An',category='maintenance',title='Air conditioner not cooling',description='The unit in B201 runs but does not cool.',status='open',priority='high',assigned_to=None,assignee_name=None,resolution_note='',created_at=NOW,updated_at=NOW,resolved_at=None)]
changes=[dict(id=1,student_id=2,student_name='Nguyen Van An',student_email='an@university.edu.vn',kind='transfer',reason='I need quieter accommodation for study.',status='pending',review_note='',target_room_id=3,target_room_code='B201',current_room_code='A101',created_at=NOW,updated_at=NOW,reviewer_name=None)]
notices=[dict(id=1,title='Quiet hours during examination week',body='Quiet hours will run from 22:00 to 07:00. Please be considerate of your neighbours.',audience='all',building=None,pinned=True,status='published',expires_at=None,created_at=NOW,updated_at=NOW,author_name='Residence Office')]

async def main():
    async with async_playwright() as p:
        browser=await p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
        for role in ('staff','student'):
            page=await browser.new_page(viewport={'width':1440,'height':930},device_scale_factor=1)
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            page.on('console',lambda msg:errors.append('CONSOLE: '+msg.text) if msg.type=='error' else None)
            user=dict(id=1,role='staff',name='Residence Office',email='office@university.edu.vn') if role=='staff' else dict(id=2,role='student',name='Nguyen Van An',email='an@university.edu.vn')
            payload={'/api/me':{'user':user},'/api/rooms':{'rooms':rooms},'/api/applications':{'applications':apps},
               '/api/allocations':{'allocations':[dict(id=7,student_id=2,room_id=1,room_code='A101',building='A',floor=1,assigned_at=NOW)]},
               '/api/requests':{'requests':requests},'/api/notifications':{'notifications':[]},
               '/api/announcements':{'announcements':notices},'/api/housing-changes':{'changes':changes},
               '/api/students':{'students':[dict(id=2,name='Nguyen Van An',email='an@university.edu.vn',created_at=NOW,room_code='A101',allocation_id=7)]},
               '/api/staff':{'staff':[dict(id=1,name='Residence Office')]},
               '/api/audit':{'events':[]},'/api/allocations/history':{'history':[]},
               '/api/rooms/1/residents':{'room':rooms[0],'residents':[dict(allocation_id=7,student_id=2,name='Nguyen Van An',email='an@university.edu.vn',assigned_at=NOW)]},
               '/api/requests/1/messages':{'messages':[]}}
            await page.goto('about:blank')
            await page.set_content('<!doctype html><html lang="en"><body><div id="root"></div><div id="toast"></div><div id="modal" class="modal-container" hidden></div></body></html>')
            await page.add_style_tag(content=(ROOT/'public'/'style.css').read_text())
            await page.add_style_tag(content=(ROOT/'public'/'refinement.css').read_text())
            await page.evaluate('''payload=>{window.fetch=async url=>new Response(JSON.stringify(payload[url]||{message:'OK'}),{status:200,headers:{'content-type':'application/json'}})}''',payload)
            await page.add_script_tag(content=(ROOT/'public'/'app.js').read_text())
            await page.locator('.stats').wait_for(timeout=10000)
            await page.screenshot(path=str(ROOT/f'preview_{role}.png'),full_page=True)
            views=['overview','applications','changes','rooms','requests','announcements','inbox','settings']
            if role=='staff':views+=['students','reports','activity']
            for view in views:
                result=await page.evaluate('''view=>{state.view=view;renderApp();return document.getElementById('main-content').textContent.trim().length}''',view)
                assert result>20, (role,view,result)
                if view=='announcements' and role=='staff':
                    await page.locator('button[data-action="new-announcement"]').click()
                    assert await page.locator('#announcement-form').count()==1
                    await page.locator('button.dialog-close').click()
                if view=='changes' and role=='staff':
                    await page.locator('button[data-action="change-details"]').first.click()
                    assert await page.locator('#change-decision-form').count()==1
                    await page.locator('button.dialog-close').click()
                if view=='rooms' and role=='staff':
                    await page.locator('button[data-action="room-roster"]').first.click()
                    await page.locator('.resident-list').wait_for(timeout=5000)
                    await page.locator('button.dialog-close').click()
            await page.evaluate("state.view='overview';renderApp()")
            await page.keyboard.press('Control+k')
            await page.locator('#command-input').wait_for(timeout=4000)
            await page.locator('#command-input').fill('rooms')
            assert await page.locator('.command-item').count()>=1
            await page.keyboard.press('Escape')
            if role=='student':
                await page.evaluate("state.changes=[];state.view='changes';renderApp()")
                assert await page.locator('#housing-change-form').count()==1
                await page.locator('#change_kind').select_option('checkout')
                assert not await page.locator('#target_room_id').is_visible()
            await page.evaluate("state.view='overview';renderApp()")
            await page.set_viewport_size({'width':390,'height':844})
            await page.wait_for_timeout(350)
            await page.screenshot(path=str(ROOT/f'preview_{role}_mobile.png'),full_page=True)
            width=await page.evaluate('document.documentElement.scrollWidth')
            assert width<=390,(role,'horizontal overflow',width)
            await page.locator('.mobile-menu').click()
            assert await page.evaluate("document.body.classList.contains('sidebar-open')")
            print(role,'errors:',errors,'views checked:',len(views),'mobile width:',width)
            assert not errors,(role,errors)
            await page.close()
        await browser.close()

if __name__=='__main__':asyncio.run(main())
