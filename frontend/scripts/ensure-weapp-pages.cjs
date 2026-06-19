const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const appJsonPath = path.join(distDir, 'app.json')
const watchMode = process.argv.includes('--watch')

function relativeImport(fromDir, targetFile) {
  const rel = path.relative(fromDir, targetFile).replace(/\\/g, '/')
  return rel.startsWith('.') ? rel : `./${rel}`
}

function ensurePages() {
  if (!fs.existsSync(appJsonPath)) {
    return
  }

  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'))
  const pages = Array.isArray(appJson.pages) ? appJson.pages : []
  let created = 0

  for (const page of pages) {
    const pageBase = path.join(distDir, page)
    const pageDir = path.dirname(pageBase)
    fs.mkdirSync(pageDir, { recursive: true })

    const wxmlPath = `${pageBase}.wxml`
    if (!fs.existsSync(wxmlPath)) {
      const baseImport = relativeImport(pageDir, path.join(distDir, 'base.wxml'))
      fs.writeFileSync(wxmlPath, `<import src="${baseImport}"/>\n<template is="taro_tmpl" data="{{root:root}}" />`)
      created += 1
    }

    const jsonPath = `${pageBase}.json`
    if (!fs.existsSync(jsonPath)) {
      const compPath = relativeImport(pageDir, path.join(distDir, 'comp'))
      fs.writeFileSync(jsonPath, JSON.stringify({ usingComponents: { comp: compPath } }))
      created += 1
    }
  }

  if (created > 0) {
    console.log(`Ensured ${created} missing weapp page shell file(s)`)
  }
}

ensurePages()

if (watchMode) {
  setInterval(ensurePages, 1000)
}
