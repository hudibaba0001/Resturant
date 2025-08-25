'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  customer_name?: string;
  phone_e164?: string;
  pin?: string;
  items: any[];
  picked_up_at?: string;
}

interface OrdersTableProps {
  orders: Order[];
  restaurantId: string;
}

export default function OrdersTable({ orders, restaurantId }: OrdersTableProps) {
  const [handoffLoading, setHandoffLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const supabase = createClientComponentClient();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone_e164?.includes(searchTerm) ||
      order.pin?.includes(searchTerm) ||
      order.id.slice(0, 8).includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleHandoff = async (orderId: string, pin: string) => {
    setHandoffLoading(orderId);
    
    try {
      const response = await fetch('/api/orders/handoff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          pin
        }),
      });

      if (response.ok) {
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Handoff failed: ${error.error}`);
      }
    } catch (error) {
      console.error('Handoff error:', error);
      alert('Failed to process handoff');
    } finally {
      setHandoffLoading(null);
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    return `${phone.slice(0, 3)}***${phone.slice(-4)}`;
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-yellow-100 text-yellow-800', label: 'Paid' },
      ready: { color: 'bg-blue-100 text-blue-800', label: 'Ready' },
      picked_up: { color: 'bg-green-100 text-green-800', label: 'Picked Up' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                   { color: 'bg-gray-100 text-gray-800', label: status };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, phone, PIN, or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter orders by status"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="ready">Ready</option>
              <option value="picked_up">Picked Up</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pickup Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">#{order.id.slice(0, 8)}</div>
                    <div className="text-gray-500">{formatDate(order.created_at)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{order.customer_name || 'Anonymous'}</div>
                    <div className="text-gray-500">{formatPhone(order.phone_e164)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="max-w-xs truncate">
                    {order.items?.length || 0} items
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatPrice(order.total_cents)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.pin ? (
                    <span className="font-mono font-bold text-lg">{order.pin}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {order.status === 'paid' && order.pin && (
                    <button
                      onClick={() => handleHandoff(order.id, order.pin!)}
                      disabled={handoffLoading === order.id}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                      {handoffLoading === order.id ? 'Processing...' : 'Mark Picked Up'}
                    </button>
                  )}
                  {order.status === 'picked_up' && (
                    <span className="text-green-600 text-sm">
                      Picked up {order.picked_up_at ? formatDate(order.picked_up_at) : ''}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No orders found</p>
        </div>
      )}
    </div>
  );
}
