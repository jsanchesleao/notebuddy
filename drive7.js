const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })

  await page.goto('http://localhost:5173/notebuddy/#/')
  await page.waitForTimeout(800)
  let buttons = await page.$$('button')
  await buttons[buttons.length - 1].click()
  await page.waitForTimeout(300)
  await page.click('text=New Notebook')
  await page.waitForTimeout(300)
  await page.fill('input[placeholder="Notebook title"]', 'Test Notebook')
  await page.click('button:has-text("Add")')
  await page.waitForTimeout(500)
  await page.click('text=Test Notebook')
  await page.waitForTimeout(500)
  buttons = await page.$$('button')
  await buttons[buttons.length - 1].click()
  await page.waitForTimeout(300)
  await page.getByText('New Note', { exact: true }).click()
  await page.waitForTimeout(400)
  await page.fill('input[placeholder="Note title"]', 'My Test Note')
  await page.click('button:has-text("Create note")')
  await page.waitForTimeout(800)

  await page.screenshot({ path: 'shot9-note-page-full.png', fullPage: true })

  // dump all input placeholders/aria-labels for reference
  const inputs = await page.$$eval('input', (els) =>
    els.map((e) => ({ placeholder: e.placeholder, aria: e.getAttribute('aria-label') })),
  )
  console.log('INPUTS:', JSON.stringify(inputs, null, 2))
  const btns = await page.$$eval('button', (els) =>
    els.map((e) => (e.textContent || '').trim() || e.getAttribute('aria-label')),
  )
  console.log('BUTTONS:', JSON.stringify(btns, null, 2))
  console.log('ERRORS:', errors)

  await browser.close()
}

main()
