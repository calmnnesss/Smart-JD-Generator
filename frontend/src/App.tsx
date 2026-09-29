import { MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import Landing from './pages/Landing'

// 生成器页面体积较大（markdown 渲染等），按需加载
const Studio = lazy(() => import('./pages/Studio'))

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<div className="h-dvh bg-canvas" />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </MotionConfig>
  )
}
