import { render, screen } from '@testing-library/react'
import { PlanBadge } from '@/components/common/PlanBadge'
import type { UserPlan } from '@/types'

describe('PlanBadge', () => {
  it.each([
    ['free', /gray/i],
    ['pro', /brand/i],
    ['team', /blue/i],
    ['enterprise', /purple/i],
  ])('%s plan has correct color class', (plan, colorPattern) => {
    const { container } = render(<PlanBadge plan={plan as UserPlan} />)
    const badge = container.firstChild as HTMLElement
    expect(badge?.className).toMatch(colorPattern)
  })

  it('text is uppercase', () => {
    render(<PlanBadge plan="pro" />)
    expect(screen.getByText('PRO')).toBeInTheDocument()
  })
})
