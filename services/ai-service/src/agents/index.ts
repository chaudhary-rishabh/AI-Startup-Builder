import { registerAgent } from './registry.js'
import { IdeaAnalyzerAgent } from './phase1/ideaValidator.agent.js'
import { MarketResearchAgent } from './phase1/marketValidator.agent.js'
import { PrdGeneratorAgent } from './phase2/prdGenerator.agent.js'
import { UserFlowAgent } from './phase2/userFlowAgent.agent.js'
import { SystemDesignAgent } from './phase2/systemDesignAgent.agent.js'
import { UiuxAgent } from './phase2/uiuxAgent.agent.js'
import { GenerateFrameAgent } from './phase3/generateFrame.agent.js'
import { TestingAgent } from './phase5/testingAgent.agent.js'
import { CicdAgent } from './phase5/cicdAgent.agent.js'
import { AnalyticsAgent } from './phase6/analyticsAgent.agent.js'
import { FeedbackAnalyzerAgent } from './phase6/feedbackAnalyzer.agent.js'
import { GrowthStrategyAgent } from './phase6/growthStrategy.agent.js'
import { ApiGeneratorAgent } from './phase4/apiGenerator.agent.js'
import { BackendAgent } from './phase4/backendAgent.agent.js'
import { FrontendAgent } from './phase4/frontendAgent.agent.js'
import { IntegrationAgent } from './phase4/integrationAgent.agent.js'
import { SchemaGeneratorAgent } from './phase4/schemaGenerator.agent.js'
import { SkeletonAgent } from './phase4/skeletonAgent.agent.js'

let registered = false

export function registerAllAgents(): void {
  if (registered) return
  registered = true
  registerAgent('idea_analyzer', () => new IdeaAnalyzerAgent())
  registerAgent('market_research', () => new MarketResearchAgent())
  registerAgent('prd_generator', () => new PrdGeneratorAgent())
  registerAgent('user_flow', () => new UserFlowAgent())
  registerAgent('system_design', () => new SystemDesignAgent())
  registerAgent('uiux', () => new UiuxAgent())
  registerAgent('generate_frame', () => new GenerateFrameAgent())
  registerAgent('skeleton', () => new SkeletonAgent())
  registerAgent('schema_generator', () => new SchemaGeneratorAgent())
  registerAgent('api_generator', () => new ApiGeneratorAgent())
  registerAgent('backend', () => new BackendAgent())
  registerAgent('integration', () => new IntegrationAgent())
  registerAgent('frontend', () => new FrontendAgent())
  registerAgent('testing', () => new TestingAgent())
  registerAgent('cicd', () => new CicdAgent())
  registerAgent('analytics', () => new AnalyticsAgent())
  registerAgent('feedback_analyzer', () => new FeedbackAnalyzerAgent())
  registerAgent('growth_strategy', () => new GrowthStrategyAgent())
}
