'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Order {
  id: string;
  created_at: string;
  status: string;
  type: string;
  total_cents: number;
  restaurant_id: string;
}

interface OrdersTableProps {
  orders: Order[];
  restaurantId: string;
}

export default function OrdersTable({ orders, restaurantId }: OrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.slice(0, 8).includes(searchTerm) ||
      order.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (cents: number) => {
    return `SEK ${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      open: { color: 'bg-blue-100 text-blue-800', label: 'Open' },
      ready: { color: 'bg-purple-100 text-purple-800', label: 'Ready' },
      picked_up: { color: 'bg-gray-100 text-gray-800', label: 'Picked Up' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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
              <option value="open">Open</option>
              <option value="ready">Ready</option>
              <option value="picked_up">Picked Up</option>
              <option value="cancelled">Cancelled</option>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {orders.length === 0 ? (
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
            Showing {filteredOrders.length} of {orders.length} orders
          </p>
        </div>
      )}
    </div>
  );
}
