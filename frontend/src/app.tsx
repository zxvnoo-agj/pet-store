import { useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'
import { initMockLogin } from './services/auth'
import './index.css'

function App({ children }) {
  useLaunch(() => {
    console.log('App launched.')
    initMockLogin()
  })

  useEffect(() => {
    // App level side effects
  }, [])

  return children
}

export default App
