import fs from 'node:fs'
const file = 'dist/assets/' + fs.readdirSync('dist/assets').find(f => f.endsWith('.css'))
const css = fs.readFileSync(file, 'utf8')
let i = css.indexOf('scroll-padding-bottom:calc(200px')
console.log('=== fin de la regla mobile dish-dialog:')
console.log(css.slice(i, i + 450))
console.log('\n=== busquedas:')
for (const n of ['translate', ':none', '0 0']) console.log(n, '@', css.indexOf(n))
