import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createColumnHelper } from '@tanstack/react-table'
import { DataTable } from '@/components/common/DataTable'

type Row = { id: string; name: string }

const col = createColumnHelper<Row>()

describe('DataTable', () => {
  const columns = [
    col.accessor('name', { header: () => 'Name', cell: (i) => i.getValue() }),
  ]

  const data: Row[] = [
    { id: '1', name: 'A' },
    { id: '2', name: 'B' },
  ]

  it('renders column headers', () => {
    render(<DataTable data={data} columns={columns} />)
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('renders correct number of data rows', () => {
    render(<DataTable data={data} columns={columns} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })

  it('renders shimmer rows when isLoading=true', () => {
    const { container } = render(
      <DataTable data={[]} columns={columns} isLoading skeletonRows={3} />,
    )
    expect(container.querySelectorAll('.shimmer').length).toBeGreaterThan(0)
  })

  it('selected row has brand left border', () => {
    const { container } = render(
      <DataTable
        data={data}
        columns={columns}
        selectedRowId="2"
        getRowId={(r) => r.id}
      />,
    )
    const selected = container.querySelector('.border-l-brand')
    expect(selected).toBeTruthy()
  })

  it('pagination: Prev disabled on page 1', () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          totalPages: 3,
          total: 30,
          onPageChange: vi.fn(),
        }}
      />,
    )
    expect(screen.getByLabelText('Previous page')).toBeDisabled()
  })

  it('pagination: Next disabled on last page', () => {
    render(
      <DataTable
        data={data}
        columns={columns}
        pagination={{
          page: 3,
          pageSize: 10,
          totalPages: 3,
          total: 30,
          onPageChange: vi.fn(),
        }}
      />,
    )
    expect(screen.getByLabelText('Next page')).toBeDisabled()
  })

  it('clicking Next calls onPageChange with page+1', () => {
    const onPageChange = vi.fn()
    render(
      <DataTable
        data={data}
        columns={columns}
        pagination={{
          page: 1,
          pageSize: 10,
          totalPages: 3,
          total: 30,
          onPageChange,
        }}
      />,
    )
    fireEvent.click(screen.getByLabelText('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
