import { useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'

function App({ children }) {
  useLaunch(() => {
    console.log('App launched.')
  })

  useEffect(() => {
    // App level side effects
  }, [])

  return children
}

export default App
