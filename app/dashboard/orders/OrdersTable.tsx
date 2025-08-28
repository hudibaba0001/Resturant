'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

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

async function patchOrderStatus(orderId: string, status: OrderStatus) {
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || 'Failed to update status');
  }
  return (await res.json()).order as Order;
}

export default function OrdersTable({ orders, restaurantId }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

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

  const onAction = async (orderId: string, to: OrderStatus) => {
    // Optimistic update
    setBusy((b) => ({ ...b, [orderId]: true }));
    const prev = localOrders;
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx === -1) return;

    const optimistic = [...localOrders];
    optimistic[idx] = { ...optimistic[idx], status: to } as Order;
    setLocalOrders(optimistic);

    try {
      const updated = await patchOrderStatus(orderId, to);
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
      alert((e as Error).message);
    } finally {
      setBusy((b) => ({ ...b, [orderId]: false }));
    }
  };

  const formatPrice = (cents: number) => {
    return `SEK ${(cents / 100).toFixed(2)}`;
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
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
                  {formatPrice(order.total_cents)}
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
              </tr>
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
