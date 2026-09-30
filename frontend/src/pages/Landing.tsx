import { AuroraBackground } from '../components/ui/AuroraBackground'
import { Access } from '../features/landing/Access'
import { Engineering } from '../features/landing/Engineering'
import { Footer } from '../features/landing/Footer'
import { Hero } from '../features/landing/Hero'
import { HowItWorks } from '../features/landing/HowItWorks'
import { Nav } from '../features/landing/Nav'
import { WorkflowDiagram } from '../features/landing/WorkflowDiagram'

/** 落地页：产品介绍、工作流设计、工程实现与两种接入方式 */
export default function Landing() {
  return (
    <div className="min-h-dvh">
      <AuroraBackground />
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <WorkflowDiagram />
        <Engineering />
        <Access />
      </main>
      <Footer />
    </div>
  )
}
