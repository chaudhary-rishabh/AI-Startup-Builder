import { render, screen, fireEvent } from '@testing-library/react'
import type { ColumnDef } from '@tanstack/react-table'
import { describe, it, expect, vi } from 'vitest'

import { DataTable } from '../../src/components/custom/DataTable'

// ── Minimal test data & columns ───────────────────────────────────────────────
type TestUser = { id: string; name: string; email: string }

const makeUsers = (n: number): TestUser[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i),
    name: ['Charlie', 'Alice', 'Bob', 'David', 'Eva'][i % 5]! + ` ${i}`,
    email: `user${i}@test.com`,
  }))

const columns: ColumnDef<TestUser>[] = [
  { accessorKey: 'name',  header: 'Name'  },
  { accessorKey: 'email', header: 'Email' },
]

describe('DataTable', () => {
  it('renders the correct number of data rows', () => {
    render(<DataTable data={makeUsers(5)} columns={columns} />)
    // 1 header row + 5 data rows = 6 rows
    const rows = screen.getAllByRole('row')
    expect(rows).toHaveLength(6)
  })

  it('renders column headers', () => {
    render(<DataTable data={makeUsers(3)} columns={columns} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders cell values from data', () => {
    const data: TestUser[] = [{ id: '1', name: 'Alice', email: 'alice@test.com' }]
    render(<DataTable data={data} columns={columns} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })

  it('shows EmptyState when data is an empty array', () => {
    render(<DataTable data={[]} columns={columns} />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('shows custom emptyMessage in EmptyState', () => {
    render(<DataTable data={[]} columns={columns} emptyMessage="No users found." />)
    expect(screen.getByText('No users found.')).toBeInTheDocument()
  })

  it('shows skeleton rows (animate-pulse) when isLoading=true', () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} isLoading={true} />,
    )
    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('does NOT show EmptyState while isLoading=true', () => {
    render(<DataTable data={[]} columns={columns} isLoading={true} />)
    expect(screen.queryByText('No results')).not.toBeInTheDocument()
  })

  it('clicking a sortable column header sorts the data ascending (first click)', () => {
    const data: TestUser[] = [
      { id: '1', name: 'Charlie', email: 'c@test.com' },
      { id: '2', name: 'Alice',   email: 'a@test.com' },
      { id: '3', name: 'Bob',     email: 'b@test.com' },
    ]
    render(<DataTable data={data} columns={columns} />)

    // Click the "Name" header button
    const nameHeaderBtn = screen.getByRole('button', { name: /name/i })
    fireEvent.click(nameHeaderBtn)

    const rows = screen.getAllByRole('row')
    // rows[0] = header, rows[1] = first data row after sort
    expect(rows[1]).toHaveTextContent('Alice')
    expect(rows[2]).toHaveTextContent('Bob')
    expect(rows[3]).toHaveTextContent('Charlie')
  })

  it('second click on column header reverses sort to descending', () => {
    const data: TestUser[] = [
      { id: '1', name: 'Charlie', email: 'c@test.com' },
      { id: '2', name: 'Alice',   email: 'a@test.com' },
      { id: '3', name: 'Bob',     email: 'b@test.com' },
    ]
    render(<DataTable data={data} columns={columns} />)

    const nameHeaderBtn = screen.getByRole('button', { name: /name/i })
    fireEvent.click(nameHeaderBtn) // ascending
    fireEvent.click(nameHeaderBtn) // descending

    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Charlie')
    expect(rows[3]).toHaveTextContent('Alice')
  })

  it('renders pagination controls when totalPages > 1', () => {
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 1, pageSize: 5, total: 50 }}
        onPageChange={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('Previous button is disabled on page 1', () => {
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 1, pageSize: 5, total: 50 }}
        onPageChange={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('Next button is disabled on the last page', () => {
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 10, pageSize: 5, total: 50 }}
        onPageChange={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('calls onPageChange with page+1 when Next is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 2, pageSize: 5, total: 50 }}
        onPageChange={onPageChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange with page-1 when Previous is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 3, pageSize: 5, total: 50 }}
        onPageChange={onPageChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /previous/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows page indicator text', () => {
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 2, pageSize: 5, total: 50 }}
        onPageChange={() => {}}
      />,
    )
    expect(screen.getByText('2 / 10')).toBeInTheDocument()
  })

  it('disables pagination buttons while loading', () => {
    render(
      <DataTable
        data={makeUsers(5)}
        columns={columns}
        pagination={{ page: 2, pageSize: 5, total: 50 }}
        onPageChange={() => {}}
        isLoading={true}
      />,
    )
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })
})
