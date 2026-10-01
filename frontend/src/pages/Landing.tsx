import { AuroraBackground } from '../components/ui/AuroraBackground'
import { Access } from '../features/landing/Access'
import { Footer } from '../features/landing/Footer'
import { Hero } from '../features/landing/Hero'
import { HowItWorks } from '../features/landing/HowItWorks'
import { Nav } from '../features/landing/Nav'
import { WorkflowDiagram } from '../features/landing/WorkflowDiagram'

/** 落地页：产品介绍、工作原理、工作流设计与两种接入方式 */
export default function Landing() {
  return (
    <div className="min-h-dvh">
      <AuroraBackground />
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <WorkflowDiagram />
        <Access />
      </main>
      <Footer />
    </div>
  )
}
