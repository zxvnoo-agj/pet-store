const fs = require('fs')
const path = require('path')

module.exports = function (ctx) {
  ctx.onBuildFinish(() => {
    const outputRoot = ctx.paths.outputPath
    const wxssDir = path.resolve(outputRoot)

    if (!fs.existsSync(wxssDir)) return

    const files = fs.readdirSync(wxssDir).filter(f => f.endsWith('.wxss'))
    for (const file of files) {
      const filePath = path.join(wxssDir, file)
      const content = fs.readFileSync(filePath, 'utf8')
      const cleaned = content.replace(/\\/g, '')
      fs.writeFileSync(filePath, cleaned)
    }
  })
}
