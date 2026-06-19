const { spawn } = require('child_process')
const path = require('path')

const scriptDir = __dirname
const projectDir = path.resolve(scriptDir, '..')
const env = {
  ...process.env,
  TARO_API_BASE_URL: process.env.TARO_API_BASE_URL || 'https://api.pawpalai.cn/v1',
}

const ensure = spawn(process.execPath, [path.join(scriptDir, 'ensure-weapp-pages.cjs'), '--watch'], {
  cwd: projectDir,
  stdio: 'inherit',
  env,
})

const taroBin = path.join(projectDir, 'node_modules', '.bin', process.platform === 'win32' ? 'taro.cmd' : 'taro')
const taro = spawn(taroBin, ['build', '--type', 'weapp', '--watch'], {
  cwd: projectDir,
  stdio: 'inherit',
  env,
})

function stop(code = 0) {
  if (!ensure.killed) ensure.kill()
  if (!taro.killed) taro.kill()
  process.exit(code)
}

taro.on('exit', (code) => stop(code || 0))
taro.on('error', (error) => {
  console.error(error)
  stop(1)
})

process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
