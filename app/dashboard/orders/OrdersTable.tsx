'use client';

import React, { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { trackOrderStatusChange, trackOrderConflict, trackOrderError } from '@/utils/analytics';
import { formatMoney } from '@/lib/format';

type OrderItem = {
  id: string;
  qty: number;
  price_cents: number;
  notes: string | null;
  menu_item: { id: string; name: string; currency: string } | null;
};

async function fetchOrder(orderId: string): Promise<{ items: OrderItem[]; currency: string }> {
  const res = await fetch(`/api/orders/${orderId}`, { cache: 'no-store' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const msg = j?.code === 'UNAUTHENTICATED'
      ? 'Please sign in again.'
      : j?.code || 'Failed to load order';
    // In dev, include debug hint
    throw new Error(process.env.NODE_ENV !== 'production' && j?.debug ? `${msg}: ${j.debug}` : msg);
  }
  const j = await res.json();
  return { items: j.order.items as OrderItem[], currency: j.order.currency as string };
}

type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'expired';

interface Order {
  id: string;
  created_at: string;
  status: OrderStatus;
  type: string;
  total_cents: number;
  restaurant_id: string;
  currency?: string;
  updated_at?: string | undefined;
}

interface OrdersTableProps {
  orders: Order[];
  restaurantId: string;
}

const NEXT_ACTIONS: Record<OrderStatus, Array<{ label: string; to: OrderStatus }>> = {
  pending: [
    { label: 'Mark Paid', to: 'paid' },
    { label: 'Cancel', to: 'cancelled' },
  ],
  paid: [
    { label: 'Start Preparing', to: 'preparing' },
    { label: 'Cancel', to: 'cancelled' },
  ],
  preparing: [
    { label: 'Mark Ready', to: 'ready' },
    { label: 'Cancel', to: 'cancelled' },
  ],
  ready: [{ label: 'Complete', to: 'completed' }],
  completed: [],
  cancelled: [],
  expired: [],
};

// Add a tiny prompt helper for cancellation reasons
async function askReasonIfNeeded(to: OrderStatus): Promise<string | undefined> {
  if (to !== 'cancelled') return undefined;
  // eslint-disable-next-line no-alert
  const r = window.prompt('Cancel reason (optional):') || '';
  return r.trim() || undefined;
}

async function patchOrderStatus(orderId: string, status: OrderStatus, reason?: string) {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Handle structured error codes for better UX
    const errorCode = json?.code || 'UNKNOWN_ERROR';
    let userMessage = json?.error || 'Failed to update status';
    
    switch (errorCode) {
      case 'CONFLICT_STATUS_CHANGED':
        userMessage = `Order status changed to "${json?.current}". Please refresh to see the latest state.`;
        break;
      case 'INVALID_TRANSITION':
        userMessage = `Cannot change status from "${json?.from}" to "${status}". Allowed transitions: ${json?.allowed?.join(', ')}`;
        break;
      case 'FORBIDDEN':
        userMessage = 'You do not have permission to update this order.';
        break;
      case 'INVALID_ORDER_ID':
        userMessage = 'Invalid order ID.';
        break;
      case 'INVALID_STATUS':
        userMessage = 'Invalid status value.';
        break;
      default:
        userMessage = json?.error || 'Failed to update status';
    }
    
    throw new Error(userMessage);
  }
  return json.order as Order;
}

export default function OrdersTable({ orders, restaurantId }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [lines, setLines] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filteredOrders = localOrders.filter(order => {
    const matchesSearch = 
      order.id.slice(0, 8).includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggle = async (o: Order) => {
    const id = o.id;
    if (open[id]) { 
      setOpen(s => ({ ...s, [id]: false })); 
      return; 
    }
    if (!lines[id]) {
      setLoading(s => ({ ...s, [id]: true }));
      try {
        const { items } = await fetchOrder(id);
        setLines(s => ({ ...s, [id]: items }));
      } catch (e) {
        alert('Could not load items for this order.');
      } finally {
        setLoading(s => ({ ...s, [id]: false }));
      }
    }
    setOpen(s => ({ ...s, [id]: true }));
  };

  const onAction = async (orderId: string, to: OrderStatus) => {
    // Optimistic update
    setBusy((b) => ({ ...b, [orderId]: true }));
    const prev = localOrders;
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const optimistic = [...localOrders];
    const prevStatus = optimistic[idx]?.status || 'unknown';
    optimistic[idx] = { ...optimistic[idx], status: to } as Order;
    setLocalOrders(optimistic);

    try {
      // Ask for reason if cancelling
      const reason = await askReasonIfNeeded(to);
      
      const updated = await patchOrderStatus(orderId, to, reason);
      
      // Track successful status change
      trackOrderStatusChange(prevStatus, updated.status, true);
      
      setLocalOrders((cur) =>
        cur.map((o) => (o.id === orderId ? { 
          ...o, 
          status: updated.status, 
          updated_at: updated.updated_at || o.updated_at 
        } : o))
      );
    } catch (e) {
      // Rollback on error
      setLocalOrders(prev);
      
      const error = e as Error;
      const errorMessage = error.message;
      
      // Track error with specific error code
      if (errorMessage.includes('CONFLICT_STATUS_CHANGED')) {
        trackOrderConflict(orderId, prevStatus, to);
      } else if (errorMessage.includes('INVALID_TRANSITION')) {
        trackOrderError('INVALID_TRANSITION', 'order-status');
      } else if (errorMessage.includes('FORBIDDEN')) {
        trackOrderError('FORBIDDEN', 'order-status');
      } else {
        trackOrderError('UNKNOWN_ERROR', 'order-status');
      }
      
      // Track failed status change
      trackOrderStatusChange(prevStatus, to, false, errorMessage);
      
      alert(errorMessage);
    } finally {
      setBusy((b) => ({ ...b, [orderId]: false }));
    }
  };

  const formatPrice = (cents: number, currency = 'SEK') => {
    return formatMoney(cents, currency);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: OrderStatus) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      preparing: { color: 'bg-blue-100 text-blue-800', label: 'Preparing' },
      ready: { color: 'bg-purple-100 text-purple-800', label: 'Ready' },
      completed: { color: 'bg-gray-100 text-gray-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      pickup: { color: 'bg-orange-100 text-orange-800', label: 'Pickup' },
      dine_in: { color: 'bg-indigo-100 text-indigo-800', label: 'Dine-in' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.pickup;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Search and Filter */}
      <div className="px-4 py-5 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700">
              Search Orders
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by order ID, status, or type..."
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <div className="sm:w-48">
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Status Filter
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <React.Fragment key={order.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(order.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(order.total_cents, order.currency)}
                </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {NEXT_ACTIONS[order.status].map((action) => (
                        <button
                          key={action.to}
                          onClick={() => onAction(order.id, action.to)}
                          disabled={busy[order.id]}
                          className="rounded-xl border px-3 py-1 text-sm hover:shadow disabled:opacity-50 bg-white hover:bg-gray-50 transition-colors"
                        >
                          {busy[order.id] ? '…' : action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggle(order)}
                      className="rounded-xl border px-3 py-1 text-sm hover:shadow disabled:opacity-50 bg-white hover:bg-gray-50 transition-colors"
                      disabled={loading[order.id]}
                    >
                      {open[order.id] ? 'Hide items' : (loading[order.id] ? 'Loading…' : 'View items')}
                    </button>
                  </td>
                </tr>
                {open[order.id] && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="border-t pt-3">
                        {(lines[order.id] || []).length === 0 ? (
                          <div className="text-sm text-gray-500">No items found</div>
                        ) : (
                          <>
                            <ul className="space-y-2">
                              {(lines[order.id] || []).map((li) => {
                                const name = li.menu_item?.name ?? 'Item (removed)';
                                const currency = li.menu_item?.currency ?? order.currency ?? 'SEK';
                                const lineTotal = (li.price_cents ?? 0) * (li.qty ?? 0);
                                return (
                                  <li key={li.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{name}</span>
                                      <span className="opacity-70">× {li.qty}</span>
                                      {li.notes && <span className="opacity-60 italic">({li.notes})</span>}
                                    </div>
                                    <div className="tabular-nums">{formatMoney(lineTotal, currency)}</div>
                                  </li>
                                );
                              })}
                            </ul>
                            
                            {/* Integrity check warning */}
                            {(() => {
                              const sum = (lines[order.id] || []).reduce((acc, li) => acc + (li.price_cents ?? 0) * (li.qty ?? 0), 0);
                              return open[order.id] && order.total_cents != null && sum !== order.total_cents ? (
                                <div className="mt-2 text-[11px] text-amber-700">
                                  Note: totals differ (historical price changes or manual adjustments).
                                </div>
                              ) : null;
                            })()}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {localOrders.length === 0 ? (
              <div>
                <p className="text-lg font-medium">No orders yet</p>
                <p className="text-sm">Orders will appear here once customers place them.</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-medium">No orders match your search</p>
                <p className="text-sm">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {filteredOrders.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing {filteredOrders.length} of {localOrders.length} orders
          </p>
        </div>
      )}
    </div>
  );
}
